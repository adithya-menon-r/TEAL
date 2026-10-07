"""
backend/app/config.py
---------------------
Reads all environment variables and exposes them as a typed Settings object.
Import `settings` everywhere instead of calling os.environ directly.
"""

import os
import re


class Settings:
    # GCP
    GCP_PROJECT: str = os.environ["GCP_PROJECT"]
    REGION: str = os.environ.get("REGION", "asia-south1")
    LAB_SA: str = os.environ["LAB_SA"]
    SCHEDULER_SA: str = os.environ["SCHEDULER_SA"]
    IMAGE_REPO: str = os.environ["IMAGE_REPO"]
    PUBLIC_URL: str = os.environ["PUBLIC_URL"]

    # Catalog
    CATALOG_PATH: str = os.environ.get("CATALOG_PATH", "/app/catalog.json")

    # Auth / access
    ALLOWED_EMAIL_REGEX: re.Pattern = re.compile(
        os.environ.get(
            "ALLOWED_EMAIL_REGEX",
            r"^[^@\s]+@[a-z0-9-]+\.students\.amrita\.edu$",
        )
    )

    # CORS
    FRONTEND_ORIGIN: str = os.environ.get(
        "FRONTEND_ORIGIN", "https://teal.example.com"
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
