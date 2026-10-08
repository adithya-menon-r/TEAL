"""
gateway/tests/test_gateway.py
-----------------------------
Unit tests for TEAL lab gateway.
"""

from datetime import datetime, timezone, timedelta
import gzip
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest

from aiohttp.test_utils import AioHTTPTestCase, TestServer
from aiohttp import web

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from teal_gateway.server import GatewayApp


class TestGateway(AioHTTPTestCase):
    async def get_application(self):
        self.test_token = "secret-token-12345"
        self.token_hash = hashlib.sha256(self.test_token.encode("utf-8")).hexdigest()
        os.environ["TEAL_TOKEN_SHA256"] = self.token_hash
        os.environ["TEAL_SESSION_ID"] = "test-session-01"
        os.environ["TEAL_EXPIRES_AT"] = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        os.environ["TEAL_LAB_INFO"] = json.dumps({
            "name": "Linux Lab",
            "description": "Test environment",
            "interface": "terminal",
            "tools": ["bash", "git"],
            "cpu": "1",
            "memory": "1Gi",
        })
        os.environ["TEAL_DASHBOARD_URL"] = "https://teal.example.com"

        # Create temporary home dir for file operations
        self.temp_dir = tempfile.TemporaryDirectory()
        self.home_path = Path(self.temp_dir.name)
        (self.home_path / "work").mkdir()
        (self.home_path / "work" / "hello.txt").write_text("Hello TEAL!", encoding="utf-8")

        async def compressed_response(request):
            return web.Response(
                body=gzip.compress(b"compressed terminal response"),
                headers={
                    "Content-Encoding": "gzip",
                    "Content-Type": "text/plain",
                },
            )

        upstream_app = web.Application()
        upstream_app.router.add_get("/terminal/compressed", compressed_response)
        self.upstream = TestServer(upstream_app)
        await self.upstream.start_server()

        self.gateway = GatewayApp(
            upstream_url=str(self.upstream.make_url("")).rstrip("/"),
            prefix="/terminal",
            home_dir=self.home_path,
        )
        return self.gateway.app

    def tearDown(self):
        super().tearDown()
        self.temp_dir.cleanup()

    async def asyncTearDown(self):
        await self.upstream.close()
        await super().asyncTearDown()

    async def test_healthz_unauthenticated(self):
        """/__teal/healthz should return 200 without auth."""
        resp = await self.client.request("GET", "/__teal/healthz")
        self.assertEqual(resp.status, 200)
        text = await resp.text()
        self.assertEqual(text, "ok")

    async def test_root_unauthenticated_bootstrap(self):
        """GET / without cookie serves bootstrap HTML."""
        resp = await self.client.request("GET", "/")
        self.assertEqual(resp.status, 200)
        text = await resp.text()
        self.assertIn("Connecting to Lab", text)
        self.assertIn("/__teal/auth", text)

    async def test_auth_failure_invalid_token(self):
        """POST /__teal/auth with wrong token returns 401."""
        resp = await self.client.request(
            "POST",
            "/__teal/auth",
            json={"token": "wrong-token"},
        )
        self.assertEqual(resp.status, 401)

    async def test_auth_success(self):
        """POST /__teal/auth with valid token sets cookie."""
        resp = await self.client.request(
            "POST",
            "/__teal/auth",
            json={"token": self.test_token},
        )
        self.assertEqual(resp.status, 200)
        cookie = resp.cookies.get("teal_lab")
        self.assertIsNotNone(cookie)
        self.assertEqual(cookie.value, self.test_token)

    async def test_info_authenticated(self):
        """GET /__teal/info returns session metadata when authenticated."""
        cookies = {"teal_lab": self.test_token}
        resp = await self.client.request("GET", "/__teal/info", cookies=cookies)
        self.assertEqual(resp.status, 200)
        data = await resp.json()
        self.assertEqual(data["sessionId"], "test-session-01")
        self.assertEqual(data["lab"]["name"], "Linux Lab")

    async def test_files_listing_and_download(self):
        """GET /__teal/files lists directory and downloads files."""
        cookies = {"teal_lab": self.test_token}

        # Directory listing
        resp = await self.client.request("GET", "/__teal/files/work", cookies=cookies)
        self.assertEqual(resp.status, 200)
        data = await resp.json()
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["name"], "hello.txt")

        # File download
        resp_file = await self.client.request("GET", "/__teal/files/work/hello.txt", cookies=cookies)
        self.assertEqual(resp_file.status, 200)
        content = await resp_file.text()
        self.assertEqual(content, "Hello TEAL!")

    async def test_proxy_preserves_compressed_response(self):
        """Proxied compressed bytes must remain valid for the browser."""
        cookies = {"teal_lab": self.test_token}
        resp = await self.client.request(
            "GET",
            "/terminal/compressed",
            cookies=cookies,
            auto_decompress=False,
        )

        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.headers.get("Content-Encoding"), "gzip")
        self.assertEqual(gzip.decompress(await resp.read()), b"compressed terminal response")

    async def test_files_path_traversal_blocked(self):
        """Path traversal outside home directory must return 403 or 404."""
        cookies = {"teal_lab": self.test_token}
        import yarl
        traversal_url = yarl.URL("/__teal/files/..%2F..%2Fetc%2Fpasswd", encoded=True)
        resp = await self.client.request("GET", traversal_url, cookies=cookies)
        self.assertIn(resp.status, (403, 404))

    async def test_archive_download(self):
        """GET /__teal/files?archive=1 streams home.tar.gz."""
        cookies = {"teal_lab": self.test_token}
        resp = await self.client.request("GET", "/__teal/files?archive=1", cookies=cookies)
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.headers.get("Content-Type"), "application/gzip")
        body = await resp.read()
        self.assertTrue(len(body) > 0)


if __name__ == "__main__":
    unittest.main()
