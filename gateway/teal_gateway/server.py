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
  <title>TEAL - Initializing Environment</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8f6f2;
      color: #172b2a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
      -webkit-font-smoothing: antialiased;
    }
    .screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulseGlow 1.8s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    .labels {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .mono-label {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      color: #172b2a;
      font-weight: 600;
      text-transform: uppercase;
    }
    .sub-label {
      font-size: 0.8125rem;
      color: #556461;
    }
    /* Error state */
    .error-screen {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      max-width: 420px;
      text-align: center;
    }
    .error-card {
      background: #f8f6f2;
      border: 1px solid #d9d3c8;
      border-radius: 16px;
      padding: 36px 32px;
      width: 100%;
      box-shadow: 0 18px 40px -16px rgb(23 43 42 / 0.2), 0 4px 10px -4px rgb(23 43 42 / 0.08);
    }
    .error-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #fbe4e0;
      border: 1px solid rgba(180, 35, 24, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 18px auto;
      color: #b42318;
      font-size: 1.5rem;
    }
    .error-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #172b2a;
      margin-bottom: 8px;
    }
    .error-msg {
      font-size: 0.85rem;
      color: #556461;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 0.75rem 1.5rem;
      background: #2f7f7a;
      color: #ffffff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 8px;
      transition: background 0.15s ease;
      font-family: inherit;
      cursor: pointer;
      border: none;
    }
    .btn-primary:hover { background: #286e6a; }
  </style>
</head>
<body>
  <!-- Normal loading state -->
  <div class="screen" id="loading-screen">
    <div class="logo-wrap">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style="width:42px;height:42px;display:block;">
        <rect width="32" height="32" rx="7" fill="#2F7F7A"/>
        <path d="M16 7.5a8.5 8.5 0 1 0 8.5 8.5" stroke="#EEEAE3" stroke-width="3.2" stroke-linecap="round"/>
        <circle cx="23.2" cy="8.8" r="3" fill="#C48A6D"/>
      </svg>
    </div>
    <div class="labels">
      <span class="mono-label">Initializing Environment</span>
      <span class="sub-label">Setting up your secure container...</span>
    </div>
  </div>

  <!-- Error state (hidden until auth fails) -->
  <div class="error-screen" id="error-screen">
    <div class="error-card">
      <div class="error-icon">&#x26A0;</div>
      <h2 class="error-title" id="err-title">Access Refused</h2>
      <p class="error-msg" id="err-msg">Unable to establish lab session. Please return to the dashboard and reopen the lab.</p>
      <a href="/dashboard" class="btn-primary" id="btn-return-dashboard">
        Return to Dashboard &#x2192;
      </a>
    </div>
  </div>

  <script>
    (function() {
      var hash = window.location.hash || '';
      if (hash.startsWith('#')) hash = hash.slice(1);
      var params = new URLSearchParams(hash);
      var token = params.get('t');

      function showError(title, message) {
        document.getElementById('loading-screen').style.display = 'none';
        var errScreen = document.getElementById('error-screen');
        errScreen.style.display = 'flex';
        document.getElementById('err-title').textContent = title;
        document.getElementById('err-msg').textContent = message;
      }

      if (!token) {
        showError('Session Token Not Found', 'Please open this lab directly from the TEAL dashboard.');
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
        showError('Access Refused', err.message + ' Please return to the dashboard and restart or reopen the lab.');
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

        reason = "user"
        try:
            body = await request.json()
            if isinstance(body, dict) and body.get("reason"):
                reason = body["reason"]
        except Exception:
            pass

        cost_result = {"costUsd": 0.0}
        if api_url and session_id:
            end_endpoint = f"{api_url}/api/labs/{session_id}/end"
            try:
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                async with self.session.post(end_endpoint, headers=headers, json={"reason": reason}) as resp:
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
