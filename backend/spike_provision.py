"""
backend/spike_provision.py
--------------------------
Phase 0 / Spike 2: proves that the Cloud Run Admin API v2 works from Python
with the teal-api service account's permissions.

Run in Cloud Shell (after setting up IAM from §12.4):
    cd ~/TEAL/backend
    python3 -m venv .venv && source .venv/bin/activate
    pip install google-cloud-run
    python3 spike_provision.py

What it does:
  1. Creates ONE lab service with the §5.4 settings (linux image)
  2. Polls until ready, prints URL + startup time
  3. Deletes the service
  4. Repeats with 10 services in parallel

Pass conditions (from §14 Phase 0 Spike 2):
  [ ] One service is ready in < 60 s
  [ ] 10 parallel creates succeed
  [ ] invoker_iam_disabled makes the URL publicly reachable
"""

import asyncio
import hashlib
import os
import random
import secrets
import string
import time

# pyrefly: ignore [missing-import]
from google.cloud import run_v2
from google.protobuf import duration_pb2

# ---------------------------------------------------------------------------
# Config — edit these before running
# ---------------------------------------------------------------------------
PROJECT = os.environ.get("PROJECT", "bold-future-510804-q8")
REGION = os.environ.get("REGION", "asia-south1")
IMAGE_REPO = os.environ.get(
    "IMAGE_REPO", f"asia-south1-docker.pkg.dev/{PROJECT}/teal"
)
# Use linux-term:v2 once built; fall back to the public hello image before that
LAB_IMAGE = os.environ.get(
    "LAB_IMAGE",
    # Swap in the real image once `gcloud builds submit` has been run:
    # f"{IMAGE_REPO}/linux-term:v2"
    "us-docker.pkg.dev/cloudrun/container/hello",  # public placeholder
)
LAB_SA = os.environ.get(
    "LAB_SA", f"teal-lab-runtime@{PROJECT}.iam.gserviceaccount.com"
)
# ---------------------------------------------------------------------------


def _random_session_id() -> str:
    """10-char id: first char a letter, rest letters/digits."""
    first = random.choice(string.ascii_lowercase)
    rest = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return first + rest


def _build_service(session_id: str, token: str) -> run_v2.Service:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = time.strftime(
        "%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 3600)
    )
    env = {
        "TEAL_SESSION_ID": session_id,
        "TEAL_TOKEN_SHA256": token_hash,
        "TEAL_EXPIRES_AT": expires_at,
        "TEAL_API_URL": "https://placeholder.run.app",
        "TEAL_DASHBOARD_URL": "https://teal.example.com/dashboard",
        "TEAL_LAB_INFO": '{"name":"Linux Lab","description":"Spike test","interface":"terminal","tools":[],"cpu":"1","memory":"1Gi"}',
    }
    return run_v2.Service(
        labels={
            "teal-lab": "true",
            "teal-session": session_id,
            "teal-template": "linux",
        },
        ingress=run_v2.IngressTraffic.INGRESS_TRAFFIC_ALL,
        invoker_iam_disabled=True,
        template=run_v2.RevisionTemplate(
            service_account=LAB_SA,
            execution_environment=run_v2.ExecutionEnvironment.EXECUTION_ENVIRONMENT_GEN2,
            timeout=duration_pb2.Duration(seconds=3600),
            max_instance_request_concurrency=50,
            session_affinity=True,
            scaling=run_v2.RevisionScaling(
                min_instance_count=1, max_instance_count=1
            ),
            containers=[
                run_v2.Container(
                    image=LAB_IMAGE,
                    ports=[run_v2.ContainerPort(container_port=8080)],
                    resources=run_v2.ResourceRequirements(
                        limits={"cpu": "1", "memory": "1Gi"},
                        cpu_idle=False,
                        startup_cpu_boost=True,
                    ),
                    env=[
                        run_v2.EnvVar(name=k, value=v) for k, v in env.items()
                    ],
                    startup_probe=run_v2.Probe(
                        period_seconds=2,
                        failure_threshold=60,
                        tcp_socket=run_v2.TCPSocketAction(port=8080),
                    ),
                )
            ],
        ),
    )


def provision_one(label: str = "") -> dict:
    """Create one service, poll until ready, delete it. Returns timing info."""
    client = run_v2.ServicesClient()
    parent = f"projects/{PROJECT}/locations/{REGION}"

    session_id = _random_session_id()
    service_name = f"lab-{session_id}"
    token = secrets.token_hex(32)
    tag = f"[{label or service_name}]"

    print(f"{tag} Creating service {service_name} ...")
    t0 = time.time()

    service = _build_service(session_id, token)
    # Fire-and-forget (don't call operation.result())
    client.create_service(
        parent=parent,
        service=service,
        service_id=service_name,
    )

    # Poll until ready
    full_name = f"{parent}/services/{service_name}"
    url = None
    while True:
        svc = client.get_service(name=full_name)
        ready = (
            not svc.reconciling
            and svc.uri
            and len(svc.conditions) > 0
            and all(c.state == run_v2.Condition.State.CONDITION_SUCCEEDED for c in svc.conditions)
        )
        if ready:
            url = svc.uri
            break
        elapsed = time.time() - t0
        if elapsed > 120:
            raise TimeoutError(f"{tag} Service not ready after 120s")
        print(f"{tag}   ... still starting ({elapsed:.0f}s elapsed)")
        time.sleep(2)

    elapsed = time.time() - t0
    print(f"{tag} READY in {elapsed:.1f}s  →  {url}/#t={token}")

    # Verify the URL is publicly reachable (just a HEAD request)
    import urllib.request
    try:
        # Without the token the gateway returns 401, but the service IS reachable
        req = urllib.request.Request(url + "/", method="HEAD")
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"{tag} HTTP {r.status} from {url}/  (expected 401 without token)")
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print(f"{tag} HTTP 401 from {url}/  ✓ (service is public, token required)")
        else:
            print(f"{tag} HTTP {e.code} — unexpected but service is reachable")
    except Exception as e:
        print(f"{tag} Could not reach URL: {e}")

    # Delete
    print(f"{tag} Deleting {service_name} ...")
    client.delete_service(name=full_name)
    print(f"{tag} Deleted.")

    return {"session_id": session_id, "elapsed_s": elapsed, "url": url}


def test_single():
    print("=" * 60)
    print("SPIKE 2 — Single service provisioning test")
    print("=" * 60)
    result = provision_one("single")
    print(f"\n✓ Single test passed — ready in {result['elapsed_s']:.1f}s\n")


def test_parallel(n: int = 10):
    print("=" * 60)
    print(f"SPIKE 2 — Parallel provisioning test ({n} services)")
    print("=" * 60)

    import concurrent.futures

    t0 = time.time()
    results = []
    errors = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=n) as executor:
        futures = {
            executor.submit(provision_one, f"par-{i+1}"): i for i in range(n)
        }
        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                errors.append(str(e))
                print(f"ERROR: {e}")

    total = time.time() - t0
    print(f"\n{'='*60}")
    print(f"Parallel test done in {total:.1f}s total")
    print(f"  Succeeded: {len(results)}/{n}")
    if results:
        times = [r["elapsed_s"] for r in results]
        print(f"  Startup times: min={min(times):.1f}s  max={max(times):.1f}s  avg={sum(times)/len(times):.1f}s")
    if errors:
        print(f"  Errors ({len(errors)}):")
        for e in errors:
            print(f"    - {e}")
    print("=" * 60)


if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "single"

    if mode == "single":
        test_single()
    elif mode == "parallel":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        test_parallel(n)
    elif mode == "both":
        test_single()
        test_parallel(10)
    else:
        print(f"Usage: python3 spike_provision.py [single|parallel [N]|both]")
        sys.exit(1)
