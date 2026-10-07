import json
import logging
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import reaper
from app.reaper import ActiveSession, LabService, ReapSummary, reap

NOW = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
SCHED = "teal-scheduler@proj.iam.gserviceaccount.com"
PUBLIC_URL = "https://teal-api-abc.asia-south1.run.app"


# --------------------------------------------------------------------------- #
# Fakes
# --------------------------------------------------------------------------- #


class FakeProvisioner:
    def __init__(self, labs=(), fail_delete=(), fail_list=False):
        self.labs = list(labs)
        self.fail_delete = set(fail_delete)
        self.fail_list = fail_list
        self.deleted = []

    def list_labs(self):
        if self.fail_list:
            raise RuntimeError("run api down")
        return list(self.labs)

    def delete(self, name):
        if name in self.fail_delete:
            raise RuntimeError(f"delete {name} failed")
        self.deleted.append(name)


class FakeSessions:
    def __init__(self, active=(), ready=(), fail_end=(), fail_ready=(), fail_list=False):
        self.active = list(active)
        self.ready = set(ready)
        self.fail_end = set(fail_end)
        self.fail_ready = set(fail_ready)
        self.fail_list = fail_list
        self.ready_checked = []
        self.ended = []

    def list_active(self):
        if self.fail_list:
            raise RuntimeError("firestore down")
        return list(self.active)

    def check_ready(self, active):
        self.ready_checked.append(active.session_id)
        if active.session_id in self.fail_ready:
            raise RuntimeError("get_service failed")
        return active.session_id in self.ready

    def end(self, active, reason):
        if active.session_id in self.fail_end:
            raise RuntimeError("end failed")
        self.ended.append((active.session_id, reason))


def session(sid, status="running", age=timedelta(minutes=10), expires_in=timedelta(minutes=50)):
    created = NOW - age
    return ActiveSession(
        uid=f"uid-{sid}",
        session_id=sid,
        service_name=f"lab-{sid}",
        status=status,
        created_at=created,
        expires_at=NOW + expires_in,
    )


def lab(sid, age=timedelta(minutes=10), full_name=False):
    name = f"projects/p/locations/asia-south1/services/lab-{sid}" if full_name else f"lab-{sid}"
    return LabService(name=name, session_id=sid, create_time=NOW - age)


# --------------------------------------------------------------------------- #
# reap() branches
# --------------------------------------------------------------------------- #


def test_healthy_running_session_is_left_alone():
    prov = FakeProvisioner([lab("a")])
    sess = FakeSessions([session("a")])
    summary = reap(NOW, prov, sess)
    assert summary == ReapSummary()
    assert sess.ended == [] and prov.deleted == []


def test_expired_running_session_is_ended_expired():
    prov = FakeProvisioner([lab("a")])
    sess = FakeSessions([session("a", expires_in=-timedelta(seconds=1))])
    summary = reap(NOW, prov, sess)
    assert sess.ended == [("a", "expired")]
    assert summary.expired == 1 and summary.errors == 0


def test_expiry_boundary_is_inclusive():
    sess = FakeSessions([session("a", expires_in=timedelta(0))])
    reap(NOW, FakeProvisioner([lab("a")]), sess)
    assert sess.ended == [("a", "expired")]


def test_starting_session_becomes_ready():
    sess = FakeSessions([session("a", status="starting", age=timedelta(minutes=1))], ready={"a"})
    summary = reap(NOW, FakeProvisioner([lab("a")]), sess)
    assert sess.ready_checked == ["a"]
    assert sess.ended == []
    assert summary == ReapSummary()


def test_starting_session_not_ready_within_timeout_is_kept():
    sess = FakeSessions([session("a", status="starting", age=timedelta(minutes=4))])
    summary = reap(NOW, FakeProvisioner([lab("a")]), sess)
    assert sess.ready_checked == ["a"]
    assert sess.ended == []
    assert summary == ReapSummary()


def test_starting_session_times_out_as_failed():
    sess = FakeSessions([session("a", status="starting", age=timedelta(minutes=5, seconds=1))])
    summary = reap(NOW, FakeProvisioner([lab("a")]), sess)
    assert sess.ended == [("a", "failed")]
    assert summary.failed == 1


def test_starting_session_without_service_is_not_ended_as_deleted():
    # A starting session's service may not be listed yet; only the 5 min timeout applies.
    sess = FakeSessions([session("a", status="starting", age=timedelta(minutes=3))])
    reap(NOW, FakeProvisioner([]), sess)
    assert sess.ended == []


def test_ready_session_whose_service_is_missing_counts_as_running():
    sess = FakeSessions([session("a", status="starting", age=timedelta(minutes=3))], ready={"a"})
    summary = reap(NOW, FakeProvisioner([]), sess)
    assert sess.ended == [("a", "deleted")]
    assert summary.deleted == 1


def test_ending_session_is_retried_as_failed_before_expiry():
    sess = FakeSessions([session("a", status="ending")])
    summary = reap(NOW, FakeProvisioner([lab("a")]), sess)
    assert sess.ended == [("a", "failed")]
    assert summary.failed == 1


def test_ending_session_is_retried_as_expired_after_expiry():
    sess = FakeSessions([session("a", status="ending", expires_in=-timedelta(minutes=1))])
    summary = reap(NOW, FakeProvisioner([]), sess)
    assert sess.ended == [("a", "expired")]
    assert summary.expired == 1


def test_running_session_with_missing_service_is_ended_deleted():
    sess = FakeSessions([session("a", age=timedelta(minutes=2, seconds=1))])
    summary = reap(NOW, FakeProvisioner([lab("other", age=timedelta(seconds=30))]), sess)
    assert sess.ended == [("a", "deleted")]
    assert summary.deleted == 1


def test_young_running_session_with_missing_service_is_kept():
    sess = FakeSessions([session("a", age=timedelta(minutes=1))])
    summary = reap(NOW, FakeProvisioner([]), sess)
    assert sess.ended == []
    assert summary == ReapSummary()


def test_service_matched_by_full_resource_name():
    sess = FakeSessions([session("a")])
    reap(NOW, FakeProvisioner([lab("a", full_name=True)]), sess)
    assert sess.ended == []


def test_orphan_sweep_deletes_old_labs_only():
    prov = FakeProvisioner(
        [
            lab("a"),  # has an active session
            lab("old", age=timedelta(minutes=3)),  # orphan, old -> deleted
            lab("young", age=timedelta(minutes=1)),  # orphan, too young -> kept
            LabService(name="lab-nolabel", session_id=None, create_time=NOW - timedelta(hours=1)),
        ]
    )
    sess = FakeSessions([session("a")])
    summary = reap(NOW, prov, sess)
    assert prov.deleted == ["lab-old", "lab-nolabel"]
    assert summary.orphans == 2
    assert sess.ended == []


def test_lab_of_session_ended_this_pass_is_not_double_deleted():
    prov = FakeProvisioner([lab("a")])
    sess = FakeSessions([session("a", expires_in=-timedelta(minutes=1))])
    summary = reap(NOW, prov, sess)
    assert sess.ended == [("a", "expired")]
    assert prov.deleted == []  # end() deletes the service itself
    assert summary.orphans == 0


def test_one_failing_session_does_not_stop_the_others():
    sess = FakeSessions(
        [
            session("bad", expires_in=-timedelta(minutes=1)),
            session("flaky", status="starting", age=timedelta(minutes=1)),
            session("b", expires_in=-timedelta(minutes=1)),
            session("c", status="starting", age=timedelta(minutes=6)),
        ],
        fail_end={"bad"},
        fail_ready={"flaky"},
    )
    prov = FakeProvisioner([lab("bad"), lab("flaky"), lab("b"), lab("c")])
    summary = reap(NOW, prov, sess)
    assert sess.ended == [("b", "expired"), ("c", "failed")]
    assert summary == ReapSummary(expired=1, failed=1, errors=2)


def test_one_failing_orphan_delete_does_not_stop_the_others():
    prov = FakeProvisioner([lab("x"), lab("y"), lab("z")], fail_delete={"lab-y"})
    summary = reap(NOW, prov, FakeSessions([]))
    assert prov.deleted == ["lab-x", "lab-z"]
    assert summary.orphans == 2 and summary.errors == 1


def test_list_labs_failure_skips_deleted_check_and_orphan_sweep():
    sess = FakeSessions([session("a"), session("b", expires_in=-timedelta(minutes=1))])
    prov = FakeProvisioner(fail_list=True)
    summary = reap(NOW, prov, sess)
    assert sess.ended == [("b", "expired")]  # expiry still enforced
    assert summary == ReapSummary(expired=1, errors=1)


def test_list_active_failure_never_deletes_labs():
    prov = FakeProvisioner([lab("a", age=timedelta(hours=1))])
    summary = reap(NOW, prov, FakeSessions(fail_list=True))
    assert prov.deleted == []
    assert summary == ReapSummary(errors=1)


def test_dict_items_and_naive_datetimes_are_accepted():
    naive_now = NOW.replace(tzinfo=None)
    sess = FakeSessions([])
    sess.active = [
        {
            "uid": "u",
            "session_id": "a",
            "service_name": "lab-a",
            "status": "running",
            "created_at": naive_now - timedelta(minutes=70),
            "expires_at": naive_now - timedelta(minutes=10),
        }
    ]
    sess.end = lambda active, reason: sess.ended.append((active["session_id"], reason))
    prov = FakeProvisioner([])
    prov.labs = [{"name": "lab-q", "session_id": "q", "create_time": naive_now - timedelta(minutes=5)}]
    summary = reap(NOW, prov, sess)
    assert sess.ended == [("a", "expired")]
    assert prov.deleted == ["lab-q"]
    assert summary == ReapSummary(expired=1, orphans=1)


# --------------------------------------------------------------------------- #
# POST /internal/reap
# --------------------------------------------------------------------------- #


@pytest.fixture
def deps():
    return reaper.ReaperDeps(
        provisioner=FakeProvisioner([lab("a"), lab("orphan", age=timedelta(minutes=5))]),
        sessions=FakeSessions([session("a", expires_in=-timedelta(minutes=1))]),
    )


@pytest.fixture
def client(monkeypatch, deps):
    monkeypatch.setenv("PUBLIC_URL", PUBLIC_URL)
    monkeypatch.setenv("SCHEDULER_SA", SCHED)
    calls = {"deps": 0, "tokens": []}

    def fake_verifier(token):
        calls["tokens"].append(token)
        claims = {
            "good": {"email": SCHED, "email_verified": True, "aud": PUBLIC_URL},
            "other": {"email": "mallory@proj.iam.gserviceaccount.com", "email_verified": True},
            "unverified": {"email": SCHED, "email_verified": False},
        }
        if token not in claims:
            raise ValueError("Token used too late")
        return claims[token]

    def fake_deps():
        calls["deps"] += 1
        return deps

    app = FastAPI()
    app.include_router(reaper.router)
    app.dependency_overrides[reaper.get_token_verifier] = lambda: fake_verifier
    app.dependency_overrides[reaper.get_reaper_deps] = fake_deps
    app.dependency_overrides[reaper.get_now] = lambda: NOW
    c = TestClient(app)
    c.calls = calls
    return c


def test_endpoint_missing_token_is_401(client):
    r = client.post("/internal/reap")
    assert r.status_code == 401
    assert r.json() == {"error": "unauthenticated", "message": "Missing bearer token"}
    assert client.calls["deps"] == 0


def test_endpoint_non_bearer_is_401(client):
    r = client.post("/internal/reap", headers={"Authorization": "Basic good"})
    assert r.status_code == 401
    assert client.calls["tokens"] == []


def test_endpoint_invalid_token_is_401(client):
    r = client.post("/internal/reap", headers={"Authorization": "Bearer forged"})
    assert r.status_code == 401
    assert r.json()["error"] == "unauthenticated"
    assert client.calls["deps"] == 0


@pytest.mark.parametrize("token", ["other", "unverified"])
def test_endpoint_wrong_identity_is_403(client, token):
    r = client.post("/internal/reap", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
    assert r.json() == {"error": "forbidden", "message": "Caller is not the reaper scheduler"}
    assert client.calls["deps"] == 0


def test_endpoint_runs_reap_and_logs_summary(client, deps, caplog):
    with caplog.at_level(logging.INFO, logger="teal.reaper"):
        r = client.post("/internal/reap", headers={"Authorization": "bearer good"})
    assert r.status_code == 200
    assert r.json() == {"expired": 1, "failed": 0, "deleted": 0, "orphans": 1, "errors": 0}
    assert deps.sessions.ended == [("a", "expired")]
    assert deps.provisioner.deleted == ["lab-orphan"]

    lines = [json.loads(rec.getMessage()) for rec in caplog.records]
    summaries = [l for l in lines if l["event"] == "reap.summary"]
    assert summaries == [
        {
            "severity": "INFO",
            "event": "reap.summary",
            "message": "reap.summary",
            "expired": 1,
            "failed": 0,
            "deleted": 0,
            "orphans": 1,
            "errors": 0,
        }
    ]


def test_endpoint_without_scheduler_sa_configured_is_500(client, monkeypatch):
    monkeypatch.delenv("SCHEDULER_SA")
    r = client.post("/internal/reap", headers={"Authorization": "Bearer good"})
    assert r.status_code == 500
    assert r.json()["error"] == "server_misconfigured"


def test_default_verifier_uses_google_with_public_url_audience(monkeypatch):
    seen = {}

    def fake_verify(token, request, audience=None):
        seen.update(token=token, audience=audience, request=request)
        return {"email": SCHED, "email_verified": True}

    monkeypatch.setattr("google.oauth2.id_token.verify_oauth2_token", fake_verify)
    monkeypatch.setenv("PUBLIC_URL", PUBLIC_URL)
    verifier = reaper.get_token_verifier()
    assert verifier("tok")["email"] == SCHED
    assert seen["token"] == "tok" and seen["audience"] == PUBLIC_URL
    from google.auth.transport.requests import Request

    assert isinstance(seen["request"], Request)


def test_default_clock_is_aware_utc():
    now = reaper.get_now()
    assert now.tzinfo is not None and now.utcoffset() == timedelta(0)


def test_default_verifier_refuses_without_public_url():
    with pytest.raises(reaper.ReapError) as exc:
        reaper.get_token_verifier()("tok")
    assert exc.value.status_code == 500
