"""
gateway/teal_gateway/server.py
------------------------------
aiohttp web application implementing the TEAL Lab Gateway specification (§8.2).
"""

import asyncio
from datetime import datetime, timezone
import hashlib
import hmac
import io
import json
import logging
import os
from pathlib import Path
import tarfile
from typing import Optional

from aiohttp import ClientSession, web

from .proxy import forward_request
from .supervisor import ProcessSupervisor

logger = logging.getLogger("teal.gateway.server")

BOOTSTRAP_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TEAL - Connecting to Lab</title>
  <style>
    :root {
      color-scheme: dark;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #111827;
      border: 1px solid #1f293d;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 9999px;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.95rem;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(56, 189, 248, 0.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 1.5rem auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-box {
      display: none;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #fca5a5;
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.4;
      text-align: left;
    }
    .btn {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.6rem 1.25rem;
      background: #2563eb;
      color: #fff;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">TEAL Lab Gateway</div>
    <h1>Connecting to Lab</h1>
    <div class="spinner" id="spinner"></div>
    <p id="msg">Verifying your secure session token...</p>
    <div class="error-box" id="err"></div>
  </div>

  <script>
    (function() {
      var hash = window.location.hash || '';
      if (hash.startsWith('#')) hash = hash.slice(1);
      var params = new URLSearchParams(hash);
      var token = params.get('t');

      var spinner = document.getElementById('spinner');
      var msg = document.getElementById('msg');
      var errBox = document.getElementById('err');

      if (!token) {
        spinner.style.display = 'none';
        msg.textContent = 'Session token not found.';
        errBox.style.display = 'block';
        errBox.innerHTML = '<strong>401 Unauthorized</strong><br>Please open this lab directly from the TEAL dashboard.';
        return;
      }

      fetch('/__teal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      })
      .then(function(res) {
        if (res.ok) {
          // Remove token hash from URL to avoid leaking it in history/logs
          history.replaceState(null, '', window.location.pathname + window.location.search);
          window.location.reload();
        } else {
          return res.json().then(function(data) {
            throw new Error(data.message || 'Token verification failed');
          }).catch(function() {
            throw new Error('Authentication failed (HTTP ' + res.status + ')');
          });
        }
      })
      .catch(function(err) {
        spinner.style.display = 'none';
        msg.textContent = 'Unable to establish lab session.';
        errBox.style.display = 'block';
        errBox.innerHTML = '<strong>Access Refused</strong><br>' + err.message + '<br><br>Please return to the dashboard and restart or reopen the lab.';
      });
    })();
  </script>
</body>
</html>
"""


class GatewayApp:
    def __init__(
        self,
        upstream_url: str,
        prefix: str,
        supervisor: Optional[ProcessSupervisor] = None,
        ui_dir: Optional[Path] = None,
        home_dir: Optional[Path] = None,
    ):
        self.upstream_url = upstream_url.rstrip("/")
        self.prefix = "/" + prefix.strip("/")
        self.supervisor = supervisor

        # Resolve home directory
        if home_dir:
            self.home_dir = home_dir.resolve()
        else:
            default_student_home = Path("/home/student")
            if default_student_home.exists():
                self.home_dir = default_student_home.resolve()
            else:
                self.home_dir = Path.cwd().resolve()

        # Resolve UI directory
        if ui_dir:
            self.ui_dir = ui_dir.resolve()
        else:
            default_opt_ui = Path("/opt/teal-gateway/ui")
            local_ui = Path(__file__).resolve().parent.parent.parent / "lab-ui" / "dist"
            if default_opt_ui.exists():
                self.ui_dir = default_opt_ui.resolve()
            elif local_ui.exists():
                self.ui_dir = local_ui.resolve()
            else:
                self.ui_dir = None

        self.session: Optional[ClientSession] = None
        self.app = web.Application(middlewares=[self._security_headers_middleware])
        self._setup_routes()

    def _setup_routes(self) -> None:
        self.app.on_startup.append(self._on_startup)
        self.app.on_cleanup.append(self._on_cleanup)

        # Gateway management routes (§8.2)
        self.app.router.add_get("/__teal/healthz", self.handle_healthz)
        self.app.router.add_post("/__teal/auth", self.handle_auth)
        self.app.router.add_get("/__teal/info", self.handle_info)
        self.app.router.add_post("/__teal/end", self.handle_end)
        self.app.router.add_get("/__teal/files", self.handle_files)
        self.app.router.add_get(r"/__teal/files/{path:.*}", self.handle_files)

        # Interface proxy routes (e.g. /terminal/* or /jupyter/*)
        self.app.router.add_route("*", self.prefix, self.handle_proxy)
        self.app.router.add_route("*", self.prefix + "/{path:.*}", self.handle_proxy)

        # Lab page and static files
        self.app.router.add_get("/", self.handle_root)
        self.app.router.add_get(r"/{path:.*}", self.handle_static_or_spa)

    async def _on_startup(self, app: web.Application) -> None:
        self.session = ClientSession(auto_decompress=False)

    async def _on_cleanup(self, app: web.Application) -> None:
        if self.session:
            await self.session.close()
        if self.supervisor:
            await self.supervisor.stop()

    # -----------------------------------------------------------------------
    # Middlewares & Auth checks
    # -----------------------------------------------------------------------
    @web.middleware
    async def _security_headers_middleware(self, request: web.Request, handler) -> web.StreamResponse:
        response = await handler(request)
        response.headers["Content-Security-Policy"] = "frame-ancestors 'self'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    def _is_authenticated(self, request: web.Request) -> bool:
        expected_sha = os.environ.get("TEAL_TOKEN_SHA256", "").strip().lower()
        if not expected_sha:
            # When TEAL_TOKEN_SHA256 is not set (e.g. during standalone testing), permit access
            return True

        cookie_token = request.cookies.get("teal_lab", "")
        if not cookie_token:
            return False

        hashed = hashlib.sha256(cookie_token.encode("utf-8")).hexdigest().lower()
        return hmac.compare_digest(hashed, expected_sha)

    def _is_expired(self) -> bool:
        expires_str = os.environ.get("TEAL_EXPIRES_AT", "").strip()
        if not expires_str:
            return False

        try:
            # Support ISO 8601 strings (e.g. 2026-10-08T10:42:00Z)
            cleaned = expires_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            now = datetime.now(timezone.utc)
            return now >= dt
        except Exception:
            return False

    # -----------------------------------------------------------------------
    # Handlers
    # -----------------------------------------------------------------------
    async def handle_healthz(self, request: web.Request) -> web.Response:
        """GET /__teal/healthz - Unauthenticated liveness probe."""
        if self._is_expired():
            return web.Response(status=410, text="expired")
        return web.Response(status=200, text="ok")

    async def handle_auth(self, request: web.Request) -> web.Response:
        """POST /__teal/auth - Exchange token from fragment for session cookie."""
        try:
            data = await request.json()
            token = data.get("token", "")
        except Exception:
            return web.json_response({"error": "invalid_request", "message": "Expected JSON payload"}, status=400)

        expected_sha = os.environ.get("TEAL_TOKEN_SHA256", "").strip().lower()
        if expected_sha:
            token_sha = hashlib.sha256(token.encode("utf-8")).hexdigest().lower()
            if not hmac.compare_digest(token_sha, expected_sha):
                logger.warning("Authentication failed for token.")
                return web.json_response({"error": "unauthorized", "message": "Invalid token"}, status=401)

        # Set HttpOnly cookie
        response = web.json_response({"ok": True})
        is_secure = request.headers.get("X-Forwarded-Proto") == "https" or request.scheme == "https"
        response.set_cookie(
            name="teal_lab",
            value=token,
            max_age=3600,
            path="/",
            httponly=True,
            secure=is_secure,
            samesite="Lax",
        )
        logger.info("Session cookie successfully established for lab.")
        return response

    async def handle_info(self, request: web.Request) -> web.Response:
        """GET /__teal/info - Return lab metadata for lab page."""
        if not self._is_authenticated(request):
            return web.json_response({"error": "unauthorized"}, status=401)

        lab_info_raw = os.environ.get("TEAL_LAB_INFO", "{}")
        try:
            lab_info = json.loads(lab_info_raw)
        except Exception:
            lab_info = {}

        return web.json_response({
            "sessionId": os.environ.get("TEAL_SESSION_ID", "local"),
            "expiresAt": os.environ.get("TEAL_EXPIRES_AT", ""),
            "lab": lab_info,
            "dashboardUrl": os.environ.get("TEAL_DASHBOARD_URL", ""),
        })

    async def handle_end(self, request: web.Request) -> web.Response:
        """POST /__teal/end - Call teal-api to terminate lab."""
        if not self._is_authenticated(request):
            return web.json_response({"error": "unauthorized"}, status=401)

        session_id = os.environ.get("TEAL_SESSION_ID", "")
        api_url = os.environ.get("TEAL_API_URL", "").rstrip("/")
        token = request.cookies.get("teal_lab", "")

        cost_result = {"costUsd": 0.0}
        if api_url and session_id:
            end_endpoint = f"{api_url}/api/labs/{session_id}/end"
            try:
                headers = {"Authorization": f"Bearer {token}"}
                async with self.session.post(end_endpoint, headers=headers) as resp:
                    if resp.status == 200:
                        cost_result = await resp.json()
                    else:
                        logger.error("API /end returned %s", resp.status)
            except Exception as e:
                logger.error("Failed to notify teal-api of end: %s", e)

        # Stop child process asynchronously
        if self.supervisor:
            asyncio.create_task(self.supervisor.stop())

        return web.json_response(cost_result)

    async def handle_files(self, request: web.Request) -> web.StreamResponse:
        """GET /__teal/files - List files, download single file, or stream home.tar.gz."""
        if not self._is_authenticated(request):
            return web.json_response({"error": "unauthorized"}, status=401)

        # Stream tar.gz archive if ?archive=1
        if request.query.get("archive") == "1":
            return await self._stream_home_tar_gz(request)

        # Subpath lookup
        rel_path = request.match_info.get("path", "").strip("/")
        try:
            target_path = (self.home_dir / rel_path).resolve()
            # Path traversal prevention: ensure target is within self.home_dir
            if not target_path.is_relative_to(self.home_dir):
                return web.json_response({"error": "forbidden", "message": "Path traversal prohibited"}, status=403)
        except Exception:
            return web.json_response({"error": "not_found", "message": "Invalid path"}, status=404)

        if not target_path.exists():
            return web.json_response({"error": "not_found", "message": "File or directory not found"}, status=404)

        if target_path.is_file():
            # Download file
            return web.FileResponse(
                target_path,
                headers={"Content-Disposition": f'attachment; filename="{target_path.name}"'},
            )

        # Directory listing
        items = []
        try:
            for entry in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                stat = entry.stat()
                items.append({
                    "name": entry.name,
                    "isDir": entry.is_dir(),
                    "size": stat.st_size if entry.is_file() else None,
                    "modified": stat.st_mtime,
                })
        except PermissionError:
            return web.json_response({"error": "forbidden", "message": "Permission denied reading directory"}, status=403)

        return web.json_response({
            "path": str(target_path.relative_to(self.home_dir)).replace("\\", "/"),
            "items": items,
        })

    async def _stream_home_tar_gz(self, request: web.Request) -> web.StreamResponse:
        """Stream /home/student as home.tar.gz archive."""
        resp = web.StreamResponse(
            status=200,
            headers={
                "Content-Type": "application/gzip",
                "Content-Disposition": 'attachment; filename="home.tar.gz"',
            },
        )
        await resp.prepare(request)

        # Run tar generation in thread pool to avoid blocking async event loop
        loop = asyncio.get_running_loop()

        def make_tar_bytes() -> bytes:
            buf = io.BytesIO()
            with tarfile.open(fileobj=buf, mode="w:gz") as tar:
                tar.add(str(self.home_dir), arcname="home", recursive=True)
            return buf.getvalue()

        tar_data = await loop.run_in_executor(None, make_tar_bytes)
        await resp.write(tar_data)
        await resp.write_eof()
        return resp

    async def handle_proxy(self, request: web.Request) -> web.StreamResponse:
        """Reverse-proxy /terminal/* or /jupyter/* to the upstream process."""
        if not self._is_authenticated(request):
            return web.Response(status=401, text="Unauthorized: session cookie required")

        if self._is_expired():
            return web.Response(status=410, text="Lab session has expired", content_type="text/plain")

        target_url = f"{self.upstream_url}{request.path}"
        return await forward_request(request, target_url, self.session)

    async def handle_root(self, request: web.Request) -> web.Response:
        """GET / - Serve lab UI if authenticated, otherwise bootstrap page."""
        if not self._is_authenticated(request):
            return web.Response(text=BOOTSTRAP_HTML, content_type="text/html")

        if self._is_expired():
            return web.Response(status=410, text="Lab session has expired", content_type="text/plain")

        if self.ui_dir and (self.ui_dir / "index.html").exists():
            return web.FileResponse(self.ui_dir / "index.html")

        # Fallback minimal page if UI hasn't been built yet
        return web.Response(
            text="<!DOCTYPE html><html><body><h1>TEAL Lab Gateway Active</h1><p>UI bundle not found. Visit <a href='/terminal/'>/terminal/</a></p></body></html>",
            content_type="text/html",
        )

    async def handle_static_or_spa(self, request: web.Request) -> web.Response:
        """Serve static files or fall back to index.html for SPA client-side routing."""
        req_path = request.match_info.get("path", "").lstrip("/")

        # If not authenticated, only allow static assets or bounce to bootstrap
        if not self._is_authenticated(request):
            if not req_path.startswith("assets/"):
                return web.Response(text=BOOTSTRAP_HTML, content_type="text/html")

        if self._is_expired():
            return web.Response(status=410, text="Lab session has expired", content_type="text/plain")

        if self.ui_dir:
            file_path = (self.ui_dir / req_path).resolve()
            if file_path.is_relative_to(self.ui_dir) and file_path.is_file():
                return web.FileResponse(file_path)

            # Do not return index.html for missing file assets (with extensions) or internal paths
            if "." in Path(req_path).name:
                return web.Response(status=404, text="Not Found")

            index_html = self.ui_dir / "index.html"
            if index_html.exists():
                return web.FileResponse(index_html)

        return web.Response(status=404, text="Not Found")
