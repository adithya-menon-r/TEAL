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

import google.auth.transport.requests
import google.oauth2.id_token
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import CurrentUser, get_current_user
from .catalog import get_template, get_templates, load_catalog
from .config import settings
from . import sessions

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)s}',
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


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup() -> None:
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
async def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    return {"email": user.email, "uid": user.uid}


@app.get("/api/templates")
async def templates_list(user: CurrentUser = Depends(get_current_user)) -> dict:
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
async def get_session(user: CurrentUser = Depends(get_current_user)) -> dict:
    session = sessions.get_active_session(user.uid)
    if session is None:
        return {"session": None}

    # If still starting, do a ready-check
    if session.get("status") == "starting":
        session = sessions.ready_check(session["id"], user.uid)

    return {"session": session}


@app.post("/api/sessions", status_code=202)
async def create_session(
    body: dict,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    template_id = body.get("templateId", "")
    template = get_template(template_id)
    if template is None:
        return _err(404, "unknown_template", f"No template with id '{template_id}'.")

    try:
        session = sessions.launch(user.uid, user.email, template)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("active_session:"):
            existing_id = msg.split(":", 1)[1]
            existing = sessions.get_active_session(user.uid)
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
async def delete_session(user: CurrentUser = Depends(get_current_user)) -> dict:
    try:
        session = sessions.end_session(user.uid, reason="user")
    except KeyError:
        return _err(404, "no_active_session", "You have no active lab session.")
    return {"session": session}


@app.get("/api/sessions/history")
async def session_history(user: CurrentUser = Depends(get_current_user)) -> dict:
    history = sessions.get_history(user.uid)
    return {"sessions": history}


@app.post("/api/labs/{session_id}/end")
async def lab_end_callback(
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


@app.post("/internal/reap")
async def reap(request: Request) -> dict:
    """
    Called by Cloud Scheduler every minute (§9.4).
    Auth: OIDC token from teal-scheduler@ with audience=PUBLIC_URL.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "missing_token"})

    oidc_token = auth_header[7:]
    try:
        http_request = google.auth.transport.requests.Request()
        claim = google.oauth2.id_token.verify_oauth2_token(
            oidc_token, http_request, audience=settings.PUBLIC_URL
        )
    except Exception as exc:
        logger.warning("reap: OIDC verification failed: %s", exc)
        raise HTTPException(status_code=401, detail={"error": "invalid_oidc_token"})

    # Verify the caller is the scheduler service account
    caller_email = claim.get("email", "")
    if caller_email != settings.SCHEDULER_SA:
        logger.warning("reap: wrong caller email=%s", caller_email)
        raise HTTPException(status_code=403, detail={"error": "wrong_caller"})

    counts = sessions.reap()
    return counts


# ---------------------------------------------------------------------------
# Global exception handler — ensure error shape is consistent
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "An unexpected error occurred."},
    )
