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
try:
    from . import cost
except ImportError:
    cost = None

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
    active_count = db.collection("activeSessions").count().get()[0][0].value
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
        try:
            end_session(uid, reason="failed")
        except Exception as cleanup_exc:
            logger.error(
                "failed launch cleanup failed session=%s: %s",
                session_id,
                cleanup_exc,
            )
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
    doc = session_snap.to_dict()
    result = _session_to_dict(doc, session_id)
    if result.get("status") == "running" and not result.get("accessUrl") and doc.get("url"):
        secret_snap = db.collection("sessionSecrets").document(session_id).get()
        token = secret_snap.to_dict().get("plaintext", "") if secret_snap.exists else ""
        if token:
            result["accessUrl"] = f"{doc['url']}/#t={token}"
    return result


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


def list_active() -> list[dict[str, Any]]:
    """List all active sessions."""
    db = _get_db()
    results = []
    for snap in db.collection("activeSessions").stream():
        active = snap.to_dict()
        active["uid"] = snap.id
        results.append(active)
    return results

def check_ready(active: dict[str, Any]) -> bool:
    """Readiness check used by the reaper."""
    session_id = active["sessionId"]
    uid = active["uid"]
    db = _get_db()
    session_ref = db.collection("sessions").document(session_id)
    snap = session_ref.get()
    if not snap.exists:
        return False
    doc = snap.to_dict()
    if doc.get("status") != "starting":
        return False

    service_name = doc.get("serviceName", f"lab-{session_id}")
    is_ready, url = provisioner.status(service_name)
    if not is_ready:
        return False

    now = _now()
    session_ref.update({"status": "running", "readyAt": now, "url": url})
    db.collection("activeSessions").document(uid).update({
        "status": "running", "url": url
    })
    return True

def end(active: dict[str, Any], reason: EndReason) -> dict[str, Any]:
    """
    End an active session. Sets status to ending on both docs, deletes service.
    If delete succeeds, marks as ended.
    """
    session_id = active.get("sessionId", "")
    uid = active.get("uid", "")
    if not session_id or not uid:
        raise KeyError("Invalid active dict")

    db = _get_db()
    session_ref = db.collection("sessions").document(session_id)
    active_ref = db.collection("activeSessions").document(uid)
    secret_ref = db.collection("sessionSecrets").document(session_id)

    # Set ending on both docs
    session_ref.update({"status": "ending"})
    if active_ref.get().exists:
        active_ref.update({"status": "ending"})

    snap = session_ref.get()
    doc = snap.to_dict() if snap.exists else {}
    service_name = doc.get("serviceName", f"lab-{session_id}")

    try:
        provisioner.delete(service_name)
    except Exception as exc:
        logger.error("provisioner.delete failed session=%s service=%s: %s", session_id, service_name, exc)
        return _session_to_dict(doc, session_id)

    now = _now()
    ca = doc.get("createdAt") or now
    cpu = doc.get("cpu", "1")
    memory = doc.get("memoryGiB", "1Gi")

    cost_val = 0.0
    if isinstance(ca, datetime) and cost:
        cost_val = cost.session_cost(cpu, memory, ca, now)

    batch = db.batch()
    batch.update(session_ref, {
        "status": "ended",
        "endReason": reason,
        "endedAt": now,
        "costUsd": cost_val,
    })
    batch.delete(active_ref)
    batch.delete(secret_ref)
    batch.commit()

    logger.info('{"event":"lab.end","session":"%s","reason":"%s","cost_usd":%.6f}', session_id, reason, cost_val)
    doc.update({"status": "ended", "endReason": reason, "endedAt": now, "costUsd": cost_val})
    return _session_to_dict(doc, session_id)


def end_session(uid: str, reason: EndReason = "user") -> dict[str, Any]:
    db = _get_db()
    snap = db.collection("activeSessions").document(uid).get()
    if not snap.exists:
        raise KeyError("no_active_session")
    active = snap.to_dict()
    active["uid"] = uid
    return end(active, reason)


def end_session_by_id(session_id: str, reason: EndReason) -> dict[str, Any]:
    db = _get_db()
    snap = db.collection("sessions").document(session_id).get()
    if not snap.exists:
        raise KeyError(session_id)
    doc = snap.to_dict()
    uid = doc.get("uid", "")
    active_snap = db.collection("activeSessions").document(uid).get()
    active = active_snap.to_dict() if active_snap.exists else {"sessionId": session_id, "uid": uid}
    active["uid"] = uid
    return end(active, reason)


def verify_lab_token(session_id: str, token: str) -> bool:
    import hmac as _hmac
    db = _get_db()
    snap = db.collection("sessionSecrets").document(session_id).get()
    if not snap.exists:
        return False
    stored_hash = snap.to_dict().get("token", "")
    provided_hash = hashlib.sha256(token.encode()).hexdigest()
    return _hmac.compare_digest(stored_hash, provided_hash)
