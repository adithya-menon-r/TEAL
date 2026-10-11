"""
backend/app/provisioner.py
--------------------------
Module 3: Cloud Run Admin API v2 wrapper.

Provides four functions used by sessions.py:
  create(session_id, template, env_vars) -> None   (fire-and-forget)
  status(service_name)                 -> (ready: bool, url: str | None)
  delete(service_name)                 -> None      (fire-and-forget)
  list_labs()                          -> list[str] (service names)

All calls use the teal-api service account's identity automatically
(Application Default Credentials on Cloud Run).
"""

import json
import logging

from google.api_core.exceptions import NotFound
from google.cloud import run_v2
from google.protobuf import duration_pb2

from .catalog import get_interface
from .config import settings

logger = logging.getLogger(__name__)

# Module-level client — one connection pool shared across requests
_client: run_v2.ServicesClient | None = None


def _get_client() -> run_v2.ServicesClient:
    global _client
    if _client is None:
        _client = run_v2.ServicesClient()
    return _client


def _parent() -> str:
    return f"projects/{settings.GCP_PROJECT}/locations/{settings.REGION}"


def _service_name(service_id: str) -> str:
    """Full resource name from a short service id like 'lab-k3j9x2m1qa'."""
    return f"{_parent()}/services/{service_id}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create(
    session_id: str,
    template: dict,
    env_vars: dict[str, str],
    interface_id: str | None = None,
) -> None:
    """
    Create a Cloud Run service for the lab session (§5.4).
    Does NOT wait for the operation to finish — readiness is checked later.

    Raises google.api_core.exceptions.GoogleAPIError on failure.
    """
    service_id = f"lab-{session_id}"
    iface = get_interface(template, interface_id)
    if iface is None:
        raise ValueError(f"Template '{template['id']}' has no interface '{interface_id}'")
    image = f"{settings.IMAGE_REPO}/{iface['image']}"

    lab_info = json.dumps({
        "name": template["name"],
        "description": template["description"],
        "interface": iface["id"],
        "tools": template["tools"],
        "cpu": template["cpu"],
        "memory": template["memory"],
    })

    all_env = dict(env_vars)
    all_env["TEAL_LAB_INFO"] = lab_info

    service = run_v2.Service(
        labels={
            "teal-lab": "true",
            "teal-session": session_id,
            "teal-template": template["id"],
            "teal-interface": iface["id"],
        },
        ingress=run_v2.IngressTraffic.INGRESS_TRAFFIC_ALL,
        invoker_iam_disabled=True,
        template=run_v2.RevisionTemplate(
            service_account=settings.LAB_SA,
            execution_environment=run_v2.ExecutionEnvironment.EXECUTION_ENVIRONMENT_GEN2,
            timeout=duration_pb2.Duration(seconds=3600),
            max_instance_request_concurrency=50,
            session_affinity=True,
            scaling=run_v2.RevisionScaling(
                min_instance_count=1, max_instance_count=1
            ),
            containers=[
                run_v2.Container(
                    image=image,
                    ports=[run_v2.ContainerPort(container_port=8080)],
                    resources=run_v2.ResourceRequirements(
                        limits={
                            "cpu": template["cpu"],
                            "memory": template["memory"],
                        },
                        cpu_idle=False,
                        startup_cpu_boost=True,
                    ),
                    env=[
                        run_v2.EnvVar(name=k, value=v)
                        for k, v in all_env.items()
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

    client = _get_client()
    # Fire-and-forget: don't call operation.result()
    client.create_service(
        parent=_parent(),
        service=service,
        service_id=service_id,
    )
    logger.info("provisioner.create service_id=%s image=%s", service_id, image)


def status(service_name: str) -> tuple[bool, str | None]:
    """
    Check whether the Cloud Run service is ready (§9.2).

    Returns:
        (True, url)  — service is ready and has a URL
        (False, None) — still starting
    """
    client = _get_client()
    try:
        svc = client.get_service(name=_service_name(service_name))
    except NotFound:
        return False, None

    # Ready when: not reconciling AND uri is set AND Ready condition succeeded
    is_ready = (
        not svc.reconciling
        and bool(svc.uri)
        and svc.terminal_condition
        and svc.terminal_condition.state == run_v2.Condition.State.CONDITION_SUCCEEDED
    )

    return is_ready, svc.uri if is_ready else None


def delete(service_name: str) -> None:
    """
    Delete a Cloud Run lab service (§9.3 step 2).
    NotFound is treated as success (idempotent).
    Does NOT wait for the operation to finish.

    Raises google.api_core.exceptions.GoogleAPIError on other failures.
    """
    client = _get_client()
    try:
        client.delete_service(name=_service_name(service_name))
        logger.info("provisioner.delete service=%s", service_name)
    except NotFound:
        logger.info("provisioner.delete service=%s already gone", service_name)


def list_labs() -> list[dict]:
    """
    List all Cloud Run services labelled teal-lab=true (§9.4 step 2).
    Returns a list of dicts with name, session_id, create_time.
    """
    client = _get_client()
    request = run_v2.ListServicesRequest(
        parent=_parent(),
    )
    labs = []
    for svc in client.list_services(request=request):
        if svc.labels.get("teal-lab") == "true":
            # Full name: projects/.../locations/.../services/lab-<id>
            short = svc.name.split("/")[-1]
            labs.append({
                "name": short,
                "session_id": svc.labels.get("teal-session"),
                "create_time": svc.create_time,
            })
    return labs
