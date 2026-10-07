import sys
from pathlib import Path

import pytest

# Make `import app...` work when pytest is run from backend/ or the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Tests never see the developer's real TEAL env vars."""
    for name in ("PRICE_VCPU_SEC", "PRICE_GIB_SEC", "PUBLIC_URL", "SCHEDULER_SA", "GCP_PROJECT"):
        monkeypatch.delenv(name, raising=False)
