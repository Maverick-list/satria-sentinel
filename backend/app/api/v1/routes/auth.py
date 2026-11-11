"""Authentication endpoints (/api/v1/auth)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import AppError
from app.core.security import (
    create_access_token,
    normalize_role,
    revoke_token_jti,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.operational import (
    LoginRequest,
    LogoutResponse,
    TokenResponse,
    UserOut,
)
from app.services.audit_service import record_audit_log
from app.services.bootstrap_service import ensure_initial_seed_data

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate user credentials and issue a signed HS256 JWT access token."""
    ensure_initial_seed_data(db)
    username_clean = payload.username.strip()
    user = db.scalar(select(User).where(User.username == username_clean))

    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        record_audit_log(
            db,
            actor_user_id=user.id if user else None,
            action="auth.login_failed",
            entity_type="User",
            entity_id=username_clean,
            details={"username": username_clean, "reason": "invalid_credentials"},
            request=request,
        )
        raise AppError(
            message="Invalid username or password.",
            code="AUTH_INVALID_CREDENTIALS",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    user.role = normalize_role(user.role)
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    token, _jti, expires_at = create_access_token(
        subject=str(user.id),
        username=user.username,
        role=user.role,
    )

    record_audit_log(
        db,
        actor_user_id=user.id,
        action="auth.login_success",
        entity_type="User",
        entity_id=str(user.id),
        details={"username": user.username, "role": user.role},
        request=request,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_at=expires_at,
        user=UserOut.model_validate(user),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    """Revoke the active JWT token and record an audit log entry."""
    jti = getattr(request.state, "current_token_jti", "")
    revoke_token_jti(jti)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="auth.logout",
        entity_type="User",
        entity_id=str(current_user.id),
        details={"username": current_user.username},
        request=request,
    )
    return LogoutResponse(
        status="logged_out",
        message="Session token has been revoked.",
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Return the currently authenticated user profile and RBAC role."""
    return UserOut.model_validate(current_user)
