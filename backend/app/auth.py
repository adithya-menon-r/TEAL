"""
backend/app/auth.py
-------------------
Module 1: Firebase Authentication middleware.

Provides:
  - firebase_app     — initialised firebase_admin App (used by sessions.py too)
  - get_current_user — FastAPI dependency injected into every /api/* route
  - verify_lab_token — helper for /api/labs/{id}/end (lab-side token auth)

Flow for get_current_user (§6.2):
  1. Read Authorization: Bearer <Firebase ID token>
  2. Verify with firebase_admin.auth.verify_id_token
  3. Lowercase email, check ALLOWED_EMAIL_REGEX
  4. email_verified must be true
  5. Return {"uid": ..., "email": ...}
"""

import logging

import firebase_admin
from firebase_admin import auth as fb_auth
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firebase Admin SDK — initialised once at module import time.
# On Cloud Run the SDK picks up the service account automatically (ADC).
# Locally, set GOOGLE_APPLICATION_CREDENTIALS to a key file (never commit it).
# ---------------------------------------------------------------------------
firebase_app = firebase_admin.initialize_app()

# FastAPI's built-in Bearer token extractor
_bearer = HTTPBearer(auto_error=True)


class CurrentUser:
    """Typed container for the authenticated user info."""

    __slots__ = ("uid", "email")

    def __init__(self, uid: str, email: str) -> None:
        self.uid = uid
        self.email = email


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Security(_bearer),
) -> CurrentUser:
    """
    FastAPI dependency. Raises HTTP 401/403 on any auth failure.
    Use as: user: CurrentUser = Depends(get_current_user)
    """
    token = creds.credentials

    # 1. Verify the Firebase ID token
    try:
        decoded = fb_auth.verify_id_token(token, app=firebase_app, check_revoked=True)
    except fb_auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={"error": "token_revoked", "message": "Token has been revoked. Please log in again."},
        )
    except fb_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={"error": "token_expired", "message": "Token has expired. Please log in again."},
        )
    except Exception as exc:
        logger.debug("Token verification failed: %s", exc)
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_token", "message": "Invalid or missing authentication token."},
        )

    # 2. Check email domain
    email: str = decoded.get("email", "").lower()
    if not settings.ALLOWED_EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "domain_not_allowed",
                "message": "Only Amrita student emails (*.students.amrita.edu) are allowed.",
            },
        )

    # 3. Check email_verified
    if not decoded.get("email_verified", False):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "email_not_verified",
                "message": "Please verify your email before using TEAL.",
            },
        )

    uid: str = decoded["uid"]
    logger.debug("Authenticated uid=%s email=%s", uid, email)
    return CurrentUser(uid=uid, email=email)
