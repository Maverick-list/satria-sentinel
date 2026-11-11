"""Cryptographic password hashing (scrypt) and RFC 7519 HS256 JWT token utilities."""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import secrets
from typing import Any
import uuid

from fastapi import status

from app.core.config import get_settings
from app.core.exceptions import AppError

SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64

# In-memory revoked JWT ID (jti) registry for immediate logout invalidation
_REVOKED_TOKEN_JTIS: set[str] = set()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode((segment + padding).encode("ascii"))


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using memory-hard RFC 7914 scrypt."""
    if not plain_password or len(plain_password) < 6:
        raise AppError(
            message="Password must be at least 6 characters long.",
            code="INVALID_PASSWORD_LENGTH",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        plain_password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    salt_b64 = _b64url_encode(salt)
    hash_b64 = _b64url_encode(derived)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt_b64}${hash_b64}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a stored scrypt hash in constant time."""
    try:
        parts = stored_hash.split("$")
        if len(parts) != 6 or parts[0] != "scrypt":
            return False
        n = int(parts[1])
        r = int(parts[2])
        p = int(parts[3])
        salt = _b64url_decode(parts[4])
        expected = _b64url_decode(parts[5])
        candidate = hashlib.scrypt(
            plain_password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            dklen=len(expected),
        )
        return hmac.compare_digest(candidate, expected)
    except Exception:
        return False


def normalize_role(role: str) -> str:
    """Normalize role aliases into the canonical Phase 2 RBAC roles."""
    cleaned = (role or "").strip().lower()
    if cleaned == "admin":
        return "admin"
    if cleaned in ("security_analyst", "soc_analyst", "soc_lead"):
        return "security_analyst"
    if cleaned in ("viewer", "auditor"):
        return "viewer"
    return "viewer"


def create_access_token(
    *,
    subject: str,
    username: str,
    role: str,
    expires_minutes: int | None = None,
) -> tuple[str, str, datetime]:
    """Create a signed HS256 JWT access token."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    ttl_minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expires_at = now + timedelta(minutes=ttl_minutes)
    jti = str(uuid.uuid4())

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": subject,
        "username": username,
        "role": normalize_role(role),
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    header_b64 = _b64url_encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(
        settings.JWT_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    token = f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"
    return token, jti, expires_at


def decode_access_token(token: str) -> dict[str, Any]:
    """Verify and decode an HS256 JWT access token."""
    settings = get_settings()
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token segments")
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            settings.JWT_SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        provided_sig = _b64url_decode(signature_b64)
        if not hmac.compare_digest(expected_sig, provided_sig):
            raise ValueError("Invalid token signature")

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception as exc:
        raise AppError(
            message="Invalid or malformed authentication token.",
            code="UNAUTHORIZED_INVALID_TOKEN",
            status_code=status.HTTP_401_UNAUTHORIZED,
        ) from exc

    exp = payload.get("exp")
    now_ts = int(datetime.now(timezone.utc).timestamp())
    if not isinstance(exp, int) or now_ts >= exp:
        raise AppError(
            message="Authentication token has expired.",
            code="UNAUTHORIZED_TOKEN_EXPIRED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    jti = payload.get("jti")
    if isinstance(jti, str) and jti in _REVOKED_TOKEN_JTIS:
        raise AppError(
            message="Authentication token has been logged out / revoked.",
            code="UNAUTHORIZED_TOKEN_REVOKED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return payload


def revoke_token_jti(jti: str) -> None:
    """Revoke a token JTI upon user logout."""
    if jti:
        _REVOKED_TOKEN_JTIS.add(jti)
