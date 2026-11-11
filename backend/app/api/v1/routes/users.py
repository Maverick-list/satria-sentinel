"""Users & RBAC management endpoints (/api/v1/users)."""

import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin, require_viewer_or_above
from app.core.exceptions import AppError
from app.core.security import hash_password, normalize_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.operational import (
    PaginatedUsersResponse,
    UserCreateRequest,
    UserOut,
    UserRoleUpdateRequest,
)
from app.services.audit_service import record_audit_log
from app.services.bootstrap_service import ensure_initial_seed_data

router = APIRouter(prefix="/users", tags=["Users & RBAC"])


@router.get("", response_model=PaginatedUsersResponse)
def list_users(
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=20, ge=1, le=100),
    role: str | None = Query(default=None),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> PaginatedUsersResponse:
    """List platform users (password hashes are never exposed)."""
    ensure_initial_seed_data(db)
    stmt = select(User)
    count_stmt = select(func.count()).select_from(User)

    if role:
        norm = normalize_role(role)
        stmt = stmt.where(User.role == norm)
        count_stmt = count_stmt.where(User.role == norm)

    total = int(db.scalar(count_stmt) or 0)
    offset = (page - 1) * page_size
    users = list(
        db.scalars(
            stmt.order_by(User.created_at.asc()).offset(offset).limit(page_size)
        ).all()
    )
    return PaginatedUsersResponse(
        items=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    """Create a new user account (Admin only)."""
    existing = db.scalar(
        select(User).where(
            (User.username == payload.username.strip())
            | (User.email == str(payload.email).lower())
        )
    )
    if existing is not None:
        raise AppError(
            message="A user with that username or email already exists.",
            code="USER_ALREADY_EXISTS",
            status_code=status.HTTP_409_CONFLICT,
        )

    new_user = User(
        username=payload.username.strip(),
        email=str(payload.email).lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=normalize_role(payload.role),
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="user.created",
        entity_type="User",
        entity_id=str(new_user.id),
        details={"username": new_user.username, "role": new_user.role},
        request=request,
    )
    return UserOut.model_validate(new_user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    """Update a user's RBAC role or active status (Admin only)."""
    target = db.get(User, user_id)
    if target is None:
        raise AppError(
            message="User not found.",
            code="USER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    old_role = target.role
    target.role = normalize_role(payload.role)
    target.is_active = payload.is_active
    db.add(target)
    db.commit()
    db.refresh(target)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="user.role_updated",
        entity_type="User",
        entity_id=str(target.id),
        details={
            "username": target.username,
            "previous_role": old_role,
            "new_role": target.role,
            "is_active": target.is_active,
        },
        request=request,
    )
    return UserOut.model_validate(target)
