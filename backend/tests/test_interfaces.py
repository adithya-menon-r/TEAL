import json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app import catalog, main, provisioner, sessions
from app.auth import current_user
from app.config import settings

TEMPLATE = {
    "id": "linux",
    "name": "Linux Lab",
    "description": "d",
    "interfaces": [
        {"id": "terminal", "image": "linux-term:v2"},
        {"id": "vscode", "image": "linux-code:v1"},
    ],
    "tools": ["bash"],
    "cpu": "1",
    "memory": "1Gi",
    "durationMinutes": 60,
}


def _load(tmp_path, monkeypatch, entries):
    path = tmp_path / "catalog.json"
    path.write_text(json.dumps(entries))
    monkeypatch.setattr(settings, "CATALOG_PATH", str(path))
    catalog.load_catalog()


def _with(**changes):
    entry = {**TEMPLATE, **changes}
    return [entry]


# ---- catalog validation ---------------------------------------------------

@pytest.mark.parametrize(
    "interfaces",
    [
        [],
        "terminal",
        [{"id": "terminal"}],
        [{"id": "terminal", "image": ""}],
        [{"id": "emacs", "image": "x:v1"}],
        [{"id": "terminal", "image": "a:v1"}, {"id": "terminal", "image": "b:v1"}],
        ["terminal"],
    ],
)
def test_bad_interfaces_rejected(tmp_path, monkeypatch, interfaces):
    with pytest.raises(ValueError):
        _load(tmp_path, monkeypatch, _with(interfaces=interfaces))


def test_missing_interfaces_rejected(tmp_path, monkeypatch):
    entry = {k: v for k, v in TEMPLATE.items() if k != "interfaces"}
    with pytest.raises(ValueError, match="missing"):
        _load(tmp_path, monkeypatch, [entry])


def test_get_interface_default_and_lookup():
    assert catalog.get_interface(TEMPLATE)["id"] == "terminal"
    assert catalog.get_interface(TEMPLATE, "vscode")["image"] == "linux-code:v1"
    assert catalog.get_interface(TEMPLATE, "jupyter") is None


def test_real_catalog_is_valid(monkeypatch):
    from pathlib import Path

    monkeypatch.setattr(settings, "CATALOG_PATH", str(Path(__file__).resolve().parents[2] / "templates" / "catalog.json"))
    catalog.load_catalog()
    assert [t["id"] for t in catalog.get_templates()] == ["linux", "pfl", "nndl"]


# ---- API ------------------------------------------------------------------

@pytest.fixture
def client(tmp_path, monkeypatch):
    _load(tmp_path, monkeypatch, [TEMPLATE])
    main.app.dependency_overrides[current_user] = lambda: {"uid": "u1", "email": "u1@x.edu"}
    launch = MagicMock(side_effect=lambda uid, email, t, iface: {"id": "abc", "interface": iface})
    monkeypatch.setattr(sessions, "launch", launch)
    c = TestClient(main.app)
    c.launch = launch
    yield c
    main.app.dependency_overrides.clear()


def test_templates_lists_interface_ids_only(client):
    body = client.get("/api/templates").json()
    t = body["templates"][0]
    assert t["interfaces"] == ["terminal", "vscode"]
    assert "interface" not in t
    assert "linux-term" not in json.dumps(body)
    assert set(t) == {
        "id", "name", "description", "interfaces", "tools",
        "cpu", "memory", "durationMinutes", "approxCostUsd",
    }


def test_launch_defaults_to_first_interface(client):
    r = client.post("/api/sessions", json={"templateId": "linux"})
    assert r.status_code == 202
    assert r.json()["session"]["interface"] == "terminal"
    assert client.launch.call_args.args[3] == "terminal"


def test_launch_with_valid_interface(client):
    r = client.post("/api/sessions", json={"templateId": "linux", "interface": "vscode"})
    assert r.status_code == 202
    assert r.json()["session"]["interface"] == "vscode"


def test_launch_with_unknown_interface(client):
    r = client.post("/api/sessions", json={"templateId": "linux", "interface": "jupyter"})
    assert r.status_code == 400
    assert r.json()["error"] == "unknown_interface"
    assert "message" in r.json()
    client.launch.assert_not_called()


def test_session_dict_includes_interface_only_when_present():
    assert sessions._session_to_dict({"interface": "vscode"}, "s1")["interface"] == "vscode"
    assert "interface" not in sessions._session_to_dict({}, "s1")


# ---- provisioner ----------------------------------------------------------

@pytest.mark.parametrize(
    "interface_id,image",
    [(None, "linux-term:v2"), ("terminal", "linux-term:v2"), ("vscode", "linux-code:v1")],
)
def test_provisioner_uses_chosen_interface(monkeypatch, interface_id, image):
    fake = MagicMock()
    monkeypatch.setattr(provisioner, "_get_client", lambda: fake)
    monkeypatch.setattr(provisioner, "_parent", lambda: "projects/p/locations/l")
    provisioner.create("abc123", TEMPLATE, {"TEAL_SESSION_ID": "abc123"}, interface_id)

    service = fake.create_service.call_args.kwargs["service"]
    chosen = interface_id or "terminal"
    container = service.template.containers[0]
    assert container.image.endswith("/" + image)
    assert service.labels["teal-interface"] == chosen
    assert service.labels["teal-template"] == "linux"
    env = {e.name: e.value for e in container.env}
    assert json.loads(env["TEAL_LAB_INFO"])["interface"] == chosen


def test_provisioner_rejects_unknown_interface(monkeypatch):
    monkeypatch.setattr(provisioner, "_get_client", lambda: MagicMock())
    with pytest.raises(ValueError):
        provisioner.create("abc123", TEMPLATE, {}, "jupyter")
