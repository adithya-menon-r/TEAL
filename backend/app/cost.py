"""Lab cost calculation (PLAN.md §9.5).

costUsd = seconds x (vCPU x PRICE_VCPU_SEC + GiB x PRICE_GIB_SEC)

`cpu` and `memory` are the catalog strings ("2", "4Gi"). Prices come from the
env vars PRICE_VCPU_SEC / PRICE_GIB_SEC (Cloud Run instance-based billing,
asia-south1) and are read at call time so tests and redeploys pick up changes.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone

logger = logging.getLogger("teal.cost")

DEFAULT_PRICE_VCPU_SEC = 0.000018
DEFAULT_PRICE_GIB_SEC = 0.000002

_GIB = 1024**3

# Kubernetes-style quantity suffixes, as accepted by Cloud Run.
# Binary suffixes (Ki/Mi/Gi/Ti) are powers of 1024; decimal ones (k/K/M/G/T)
# are powers of 1000. A bare number is bytes.
_MEMORY_UNITS: dict[str, float] = {
    "": 1,
    "Ki": 1024,
    "Mi": 1024**2,
    "Gi": 1024**3,
    "Ti": 1024**4,
    "k": 1000,
    "K": 1000,
    "M": 1000**2,
    "G": 1000**3,
    "T": 1000**4,
}

_QUANTITY_RE = re.compile(r"^\s*([0-9]*\.?[0-9]+)\s*([A-Za-z]*)\s*$")


def _env_price(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError:
        logger.warning("invalid %s=%r, using default %s", name, raw, default)
        return default
    if value < 0:
        logger.warning("negative %s=%r, using default %s", name, raw, default)
        return default
    return value


def price_vcpu_sec() -> float:
    """USD per vCPU-second (env PRICE_VCPU_SEC)."""
    return _env_price("PRICE_VCPU_SEC", DEFAULT_PRICE_VCPU_SEC)


def price_gib_sec() -> float:
    """USD per GiB-second (env PRICE_GIB_SEC)."""
    return _env_price("PRICE_GIB_SEC", DEFAULT_PRICE_GIB_SEC)


def parse_cpu(cpu: str) -> float:
    """Parse a CPU quantity: "1", "2", "0.5", "1000m" (millicores)."""
    match = _QUANTITY_RE.match(str(cpu))
    if not match:
        raise ValueError(f"invalid cpu quantity: {cpu!r}")
    number, unit = float(match.group(1)), match.group(2)
    if unit == "":
        return number
    if unit == "m":
        return number / 1000
    raise ValueError(f"invalid cpu unit in {cpu!r}")


def parse_memory_gib(memory: str) -> float:
    """Parse a memory quantity into GiB: "512Mi" -> 0.5, "2Gi" -> 2.0.

    Decimal suffixes follow Kubernetes semantics, so "1G" is 10^9 bytes
    (about 0.931 GiB) and "512M" is 512 x 10^6 bytes.
    """
    match = _QUANTITY_RE.match(str(memory))
    if not match:
        raise ValueError(f"invalid memory quantity: {memory!r}")
    number, unit = float(match.group(1)), match.group(2)
    if unit not in _MEMORY_UNITS:
        raise ValueError(f"invalid memory unit in {memory!r}")
    return number * _MEMORY_UNITS[unit] / _GIB


def _rate_per_second(cpu: str, memory: str) -> float:
    return parse_cpu(cpu) * price_vcpu_sec() + parse_memory_gib(memory) * price_gib_sec()


def _as_utc(dt: datetime) -> datetime:
    # Naive datetimes are treated as UTC so mixed inputs never raise.
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def session_cost(cpu: str, memory: str, started_at: datetime, ended_at: datetime) -> float:
    """Cost in USD of a lab that ran from started_at to ended_at (4 decimals, >= 0)."""
    seconds = (_as_utc(ended_at) - _as_utc(started_at)).total_seconds()
    if seconds <= 0:
        return 0.0
    return round(seconds * _rate_per_second(cpu, memory), 4)


def hourly_cost(cpu: str, memory: str) -> float:
    """Cost in USD of one hour of a lab (3 decimals); used for approxCostUsd."""
    return round(3600 * _rate_per_second(cpu, memory), 3)
