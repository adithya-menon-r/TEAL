"""
backend/app/config.py
---------------------
Reads all environment variables and exposes them as a typed Settings object.
Import `settings` everywhere instead of calling os.environ directly.
"""

from pathlib import Path
import os
import re


def _load_env_file() -> None:
    env_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / "infra" / "api.env.yaml",
    ]
    for env_path in env_paths:
        if env_path.is_file():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip('"').strip("'")
                        os.environ.setdefault(k, v)
                    elif ":" in line:
                        k, v = line.split(":", 1)
                        k, v = k.strip(), v.strip().strip('"').strip("'")
                        os.environ.setdefault(k, v)


_load_env_file()


def _resolve_catalog_path() -> str:
    specified = os.environ.get("CATALOG_PATH", "")
    if specified and Path(specified).exists():
        return str(Path(specified).resolve())

    # Check container path
    if Path("/app/catalog.json").exists():
        return "/app/catalog.json"

    # Check repo root
    repo_catalog = Path(__file__).resolve().parent.parent.parent / "templates" / "catalog.json"
    if repo_catalog.exists():
        return str(repo_catalog.resolve())

    return specified or "/app/catalog.json"


class Settings:
    # GCP
    GCP_PROJECT: str = os.environ.get("GCP_PROJECT", "")
    REGION: str = os.environ.get("REGION", "asia-south1")
    LAB_SA: str = os.environ.get("LAB_SA", "")
    SCHEDULER_SA: str = os.environ.get("SCHEDULER_SA", "")
    IMAGE_REPO: str = os.environ.get("IMAGE_REPO", "")
    PUBLIC_URL: str = os.environ.get("PUBLIC_URL", "")

    # Catalog
    CATALOG_PATH: str = _resolve_catalog_path()

    # Auth / access
    ALLOWED_EMAIL_REGEX: re.Pattern = re.compile(
        os.environ.get(
            "ALLOWED_EMAIL_REGEX",
            r"^[^@\s]+@[a-z0-9-]+\.students\.amrita\.edu$",
        )
    )

    # CORS
    FRONTEND_ORIGIN: str = os.environ.get(
        "FRONTEND_ORIGIN", "http://localhost:5173"
    )

    # Lab limits
    MAX_CONCURRENT_LABS: int = int(os.environ.get("MAX_CONCURRENT_LABS", "40"))
    LAUNCHES_ENABLED: bool = (
        os.environ.get("LAUNCHES_ENABLED", "true").lower() == "true"
    )

    # Cost rates (Cloud Run instance-based billing, asia-south1)
    PRICE_VCPU_SEC: float = float(os.environ.get("PRICE_VCPU_SEC", "0.000018"))
    PRICE_GIB_SEC: float = float(os.environ.get("PRICE_GIB_SEC", "0.000002"))


settings = Settings()
