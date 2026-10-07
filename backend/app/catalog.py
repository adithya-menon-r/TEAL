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
from .cost import estimate_cost

logger = logging.getLogger(__name__)

# Required fields that every template entry must have
_REQUIRED_FIELDS = {"id", "name", "description", "image", "interface", "tools", "cpu", "memory", "durationMinutes"}

# Singleton — populated by load_catalog() on startup
_catalog: list[dict[str, Any]] = []


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
        if entry["interface"] not in ("terminal", "jupyter"):
            raise ValueError(
                f"Template '{entry['id']}' has unknown interface: {entry['interface']}"
            )

        # Attach the approximate per-lab cost
        entry = dict(entry)  # shallow copy so we don't mutate the parsed JSON
        entry["approxCostUsd"] = estimate_cost(
            entry["cpu"], entry["memory"], entry["durationMinutes"]
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
