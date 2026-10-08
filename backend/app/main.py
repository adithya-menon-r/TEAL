"""
backend/app/main.py
-------------------
FastAPI application: routes, CORS, error format, startup, audit logs.

Routes (§8.1):
  GET  /api/me                   — auth check / who am I
  GET  /api/templates            — lab catalog
  GET  /api/session              — active session (with ready-check)
  POST /api/sessions             — launch a new lab
  DELETE /api/session            — end the active lab
  GET  /api/sessions/history     — last 10 sessions
  POST /api/labs/{id}/end        — lab-side end callback (lab token auth)
  POST /internal/reap            — Cloud Scheduler reaper (OIDC auth)
"""

import json
import logging
import logging.config
import os

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import current_user
from .catalog import get_template, get_templates, load_catalog
from .config import settings
from . import sessions

try:
    from . import reaper, history
except ImportError:
    reaper = None
    history = None

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","severity":"%(levelname)s","logger":"%(name)s","msg":%(message)s}',
)
logger = logging.getLogger("teal.api")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="TEAL API", docs_url=None, redoc_url=None)

# CORS — allows the dashboard and local dev; no cookies (token in header)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

if reaper and history:
    app.include_router(reaper.router)
    app.include_router(history.router)
    app.dependency_overrides[history.get_current_user] = current_user

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup() -> None:
    load_catalog()
    logger.info('"teal-api started"')


# ---------------------------------------------------------------------------
# Error helper — all errors follow {"error": code, "message": text}
# ---------------------------------------------------------------------------
def _err(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": code, "message": message},
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/me")
def me(user: dict = Depends(current_user)) -> dict:
    return {"email": user["email"], "uid": user["uid"]}


@app.get("/api/templates")
def templates_list() -> dict:
    tmpl = get_templates()
    # Strip internal-only fields before sending
    public_fields = (
        "id", "name", "description", "interface", "tools",
        "cpu", "memory", "durationMinutes", "approxCostUsd",
    )
    return {
        "templates": [
            {k: t[k] for k in public_fields if k in t}
            for t in tmpl
        ]
    }


@app.get("/api/session")
def get_session(user: dict = Depends(current_user)) -> dict:
    session = sessions.get_active_session(user["uid"])
    if session is None:
        return {"session": None}

    # If still starting, do a ready-check
    if session.get("status") == "starting":
        session = sessions.ready_check(session["id"], user["uid"])

    return {"session": session}


@app.post("/api/sessions", status_code=202)
def create_session(
    body: dict,
    user: dict = Depends(current_user),
) -> dict:
    template_id = body.get("templateId", "")
    template = get_template(template_id)
    if template is None:
        return _err(404, "unknown_template", f"No template with id '{template_id}'.")

    try:
        session = sessions.launch(user["uid"], user["email"], template)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("active_session:"):
            existing_id = msg.split(":", 1)[1]
            existing = sessions.get_active_session(user["uid"])
            return JSONResponse(
                status_code=409,
                content={"error": "active_session", "session": existing},
            )
        if msg == "launches_disabled":
            return _err(403, "launches_disabled", "Launches are currently paused. Try again later.")
        if msg == "capacity_full":
            return _err(429, "capacity_full", "All lab slots are busy. Try again in a few minutes.")
        raise
    except RuntimeError as exc:
        return _err(502, "provision_failed", f"Failed to start the lab: {exc}")

    return {"session": session}


@app.delete("/api/session")
def delete_session(user: dict = Depends(current_user)) -> dict:
    try:
        session = sessions.end_session(user["uid"], reason="user")
    except KeyError:
        return _err(404, "no_active_session", "You have no active lab session.")
    return {"session": session}


@app.post("/api/labs/{session_id}/end")
def lab_end_callback(
    session_id: str,
    request: Request,
    authorization: str = Header(default=""),
) -> dict:
    """
    Called by the lab gateway when the student clicks End Lab (§8.1).
    Auth: Bearer <plaintext lab token> — checked against stored SHA-256 hash.
    """
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token or not sessions.verify_lab_token(session_id, token):
        raise HTTPException(status_code=401, detail={"error": "invalid_token", "message": "Invalid lab token."})

    try:
        session = sessions.end_session_by_id(session_id, reason="user")
    except KeyError:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Session not found."})

    return {"costUsd": session.get("costUsd", 0.0)}


# ---------------------------------------------------------------------------
# Global exception handler — ensure error shape is consistent
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "http_error", "message": str(exc.detail)},
    )


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "An unexpected error occurred."},
    )
