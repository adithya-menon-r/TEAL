"""`GET /api/sessions/history`: the current user's last 10 labs (PLAN.md §8.1).

Reads `sessions/{sessionId}` documents (§7) and returns them in the `Session`
shape, newest first. History never includes `accessUrl` or the lab token.

Collaborators are FastAPI dependencies so the router works (and is testable)
before the modules it delegates to exist:
  - get_current_user  -> app.auth.current_user  (lazy import)
  - get_template_name -> app.catalog.get_template (lazy import)
  - get_history_store -> FirestoreHistoryStore   (needs a composite index on
                         sessions: uid ASC, createdAt DESC)
"""

from __future__ import annotations

import inspect
import logging
import os
from collections.abc import Callable, Mapping
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Protocol

from fastapi import APIRouter, Depends, Request

logger = logging.getLogger("teal.history")

HISTORY_LIMIT = 10

router = APIRouter()


# --------------------------------------------------------------------------- #
# Data access
# --------------------------------------------------------------------------- #


class HistoryStore(Protocol):
    def recent_sessions(self, uid: str, limit: int) -> list[Mapping[str, Any]]:
        """Return up to `limit` sessions/{id} docs of `uid`, newest first.

        Each dict holds the document fields plus `id` (the document id)."""
        ...


class FirestoreHistoryStore:
    """sessions where uid == uid order by createdAt desc limit N."""

    def __init__(self, client: Any = None) -> None:
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            from google.cloud import firestore

            self._client = firestore.Client(project=os.environ.get("GCP_PROJECT") or None)
        return self._client

    def recent_sessions(self, uid: str, limit: int) -> list[Mapping[str, Any]]:
        from google.cloud import firestore
        from google.cloud.firestore_v1.base_query import FieldFilter

        query = (
            self.client.collection("sessions")
            .where(filter=FieldFilter("uid", "==", uid))
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )
        return [{**(doc.to_dict() or {}), "id": doc.id} for doc in query.stream()]


@lru_cache(maxsize=1)
def get_history_store() -> HistoryStore:
    """Dependency returning the store. Tests override it."""
    return FirestoreHistoryStore()


# --------------------------------------------------------------------------- #
# Current user and template names
# --------------------------------------------------------------------------- #


async def get_current_user(request: Request) -> Mapping[str, Any]:
    """Delegates to `app.auth.current_user` (returns {"uid", "email"}).

    `app.auth` is imported lazily. `current_user` is called with `request`
    and/or `authorization` (the Authorization header) depending on which of
    those parameters it declares. The cleanest wiring is for main.py to set
    `app.dependency_overrides[history.get_current_user] = auth.current_user`,
    which lets FastAPI resolve current_user's own dependencies.
    """
    from app import auth  # lazy: owned by another module

    func = auth.current_user
    params = inspect.signature(func).parameters
    kwargs: dict[str, Any] = {}
    if "request" in params:
        kwargs["request"] = request
    if "authorization" in params:
        kwargs["authorization"] = request.headers.get("Authorization")
    if not kwargs and params:
        kwargs[next(iter(params))] = request
    user = func(**kwargs)
    if inspect.isawaitable(user):
        user = await user
    return user


TemplateNamer = Callable[[str], str]


def _catalog_template_name(template_id: str) -> str:
    try:
        from app import catalog  # lazy: owned by another module

        template = catalog.get_template(template_id)
    except Exception:  # noqa: BLE001 - history must still render
        logger.warning("template lookup failed for %r", template_id, exc_info=True)
        return template_id
    if not template:
        return template_id
    name = template.get("name") if isinstance(template, Mapping) else getattr(template, "name", None)
    return name or template_id


def get_template_name() -> TemplateNamer:
    """Dependency returning templateId -> display name. Tests override it."""
    return _catalog_template_name


# --------------------------------------------------------------------------- #
# Serialisation
# --------------------------------------------------------------------------- #


def _rfc3339(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return str(value)


def _sort_key(doc: Mapping[str, Any]) -> datetime:
    value = doc.get("createdAt")
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.min.replace(tzinfo=timezone.utc)


def to_session(doc: Mapping[str, Any], template_name: TemplateNamer) -> dict[str, Any]:
    """Map a sessions/{id} document to the §8.1 `Session` shape.

    Only whitelisted fields are copied, so `url`, `accessUrl` and any token
    can never leak into history."""
    template_id = doc.get("templateId") or ""
    session: dict[str, Any] = {
        "id": doc.get("id"),
        "templateId": template_id,
        "templateName": template_name(template_id) if template_id else "",
        "status": doc.get("status"),
        "createdAt": _rfc3339(doc.get("createdAt")),
        "expiresAt": _rfc3339(doc.get("expiresAt")),
    }
    if doc.get("interface"):
        session["interface"] = doc["interface"]
    if doc.get("endReason"):
        session["endReason"] = doc["endReason"]
    ended_at = _rfc3339(doc.get("endedAt"))
    if ended_at:
        session["endedAt"] = ended_at
    if doc.get("costUsd") is not None:
        session["costUsd"] = float(doc["costUsd"])
    return session


@router.get("/api/sessions/history")
def session_history(
    user: Mapping[str, Any] = Depends(get_current_user),
    store: HistoryStore = Depends(get_history_store),
    template_name: TemplateNamer = Depends(get_template_name),
) -> dict[str, list[dict[str, Any]]]:
    uid = user["uid"] if isinstance(user, Mapping) else getattr(user, "uid")
    docs = list(store.recent_sessions(uid, HISTORY_LIMIT))
    docs.sort(key=_sort_key, reverse=True)
    return {"sessions": [to_session(d, template_name) for d in docs[:HISTORY_LIMIT]]}
