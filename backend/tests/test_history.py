import sys
import types
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

from app import history

T0 = datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)
NAMES = {"linux": "Linux Lab", "nndl": "NNDL - Neural Networks & Deep Learning"}


def doc(i, uid="u1", **extra):
    created = T0 + timedelta(hours=i)
    d = {
        "id": f"s{i:02d}",
        "uid": uid,
        "email": f"{uid}@cb.students.amrita.edu",
        "templateId": "nndl" if i % 2 else "linux",
        "serviceName": f"lab-s{i:02d}",
        "url": f"https://lab-s{i:02d}-xyz.a.run.app",
        "status": "ended",
        "endReason": "user",
        "createdAt": created,
        "readyAt": created + timedelta(seconds=20),
        "expiresAt": created + timedelta(minutes=60),
        "endedAt": created + timedelta(minutes=30),
        "cpu": "2",
        "memoryGiB": 4.0,
        "costUsd": 0.0792,
    }
    d.update(extra)
    return d


class FakeStore:
    def __init__(self, docs):
        self.docs = docs
        self.calls = []

    def recent_sessions(self, uid, limit):
        self.calls.append((uid, limit))
        mine = [d for d in self.docs if d["uid"] == uid]
        mine.sort(key=lambda d: d["createdAt"], reverse=True)
        return mine[:limit]


def make_client(store, user=None, override_user=True):
    app = FastAPI()
    app.include_router(history.router)
    if override_user:
        app.dependency_overrides[history.get_current_user] = lambda: user or {
            "uid": "u1",
            "email": "u1@cb.students.amrita.edu",
        }
    app.dependency_overrides[history.get_history_store] = lambda: store
    app.dependency_overrides[history.get_template_name] = lambda: (lambda tid: NAMES.get(tid, tid))
    return TestClient(app)


def test_history_shape_and_fields():
    store = FakeStore([doc(1)])
    r = make_client(store).get("/api/sessions/history")
    assert r.status_code == 200
    assert r.json() == {
        "sessions": [
            {
                "id": "s01",
                "templateId": "nndl",
                "templateName": "NNDL - Neural Networks & Deep Learning",
                "status": "ended",
                "endReason": "user",
                "createdAt": "2026-10-01T10:00:00Z",
                "expiresAt": "2026-10-01T11:00:00Z",
                "endedAt": "2026-10-01T10:30:00Z",
                "costUsd": 0.0792,
            }
        ]
    }


def test_history_newest_first_limited_to_10_and_scoped_to_user():
    docs = [doc(i) for i in range(15)] + [doc(99, uid="someone-else")]
    store = FakeStore(docs)
    sessions = make_client(store).get("/api/sessions/history").json()["sessions"]
    assert store.calls == [("u1", 10)]
    assert [s["id"] for s in sessions] == [f"s{i:02d}" for i in range(14, 4, -1)]


def test_history_sorts_and_caps_even_if_store_does_not():
    class Unordered:
        def recent_sessions(self, uid, limit):
            return [doc(i) for i in (3, 11, 0, 7, 1, 2, 4, 5, 6, 8, 9, 10)]

    sessions = make_client(Unordered()).get("/api/sessions/history").json()["sessions"]
    assert len(sessions) == 10
    assert [s["id"] for s in sessions] == [f"s{i:02d}" for i in range(11, 1, -1)]


def test_history_never_leaks_url_or_token():
    leaky = doc(1, token="secret-token", accessUrl="https://lab/#t=secret-token")
    body = make_client(FakeStore([leaky])).get("/api/sessions/history").text
    assert "secret-token" not in body
    assert "lab-s01-xyz" not in body
    assert "accessUrl" not in body and '"url"' not in body
    assert "email" not in body and "uid" not in body


def test_history_active_session_omits_optional_fields():
    active = doc(1, status="running", endReason=None, endedAt=None, costUsd=None)
    s = make_client(FakeStore([active])).get("/api/sessions/history").json()["sessions"][0]
    assert s["status"] == "running"
    assert "endReason" not in s and "endedAt" not in s and "costUsd" not in s


def test_history_unknown_template_falls_back_to_id():
    s = make_client(FakeStore([doc(1, templateId="retired")])).get("/api/sessions/history").json()
    assert s["sessions"][0]["templateName"] == "retired"


def test_history_empty():
    assert make_client(FakeStore([])).get("/api/sessions/history").json() == {"sessions": []}


def test_history_uses_overridden_user():
    store = FakeStore([doc(1, uid="u2"), doc(2, uid="u1")])
    sessions = make_client(store, user={"uid": "u2", "email": "x"}).get("/api/sessions/history").json()
    assert [s["id"] for s in sessions["sessions"]] == ["s01"]


@pytest.fixture
def fake_auth_module(monkeypatch):
    """Install a stand-in app.auth so the default get_current_user can delegate."""
    import app as app_pkg

    mod = types.ModuleType("app.auth")

    def current_user(authorization=None):
        if authorization != "Bearer good":
            raise HTTPException(status_code=401, detail="unauthenticated")
        return {"uid": "u1", "email": "u1@cb.students.amrita.edu"}

    mod.current_user = current_user
    monkeypatch.setitem(sys.modules, "app.auth", mod)
    monkeypatch.setattr(app_pkg, "auth", mod, raising=False)
    return mod


def test_default_user_dependency_delegates_to_app_auth(fake_auth_module):
    client = make_client(FakeStore([doc(1)]), override_user=False)
    assert client.get("/api/sessions/history").status_code == 401
    r = client.get("/api/sessions/history", headers={"Authorization": "Bearer good"})
    assert r.status_code == 200
    assert [s["id"] for s in r.json()["sessions"]] == ["s01"]


def test_auth_dependency_can_be_overridden_with_a_real_fastapi_dependency():
    # The wiring recommended for main.py: overrides[get_current_user] = auth.current_user
    def current_user(authorization: str | None = Header(default=None)):
        if authorization != "Bearer good":
            raise HTTPException(status_code=401, detail="unauthenticated")
        return {"uid": "u1", "email": "e"}

    app = FastAPI()
    app.include_router(history.router)
    app.dependency_overrides[history.get_current_user] = current_user
    app.dependency_overrides[history.get_history_store] = lambda: FakeStore([doc(1)])
    app.dependency_overrides[history.get_template_name] = lambda: (lambda tid: tid)
    client = TestClient(app)
    assert client.get("/api/sessions/history").status_code == 401
    assert client.get("/api/sessions/history", headers={"Authorization": "Bearer good"}).status_code == 200


def test_default_template_namer_uses_app_catalog(monkeypatch):
    import app as app_pkg

    mod = types.ModuleType("app.catalog")
    mod.get_template = lambda tid: {"id": tid, "name": "PFL Lab"} if tid == "pfl" else None
    monkeypatch.setitem(sys.modules, "app.catalog", mod)
    monkeypatch.setattr(app_pkg, "catalog", mod, raising=False)
    namer = history.get_template_name()
    assert namer("pfl") == "PFL Lab"
    assert namer("missing") == "missing"


def test_default_template_namer_falls_back_when_catalog_missing(monkeypatch):
    monkeypatch.setitem(sys.modules, "app.catalog", None)  # makes the import fail
    assert history.get_template_name()("linux") == "linux"


def test_firestore_store_builds_expected_query():
    class FakeDoc:
        def __init__(self, id_, data):
            self.id, self._data = id_, data

        def to_dict(self):
            return self._data

    class FakeQuery:
        def __init__(self):
            self.ops = []

        def where(self, filter=None):
            self.ops.append(("where", filter.field_path, filter.op_string, filter.value))
            return self

        def order_by(self, field, direction=None):
            self.ops.append(("order_by", field, direction))
            return self

        def limit(self, n):
            self.ops.append(("limit", n))
            return self

        def stream(self):
            return iter([FakeDoc("s1", {"uid": "u1", "templateId": "linux"})])

    class FakeClient:
        def __init__(self):
            self.query = FakeQuery()

        def collection(self, name):
            assert name == "sessions"
            return self.query

    client = FakeClient()
    docs = history.FirestoreHistoryStore(client=client).recent_sessions("u1", 10)
    assert docs == [{"uid": "u1", "templateId": "linux", "id": "s1"}]
    assert client.query.ops == [
        ("where", "uid", "==", "u1"),
        ("order_by", "createdAt", "DESCENDING"),
        ("limit", 10),
    ]
