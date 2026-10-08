"""Reaper: `POST /internal/reap`, run by Cloud Scheduler every minute (PLAN.md §9.4).

The reap logic (`reap`) is a pure function of `now` plus two collaborators that
match the function table in §9.4:

    provisioner.list_labs()        -> [LabService-like: name, session_id, create_time]
    provisioner.delete(name)
    sessions.list_active()         -> [ActiveSession-like: uid, session_id, service_name,
                                        status, created_at, expires_at]
    sessions.check_ready(active)   -> bool (True if the session is now running)
    sessions.end(active, reason)   reason in expired | failed | deleted

Items may be objects with those attributes or plain dicts with those keys.

The real collaborators are the `app.provisioner` and `app.sessions` modules,
imported lazily in `get_reaper_deps` so this module imports (and is testable)
without them.
"""

from __future__ import annotations

import json
import logging
import os
from collections.abc import Callable, Iterable, Mapping
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol, runtime_checkable

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute

logger = logging.getLogger("teal.reaper")

# A `starting` session that is still not ready this long after createdAt is failed.
STARTING_TIMEOUT = timedelta(minutes=5)
# A `running` session whose service is gone is only ended once it is this old,
# so a service that is still being created is not mistaken for a deleted one.
MISSING_SERVICE_GRACE = timedelta(minutes=2)
# A labelled lab service with no active session is deleted once it is this old,
# so a service created moments before its activeSessions doc is visible survives.
ORPHAN_GRACE = timedelta(minutes=2)


# --------------------------------------------------------------------------- #
# Interfaces consumed by the reaper
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class LabService:
    """A Cloud Run service labelled teal-lab=true (from provisioner.list_labs())."""

    name: str
    session_id: str | None  # from the teal-session label
    create_time: datetime


@dataclass(frozen=True)
class ActiveSession:
    """An activeSessions/{uid} document (from sessions.list_active())."""

    uid: str
    session_id: str
    service_name: str
    status: str  # starting | running | ending
    created_at: datetime
    expires_at: datetime


@runtime_checkable
class Provisioner(Protocol):
    def list_labs(self) -> Iterable[Any]: ...

    def delete(self, name: str) -> Any: ...


@runtime_checkable
class Sessions(Protocol):
    def list_active(self) -> Iterable[Any]: ...

    def check_ready(self, active: Any) -> bool: ...

    def end(self, active: Any, reason: str) -> Any: ...


@dataclass
class ReapSummary:
    expired: int = 0
    failed: int = 0
    deleted: int = 0
    orphans: int = 0
    errors: int = 0

    def to_dict(self) -> dict[str, int]:
        return asdict(self)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def log_event(event: str, severity: str = "INFO", **fields: Any) -> None:
    """Write one structured JSON log line that Cloud Logging parses."""
    payload = {"severity": severity, "event": event, "message": event, **fields}
    level = getattr(logging, severity, logging.INFO)
    logger.log(level, json.dumps(payload, default=str))


# Firestore documents use camelCase (sessionId, createdAt, ...); accept both spellings.
_CAMEL_KEYS = {
    "session_id": "sessionId",
    "service_name": "serviceName",
    "created_at": "createdAt",
    "expires_at": "expiresAt",
    "create_time": "createTime",
}


def _field(item: Any, key: str) -> Any:
    keys = (key, _CAMEL_KEYS[key]) if key in _CAMEL_KEYS else (key,)
    for k in keys:
        value = item.get(k) if isinstance(item, Mapping) else getattr(item, k, None)
        if value is not None:
            return value
    return None


def _as_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            raise TypeError(f"expected datetime or iso string, got {type(value).__name__}")
    elif not isinstance(value, datetime):
        raise TypeError(f"expected datetime, got {type(value).__name__}")
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _short_name(name: str | None) -> str:
    """'projects/p/locations/r/services/lab-x' -> 'lab-x'."""
    return (name or "").rstrip("/").rsplit("/", 1)[-1]


# --------------------------------------------------------------------------- #
# Reap logic
# --------------------------------------------------------------------------- #


def reap(now: datetime, provisioner: Provisioner, sessions: Sessions) -> ReapSummary:
    """Run one reaper pass (PLAN.md §9.4 steps 2-4) and return the counts.

    Per active session, in this order:
      1. `starting`: run the ready check. If it is still not ready more than
         STARTING_TIMEOUT after created_at -> end(failed).
         If it became ready it is treated as `running` for the checks below.
      2. Past expires_at (any status, including `ending`) -> end(expired).
      3. `ending` (not yet expired) -> retry end(failed). The intended reason of
         an interrupted end() is not stored on the activeSessions doc, so the
         reaper uses `expired` when the session is past expiry (step 2) and
         `failed` otherwise: it was ended early and the delete did not complete.
      4. `running` whose service is missing from list_labs() and that is older
         than MISSING_SERVICE_GRACE -> end(deleted). Skipped if list_labs() failed.

    Then the orphan sweep deletes every lab whose session_id matches no active
    session and whose create_time is older than ORPHAN_GRACE. It is skipped if
    either list call failed, so a transient error never deletes live labs.

    A failure on one session or one lab is logged, counted in `errors` and does
    not stop the rest.
    """
    now = _as_utc(now)
    summary = ReapSummary()

    labs: list[Any] | None
    try:
        labs = list(provisioner.list_labs())
    except Exception as exc:  # noqa: BLE001 - keep reaping without the lab list
        labs = None
        summary.errors += 1
        log_event("reap.error", "ERROR", step="list_labs", error=repr(exc))

    active: list[Any] | None
    try:
        active = list(sessions.list_active())
    except Exception as exc:  # noqa: BLE001
        active = None
        summary.errors += 1
        log_event("reap.error", "ERROR", step="list_active", error=repr(exc))

    lab_names: set[str] = set()
    lab_session_ids: set[str] = set()
    if labs is not None:
        for lab in labs:
            lab_names.add(_short_name(_field(lab, "name")))
            sid = _field(lab, "session_id")
            if sid:
                lab_session_ids.add(sid)

    for session in active or []:
        try:
            outcome = _reap_one(now, session, sessions, labs is not None, lab_names, lab_session_ids)
        except Exception as exc:  # noqa: BLE001
            summary.errors += 1
            log_event(
                "reap.error",
                "ERROR",
                step="session",
                sessionId=_field(session, "session_id"),
                uid=_field(session, "uid"),
                error=repr(exc),
            )
            continue
        if outcome is not None:
            setattr(summary, outcome, getattr(summary, outcome) + 1)

    active_ids = {_field(s, "session_id") for s in active or []}
    if None in active_ids:
        # Without every active session's id, any lab could look like an orphan.
        active = None
        summary.errors += 1
        log_event("reap.error", "ERROR", step="orphan_sweep", error="active session without session_id")

    if labs is not None and active is not None:
        for lab in labs:
            name = _field(lab, "name")
            try:
                if _field(lab, "session_id") in active_ids:
                    continue
                created = _as_utc(_field(lab, "create_time"))
                if created is None or now - created <= ORPHAN_GRACE:
                    continue
                provisioner.delete(name)
                summary.orphans += 1
                log_event("reap.orphan", name=name, sessionId=_field(lab, "session_id"))
            except Exception as exc:  # noqa: BLE001
                summary.errors += 1
                log_event("reap.error", "ERROR", step="orphan", name=name, error=repr(exc))

    return summary


def _reap_one(
    now: datetime,
    session: Any,
    sessions: Sessions,
    have_labs: bool,
    lab_names: set[str],
    lab_session_ids: set[str],
) -> str | None:
    """Handle one active session. Returns the summary field to bump, or None."""
    status = _field(session, "status")
    created_at = _as_utc(_field(session, "created_at"))
    expires_at = _as_utc(_field(session, "expires_at"))

    if status == "starting":
        if sessions.check_ready(session):
            status = "running"
        elif created_at is not None and now - created_at > STARTING_TIMEOUT:
            sessions.end(session, "failed")
            return "failed"

    if expires_at is not None and now >= expires_at:
        sessions.end(session, "expired")
        return "expired"

    if status == "ending":
        sessions.end(session, "failed")
        return "failed"

    if status == "running" and have_labs:
        present = (
            _short_name(_field(session, "service_name")) in lab_names
            or _field(session, "session_id") in lab_session_ids
        )
        if not present and created_at is not None and now - created_at > MISSING_SERVICE_GRACE:
            sessions.end(session, "deleted")
            return "deleted"

    return None


# --------------------------------------------------------------------------- #
# HTTP endpoint
# --------------------------------------------------------------------------- #


class ReapError(Exception):
    """An error returned as {"error": code, "message": text}."""

    def __init__(self, status_code: int, error: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error = error
        self.message = message


class _ErrorRoute(APIRoute):
    """Turns ReapError (raised in the endpoint or its dependencies) into the
    standard error body, without needing an app-level exception handler."""

    def get_route_handler(self) -> Callable[[Request], Any]:
        handler = super().get_route_handler()

        async def route_handler(request: Request) -> Response:
            try:
                return await handler(request)
            except ReapError as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"error": exc.error, "message": exc.message},
                )

        return route_handler


router = APIRouter(route_class=_ErrorRoute)

TokenVerifier = Callable[[str], Mapping[str, Any]]


def _verify_google_oidc(token: str) -> Mapping[str, Any]:
    audience = os.environ.get("PUBLIC_URL", "").strip()
    if not audience:
        # Without an audience verify_oauth2_token would skip the audience check.
        raise ReapError(500, "server_misconfigured", "PUBLIC_URL is not set")
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    return id_token.verify_oauth2_token(token, google_requests.Request(), audience=audience)


def get_token_verifier() -> TokenVerifier:
    """Dependency returning the OIDC verifier. Tests override it."""
    return _verify_google_oidc


def require_scheduler(
    authorization: str | None = Header(default=None),
    verify: TokenVerifier = Depends(get_token_verifier),
) -> Mapping[str, Any]:
    """Allow only Cloud Scheduler's OIDC token from SCHEDULER_SA (PLAN.md §11.6)."""
    scheme, _, token = (authorization or "").partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        raise ReapError(401, "unauthenticated", "Missing bearer token")

    try:
        claims = verify(token)
    except ReapError:
        raise
    except Exception as exc:  # noqa: BLE001 - any verification failure is a 401
        log_event("reap.auth_failed", "WARNING", error=repr(exc))
        raise ReapError(401, "unauthenticated", "Invalid token") from None

    expected = os.environ.get("SCHEDULER_SA", "").strip()
    if not expected:
        raise ReapError(500, "server_misconfigured", "SCHEDULER_SA is not set")
    email = claims.get("email")
    verified = claims.get("email_verified") in (True, "true")
    if email != expected or not verified:
        log_event("reap.forbidden", "WARNING", email=email)
        raise ReapError(403, "forbidden", "Caller is not the reaper scheduler")
    return claims


@dataclass(frozen=True)
class ReaperDeps:
    provisioner: Provisioner
    sessions: Sessions


def get_reaper_deps() -> ReaperDeps:
    """Real wiring: the provisioner and sessions modules. Tests override it."""
    from app import provisioner, sessions  # lazy: owned by another module

    return ReaperDeps(provisioner=provisioner, sessions=sessions)


def get_now() -> datetime:
    """Dependency returning the current UTC time. Tests override it."""
    return datetime.now(timezone.utc)


@router.post("/internal/reap")
def reap_endpoint(
    _claims: Mapping[str, Any] = Depends(require_scheduler),
    deps: ReaperDeps = Depends(get_reaper_deps),
    now: datetime = Depends(get_now),
) -> dict[str, int]:
    summary = reap(now, deps.provisioner, deps.sessions)
    counts = summary.to_dict()
    log_event("reap.summary", "WARNING" if summary.errors else "INFO", **counts)
    return counts
