"""Digital Assets CRUD endpoints (/api/v1/assets)."""

import uuid

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin, require_viewer_or_above
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.asset import Asset
from app.models.user import User
from app.schemas.operational import (
    AssetCreateRequest,
    AssetOut,
    AssetUpdateRequest,
    PaginatedAssetsResponse,
)
from app.services.audit_service import record_audit_log
from app.services.bootstrap_service import ensure_initial_seed_data

router = APIRouter(prefix="/assets", tags=["Assets Inventory"])


@router.get("", response_model=PaginatedAssetsResponse)
def list_assets(
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    criticality: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    asset_type: str | None = Query(default=None),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> PaginatedAssetsResponse:
    """List monitored assets with search, filtering, and pagination."""
    ensure_initial_seed_data(db)
    stmt = select(Asset)
    count_stmt = select(func.count()).select_from(Asset)

    if search and search.strip():
        q = f"%{search.strip()}%"
        cond = or_(
            Asset.asset_tag.ilike(q),
            Asset.name.ilike(q),
            Asset.hostname.ilike(q),
            Asset.ip_address.ilike(q),
        )
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    if criticality:
        stmt = stmt.where(Asset.criticality == criticality.strip().lower())
        count_stmt = count_stmt.where(
            Asset.criticality == criticality.strip().lower()
        )
    if status_filter:
        stmt = stmt.where(Asset.status == status_filter.strip().lower())
        count_stmt = count_stmt.where(
            Asset.status == status_filter.strip().lower()
        )
    if asset_type:
        stmt = stmt.where(Asset.asset_type == asset_type.strip().lower())
        count_stmt = count_stmt.where(
            Asset.asset_type == asset_type.strip().lower()
        )

    total = int(db.scalar(count_stmt) or 0)
    offset = (page - 1) * page_size
    assets = list(
        db.scalars(
            stmt.order_by(desc(Asset.created_at)).offset(offset).limit(page_size)
        ).all()
    )
    return PaginatedAssetsResponse(
        items=[AssetOut.model_validate(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(
    asset_id: uuid.UUID,
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> AssetOut:
    """Retrieve a single asset by UUID."""
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise AppError(
            message="Asset not found.",
            code="ASSET_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return AssetOut.model_validate(asset)


@router.post("", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetOut:
    """Create a new monitored asset (Admin only)."""
    normalized_tag = payload.asset_tag.strip().upper()
    existing = db.scalar(
        select(Asset).where(Asset.asset_tag == normalized_tag)
    )
    if existing is not None:
        raise AppError(
            message=f"Asset with tag '{normalized_tag}' already exists.",
            code="ASSET_TAG_DUPLICATE",
            status_code=status.HTTP_409_CONFLICT,
        )

    asset = Asset(
        asset_tag=normalized_tag,
        name=payload.name.strip(),
        hostname=payload.hostname.strip() if payload.hostname else None,
        ip_address=payload.ip_address.strip() if payload.ip_address else None,
        asset_type=payload.asset_type,
        environment=payload.environment,
        criticality=payload.criticality,
        status=payload.status,
        operating_system=payload.operating_system.strip()
        if payload.operating_system
        else None,
        owner_id=payload.owner_id or current_user.id,
        metadata_json=payload.metadata_json,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="asset.created",
        entity_type="Asset",
        entity_id=str(asset.id),
        details={
            "asset_tag": asset.asset_tag,
            "name": asset.name,
            "criticality": asset.criticality,
            "environment": asset.environment,
        },
        request=request,
    )
    return AssetOut.model_validate(asset)


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: uuid.UUID,
    payload: AssetUpdateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetOut:
    """Update an existing monitored asset (Admin only)."""
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise AppError(
            message="Asset not found.",
            code="ASSET_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    changes: dict[str, object] = {}
    update_data = payload.model_dump(exclude_unset=True)
    for field_name, new_value in update_data.items():
        old_val = getattr(asset, field_name)
        if old_val != new_value:
            setattr(asset, field_name, new_value)
            changes[field_name] = {
                "from": str(old_val) if old_val is not None else None,
                "to": str(new_value) if new_value is not None else None,
            }

    db.add(asset)
    db.commit()
    db.refresh(asset)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="asset.updated",
        entity_type="Asset",
        entity_id=str(asset.id),
        details={"asset_tag": asset.asset_tag, "changes": changes},
        request=request,
    )
    return AssetOut.model_validate(asset)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Response:
    """Delete a monitored asset (Admin only)."""
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise AppError(
            message="Asset not found.",
            code="ASSET_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    tag = asset.asset_tag
    name = asset.name
    db.delete(asset)
    db.commit()

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="asset.deleted",
        entity_type="Asset",
        entity_id=str(asset_id),
        details={"asset_tag": tag, "name": name},
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
