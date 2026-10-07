"""
backend/app/sessions.py
-----------------------
Module 4: Session lifecycle — Firestore model + all state transitions.

Collections (§7):
  sessions/{sessionId}       permanent session record
  activeSessions/{uid}       one-per-user lock + reaper scan target
  sessionSecrets/{sessionId} per-session lab token (deleted on end)

Public API:
  launch(uid, email, template)     -> Session dict  (§9.1)
  get_active_session(uid)          -> Session | None
  ready_check(session_id)          -> Session        (§9.2, mutates status)
  end_session(session_id, reason)  -> Session        (§9.3)
  get_history(uid)                 -> list[Session]
  verify_lab_token(session_id, token) -> bool
  reap()                           -> dict           (§9.4, called by /internal/reap)
"""

import hashlib
import logging
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from google.cloud import firestore
from google.cloud.exceptions import NotFound as GCSNotFound

from . import provisioner
from .config import settings
from .cost import calculate_cost

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firestore client — one per process
# ---------------------------------------------------------------------------
_db: firestore.Client | None = None


def _get_db() -> firestore.Client:
    global _db
    if _db is None:
        _db = firestore.Client(project=settings.GCP_PROJECT)
    return _db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EndReason = Literal["user", "expired", "deleted", "failed"]
Status = Literal["starting", "running", "ending", "ended", "failed"]


def _new_session_id() -> str:
    """10-char random id: first char a letter, rest letters/digits."""
    first = random.choice(string.ascii_lowercase)
    rest = "".join(
        random.choices(string.ascii_lowercase + string.digits, k=9)
    )
    return first + rest


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_rfc3339(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _session_to_dict(doc: dict, session_id: str) -> dict[str, Any]:
    """Convert a Firestore document to the Session API shape."""
    result: dict[str, Any] = {
        "id": session_id,
        "templateId": doc.get("templateId", ""),
        "templateName": doc.get("templateName", ""),
        "status": doc.get("status", ""),
    }
    for field in ("endReason", "costUsd", "accessUrl"):
        if field in doc:
            result[field] = doc[field]
    for ts_field in ("createdAt", "expiresAt", "endedAt", "readyAt"):
        val = doc.get(ts_field)
        if val is not None:
            if isinstance(val, datetime):
                result[ts_field] = _to_rfc3339(val)
            else:
                result[ts_field] = val
    return result


# ---------------------------------------------------------------------------
# Launch (§9.1)
# ---------------------------------------------------------------------------

def launch(uid: str, email: str, template: dict) -> dict[str, Any]:
    """
    Create a new lab session and fire off the Cloud Run create.

    Returns the Session dict (status='starting').

    Raises:
      409 ValueError("active_session:<sessionId>") — user already has a lab
      403 ValueError("launches_disabled")
      429 ValueError("capacity_full")
      502 RuntimeError("provision_failed:<reason>")
    """
    if not settings.LAUNCHES_ENABLED:
        raise ValueError("launches_disabled")

    db = _get_db()

    # Check global concurrent lab cap
    active_count = len(db.collection("activeSessions").list_documents())
    if active_count >= settings.MAX_CONCURRENT_LABS:
        raise ValueError("capacity_full")

    session_id = _new_session_id()
    token = secrets.token_hex(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    now = _now()
    expires_at = now + timedelta(minutes=template["durationMinutes"])
    service_name = f"lab-{session_id}"

    session_doc = {
        "uid": uid,
        "email": email,
        "templateId": template["id"],
        "templateName": template["name"],
        "serviceName": service_name,
        "url": None,
        "status": "starting",
        "endReason": None,
        "createdAt": now,
        "readyAt": None,
        "expiresAt": expires_at,
        "endedAt": None,
        "cpu": template["cpu"],
        "memoryGiB": str(template["memory"]),
        "costUsd": None,
    }
    active_doc = {
        "sessionId": session_id,
        "templateId": template["id"],
        "serviceName": service_name,
        "url": None,
        "status": "starting",
        "createdAt": now,
        "expiresAt": expires_at,
    }
    secret_doc = {"token": token_hash, "plaintext": token}

    # Firestore transaction: one-lab-per-user lock (§9.1 step 4)
    active_ref = db.collection("activeSessions").document(uid)

    @firestore.transactional
    def _txn(transaction: firestore.Transaction) -> None:
        snap = active_ref.get(transaction=transaction)
        if snap.exists:
            existing_id = snap.get("sessionId")
            raise ValueError(f"active_session:{existing_id}")

        transaction.set(active_ref, active_doc)
        transaction.set(
            db.collection("sessions").document(session_id), session_doc
        )
        transaction.set(
            db.collection("sessionSecrets").document(session_id), secret_doc
        )

    transaction = db.transaction()
    _txn(transaction)

    # Build env vars for the container (§8.2)
    env_vars = {
        "TEAL_SESSION_ID": session_id,
        "TEAL_TOKEN_SHA256": token_hash,
        "TEAL_EXPIRES_AT": _to_rfc3339(expires_at),
        "TEAL_API_URL": settings.PUBLIC_URL,
        "TEAL_DASHBOARD_URL": settings.FRONTEND_ORIGIN,
    }

    # Fire-and-forget Cloud Run create (§9.1 step 5)
    try:
        provisioner.create(session_id, template, env_vars)
    except Exception as exc:
        logger.error("provision failed session=%s: %s", session_id, exc)
        _end_session(session_id, uid, "failed", now)
        raise RuntimeError(f"provision_failed:{exc}") from exc

    logger.info(
        '{"event":"lab.launch","session":"%s","uid":"%s","template":"%s"}',
        session_id, uid, template["id"],
    )

    session_doc["id"] = session_id
    return _session_to_dict(session_doc, session_id)


# ---------------------------------------------------------------------------
# Get active session for a user
# ---------------------------------------------------------------------------

def get_active_session(uid: str) -> dict[str, Any] | None:
    """Return the active session for uid, or None."""
    db = _get_db()
    snap = db.collection("activeSessions").document(uid).get()
    if not snap.exists:
        return None
    active = snap.to_dict()
    session_id = active["sessionId"]
    session_snap = db.collection("sessions").document(session_id).get()
    if not session_snap.exists:
        return None
    return _session_to_dict(session_snap.to_dict(), session_id)


# ---------------------------------------------------------------------------
# Ready check (§9.2) — called by GET /api/session when status=starting
# ---------------------------------------------------------------------------

def ready_check(session_id: str, uid: str) -> dict[str, Any]:
    """
    If the Cloud Run service is ready, transition status to 'running'
    and attach the accessUrl. Returns the updated session.
    """
    db = _get_db()
    session_ref = db.collection("sessions").document(session_id)
    session_snap = session_ref.get()
    if not session_snap.exists:
        raise KeyError(session_id)

    doc = session_snap.to_dict()
    if doc["status"] != "starting":
        return _session_to_dict(doc, session_id)

    service_name = doc["serviceName"]
    is_ready, url = provisioner.status(service_name)

    if not is_ready:
        return _session_to_dict(doc, session_id)

    # Retrieve the plaintext token to build the access URL
    secret_snap = db.collection("sessionSecrets").document(session_id).get()
    plaintext_token = secret_snap.to_dict().get("plaintext", "") if secret_snap.exists else ""
    access_url = f"{url}/#t={plaintext_token}" if plaintext_token else url

    now = _now()
    updates = {
        "status": "running",
        "readyAt": now,
        "url": url,
    }
    session_ref.update(updates)
    db.collection("activeSessions").document(uid).update({
        "status": "running",
        "url": url,
    })

    startup_s = (now - doc["createdAt"]).total_seconds() if isinstance(doc["createdAt"], datetime) else 0
    logger.info(
        '{"event":"lab.ready","session":"%s","startup_s":%.1f}',
        session_id, startup_s,
    )

    doc.update(updates)
    result = _session_to_dict(doc, session_id)
    result["accessUrl"] = access_url
    return result


# ---------------------------------------------------------------------------
# End session (§9.3) — used by every end path
# ---------------------------------------------------------------------------

def _end_session(
    session_id: str, uid: str, reason: EndReason, created_at: datetime | None = None
) -> dict[str, Any]:
    """Internal implementation of end logic."""
    db = _get_db()
    session_ref = db.collection("sessions").document(session_id)
    active_ref = db.collection("activeSessions").document(uid)
    secret_ref = db.collection("sessionSecrets").document(session_id)

    # Mark as 'ending'
    session_ref.update({"status": "ending"})

    # Delete the Cloud Run service (step 2)
    snap = session_ref.get()
    doc = snap.to_dict() if snap.exists else {}
    service_name = doc.get("serviceName", f"lab-{session_id}")

    try:
        provisioner.delete(service_name)
    except Exception as exc:
        logger.error(
            "provisioner.delete failed session=%s service=%s: %s",
            session_id, service_name, exc,
        )
        # Don't re-raise — reaper will retry

    now = _now()
    ca = created_at or doc.get("createdAt") or now
    cpu = doc.get("cpu", "1")
    memory = doc.get("memoryGiB", "1Gi")

    if isinstance(ca, datetime):
        cost = calculate_cost(cpu, memory, ca, now)
    else:
        cost = 0.0

    # Batch update (step 3)
    batch = db.batch()
    batch.update(session_ref, {
        "status": "ended",
        "endReason": reason,
        "endedAt": now,
        "costUsd": cost,
    })
    batch.delete(active_ref)
    batch.delete(secret_ref)
    batch.commit()

    logger.info(
        '{"event":"lab.end","session":"%s","reason":"%s","cost_usd":%.6f}',
        session_id, reason, cost,
    )

    doc.update({"status": "ended", "endReason": reason, "endedAt": now, "costUsd": cost})
    return _session_to_dict(doc, session_id)


def end_session(uid: str, reason: EndReason = "user") -> dict[str, Any]:
    """
    End the active session for uid (called from DELETE /api/session).
    Raises KeyError if no active session exists.
    """
    db = _get_db()
    snap = db.collection("activeSessions").document(uid).get()
    if not snap.exists:
        raise KeyError("no_active_session")
    session_id = snap.to_dict()["sessionId"]
    return _end_session(session_id, uid, reason)


def end_session_by_id(session_id: str, reason: EndReason) -> dict[str, Any]:
    """
    End a specific session by ID (used by reaper and lab callback).
    """
    db = _get_db()
    snap = db.collection("sessions").document(session_id).get()
    if not snap.exists:
        raise KeyError(session_id)
    uid = snap.to_dict().get("uid", "")
    return _end_session(session_id, uid, reason)


# ---------------------------------------------------------------------------
# Lab token verification (§6.3, used by POST /api/labs/{id}/end)
# ---------------------------------------------------------------------------

def verify_lab_token(session_id: str, token: str) -> bool:
    """
    Return True if the token matches the stored hash for this session.
    Uses constant-time comparison.
    """
    import hmac as _hmac

    db = _get_db()
    snap = db.collection("sessionSecrets").document(session_id).get()
    if not snap.exists:
        return False
    stored_hash = snap.to_dict().get("token", "")
    provided_hash = hashlib.sha256(token.encode()).hexdigest()
    return _hmac.compare_digest(stored_hash, provided_hash)


# ---------------------------------------------------------------------------
# Session history (§8.1 GET /api/sessions/history)
# ---------------------------------------------------------------------------

def get_history(uid: str, limit: int = 10) -> list[dict[str, Any]]:
    """Return the last `limit` sessions for uid, newest first."""
    db = _get_db()
    query = (
        db.collection("sessions")
        .where("uid", "==", uid)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    results = []
    for snap in query.stream():
        results.append(_session_to_dict(snap.to_dict(), snap.id))
    return results


# ---------------------------------------------------------------------------
# Reaper (§9.4) — called by POST /internal/reap
# ---------------------------------------------------------------------------

def reap() -> dict[str, int]:
    """
    Scan activeSessions and reconcile with running Cloud Run services.
    Returns counts: {expired, failed, deleted, orphans}.
    """
    db = _get_db()
    now = _now()

    counts = {"expired": 0, "failed": 0, "deleted": 0, "orphans": 0}

    # List all lab services once
    try:
        live_services = set(provisioner.list_labs())
    except Exception as exc:
        logger.error("reaper: list_labs failed: %s", exc)
        live_services = set()

    active_sessions = {}
    for snap in db.collection("activeSessions").stream():
        active_sessions[snap.id] = snap.to_dict()

    for uid, active in active_sessions.items():
        session_id = active.get("sessionId", "")
        status = active.get("status", "")
        created_at = active.get("createdAt")
        expires_at = active.get("expiresAt")
        service_name = active.get("serviceName", f"lab-{session_id}")

        # Normalise timestamps
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if isinstance(created_at, datetime) and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        try:
            if status == "starting":
                # Check if ready; if still starting after 5 min → failed
                _do_ready_check(db, session_id, uid)
                age = (now - created_at).total_seconds() if created_at else 0
                if age > 300:
                    logger.warning("reaper: session=%s still starting after 5m, marking failed", session_id)
                    end_session_by_id(session_id, "failed")
                    counts["failed"] += 1

            elif status == "ending":
                # Retry the end
                end_session_by_id(session_id, "deleted")
                counts["deleted"] += 1

            elif expires_at and now > expires_at:
                end_session_by_id(session_id, "expired")
                counts["expired"] += 1

            elif status == "running":
                # Service missing from live list and session is > 2 min old
                age = (now - created_at).total_seconds() if created_at else 0
                if service_name not in live_services and age > 120:
                    logger.info("reaper: session=%s service gone externally", session_id)
                    end_session_by_id(session_id, "deleted")
                    counts["deleted"] += 1

        except Exception as exc:
            logger.error("reaper: error handling session=%s: %s", session_id, exc)

    # Orphan sweep: lab services with no active session, older than 2 min
    active_service_names = {
        v.get("serviceName", "") for v in active_sessions.values()
    }
    for service_name in live_services:
        if service_name not in active_service_names:
            # Check age via the service's label / creation time isn't available
            # from list — use a simple heuristic: always delete unknown services
            logger.info("reaper: orphan service=%s, deleting", service_name)
            try:
                provisioner.delete(service_name)
                counts["orphans"] += 1
            except Exception as exc:
                logger.error("reaper: could not delete orphan %s: %s", service_name, exc)

    logger.info(
        '{"event":"reap.summary","expired":%d,"failed":%d,"deleted":%d,"orphans":%d}',
        counts["expired"], counts["failed"], counts["deleted"], counts["orphans"],
    )
    return counts


def _do_ready_check(db: firestore.Client, session_id: str, uid: str) -> None:
    """Internal ready check used by the reaper."""
    session_ref = db.collection("sessions").document(session_id)
    snap = session_ref.get()
    if not snap.exists:
        return
    doc = snap.to_dict()
    if doc["status"] != "starting":
        return

    service_name = doc["serviceName"]
    is_ready, url = provisioner.status(service_name)
    if not is_ready:
        return

    now = _now()
    session_ref.update({"status": "running", "readyAt": now, "url": url})
    db.collection("activeSessions").document(uid).update({
        "status": "running", "url": url
    })
