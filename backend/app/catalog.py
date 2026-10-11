"""
backend/app/catalog.py
----------------------
Module 2: Lab catalog loader.

Reads templates/catalog.json (mounted at CATALOG_PATH in the container),
validates the required fields, and attaches an approxCostUsd value to each
template for the dashboard's catalog cards.

The catalog is loaded once at startup and cached — it never changes at runtime.
To add a lab, update catalog.json and redeploy.
"""

import json
import logging
from typing import Any

from .config import settings
from .cost import hourly_cost

logger = logging.getLogger(__name__)

# Required fields that every template entry must have
_REQUIRED_FIELDS = {"id", "name", "description", "interfaces", "tools", "cpu", "memory", "durationMinutes"}

VALID_INTERFACES = ("terminal", "jupyter", "vscode")

# Singleton — populated by load_catalog() on startup
_catalog: list[dict[str, Any]] = []


def _validate_interfaces(entry: dict[str, Any]) -> None:
    """Check that entry['interfaces'] is a non-empty list of unique {id, image}."""
    tid = entry["id"]
    interfaces = entry["interfaces"]
    if not isinstance(interfaces, list) or not interfaces:
        raise ValueError(f"Template '{tid}' must have a non-empty 'interfaces' list")
    seen: set[str] = set()
    for iface in interfaces:
        if not isinstance(iface, dict):
            raise ValueError(f"Template '{tid}' has a malformed interface entry: {iface!r}")
        iid = iface.get("id")
        if iid not in VALID_INTERFACES:
            raise ValueError(f"Template '{tid}' has unknown interface: {iid}")
        image = iface.get("image")
        if not isinstance(image, str) or not image.strip():
            raise ValueError(f"Template '{tid}' interface '{iid}' has no image")
        if iid in seen:
            raise ValueError(f"Template '{tid}' has duplicate interface: {iid}")
        seen.add(iid)


def load_catalog() -> None:
    """
    Load and validate catalog.json. Called once from app startup.
    Raises ValueError if the file is missing or malformed.
    """
    global _catalog
    try:
        with open(settings.CATALOG_PATH, encoding="utf-8") as f:
            raw: list[dict] = json.load(f)
    except FileNotFoundError:
        raise ValueError(f"Catalog file not found: {settings.CATALOG_PATH}")
    except json.JSONDecodeError as exc:
        raise ValueError(f"Catalog JSON is invalid: {exc}")

    validated: list[dict[str, Any]] = []
    for entry in raw:
        missing = _REQUIRED_FIELDS - entry.keys()
        if missing:
            raise ValueError(
                f"Template '{entry.get('id', '?')}' is missing fields: {missing}"
            )
        _validate_interfaces(entry)

        # Attach the approximate per-lab cost
        entry = dict(entry)  # shallow copy so we don't mutate the parsed JSON
        entry["approxCostUsd"] = round(
            hourly_cost(entry["cpu"], entry["memory"]) * entry["durationMinutes"] / 60, 3
        )
        validated.append(entry)

    _catalog = validated
    logger.info("Catalog loaded: %d templates", len(_catalog))


def get_templates() -> list[dict[str, Any]]:
    """Return all templates (as dicts) with approxCostUsd attached."""
    return _catalog


def get_template(template_id: str) -> dict[str, Any] | None:
    """Return the template with the given id, or None if not found."""
    for t in _catalog:
        if t["id"] == template_id:
            return t
    return None


def get_interface(template: dict[str, Any], interface_id: str | None = None) -> dict[str, Any] | None:
    """
    Resolve one of a template's interfaces by id.
    With interface_id None, returns the default (first) interface.
    Returns None if the template does not offer that interface.
    """
    if interface_id is None:
        return template["interfaces"][0]
    for iface in template["interfaces"]:
        if iface["id"] == interface_id:
            return iface
    return None
