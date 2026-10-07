"""
backend/app/cost.py
-------------------
Module 5 (partial): per-session cost calculation.

Formula (§9.5):
  costUsd = duration_seconds × (vCPU × PRICE_VCPU_SEC + GiB × PRICE_GIB_SEC)

Memory strings follow the Kubernetes quantity format: "1Gi", "512Mi", etc.
CPU strings are plain numbers: "1", "2".
"""

from datetime import datetime, timezone

from .config import settings


def _parse_memory_gib(memory_str: str) -> float:
    """Convert a memory quantity string (e.g. '2Gi', '512Mi') to GiB."""
    s = memory_str.strip()
    if s.endswith("Gi"):
        return float(s[:-2])
    if s.endswith("Mi"):
        return float(s[:-2]) / 1024
    if s.endswith("G"):
        return float(s[:-1]) * (1000**3) / (1024**3)
    if s.endswith("M"):
        return float(s[:-1]) * (1000**2) / (1024**2)
    # Assume bytes
    return float(s) / (1024**3)


def calculate_cost(
    cpu: str,
    memory: str,
    created_at: datetime,
    ended_at: datetime,
) -> float:
    """
    Return the session cost in USD, rounded to 6 decimal places.

    Args:
        cpu:        vCPU count as string, e.g. "1" or "2"
        memory:     memory as Kubernetes quantity string, e.g. "2Gi"
        created_at: session start time (timezone-aware)
        ended_at:   session end time (timezone-aware)
    """
    duration_sec = (ended_at - created_at).total_seconds()
    if duration_sec < 0:
        duration_sec = 0.0

    vcpu = float(cpu)
    gib = _parse_memory_gib(memory)

    cost = duration_sec * (vcpu * settings.PRICE_VCPU_SEC + gib * settings.PRICE_GIB_SEC)
    return round(cost, 6)


def estimate_cost(cpu: str, memory: str, duration_minutes: int = 60) -> float:
    """
    Approximate cost for a full lab session of `duration_minutes`.
    Used for the catalog card display.
    """
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    end = now + timedelta(minutes=duration_minutes)
    return calculate_cost(cpu, memory, now, end)
