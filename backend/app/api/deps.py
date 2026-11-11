"""FastAPI authentication and Role-Based Access Control (RBAC) dependencies."""

from collections.abc import Callable
from typing import Annotated
import uuid

from fastapi import Depends, Header, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import decode_access_token, normalize_role
from app.db.session import get_db
from app.models.user import User


def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer JWT token and return the authenticated active User."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(
            message="Missing or invalid Authorization Bearer header.",
            code="UNAUTHORIZED_MISSING_TOKEN",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    raw_token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(raw_token)

    sub = payload.get("sub")
    try:
        user_id = uuid.UUID(str(sub))
    except Exception as exc:
        raise AppError(
            message="Invalid token subject identifier.",
            code="UNAUTHORIZED_INVALID_SUBJECT",
            status_code=status.HTTP_401_UNAUTHORIZED,
        ) from exc

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise AppError(
            message="Authenticated user account is inactive or no longer exists.",
            code="UNAUTHORIZED_USER_INACTIVE",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    request.state.current_token_jti = payload.get("jti", "")
    request.state.current_user_id = str(user.id)
    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory enforcing that the authenticated user has one of allowed_roles."""
    normalized_allowed = {normalize_role(r) for r in allowed_roles}

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = normalize_role(current_user.role)
        if user_role not in normalized_allowed:
            raise AppError(
                message=(
                    f"Access denied. Role '{user_role}' is not authorized for this operation. "
                    f"Required role(s): {', '.join(sorted(normalized_allowed))}."
                ),
                code="FORBIDDEN_INSUFFICIENT_ROLE",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return current_user

    return _checker


require_viewer_or_above = require_roles("admin", "security_analyst", "viewer")
require_analyst_or_admin = require_roles("admin", "security_analyst")
require_admin = require_roles("admin")
