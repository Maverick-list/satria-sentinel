"""Pydantic v2 operational schemas for SATRIA SENTINEL Phase 2 endpoints."""

from datetime import datetime
from typing import Any, Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field

# ==============================================================================
# 1. AUTH & USERS SCHEMAS
# ==============================================================================


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut


class LogoutResponse(BaseModel):
    status: str = "logged_out"
    message: str


class UserCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_\-\.]+$")
    email: str = Field(
        ...,
        min_length=5,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["admin", "security_analyst", "viewer"] = Field(
        default="security_analyst"
    )


class UserRoleUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["admin", "security_analyst", "viewer"]
    is_active: bool = True


class PaginatedUsersResponse(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int


# ==============================================================================
# 2. ASSETS SCHEMAS
# ==============================================================================


class AssetCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_tag: str = Field(..., min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_\-]+$")
    name: str = Field(..., min_length=2, max_length=255)
    hostname: str | None = Field(default=None, max_length=255)
    ip_address: str | None = Field(default=None, max_length=64)
    asset_type: Literal[
        "server",
        "workstation",
        "container",
        "network_device",
        "cloud_service",
        "database",
    ] = Field(default="server")
    environment: Literal["production", "staging", "development", "dr"] = Field(
        default="production"
    )
    criticality: Literal["low", "medium", "high", "critical"] = Field(
        default="medium"
    )
    status: Literal["active", "maintenance", "isolated", "decommissioned"] = (
        Field(default="active")
    )
    operating_system: str | None = Field(default=None, max_length=128)
    owner_id: uuid.UUID | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class AssetUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=255)
    hostname: str | None = Field(default=None, max_length=255)
    ip_address: str | None = Field(default=None, max_length=64)
    asset_type: Literal[
        "server",
        "workstation",
        "container",
        "network_device",
        "cloud_service",
        "database",
    ] | None = None
    environment: Literal["production", "staging", "development", "dr"] | None = (
        None
    )
    criticality: Literal["low", "medium", "high", "critical"] | None = None
    status: Literal[
        "active", "maintenance", "isolated", "decommissioned"
    ] | None = None
    operating_system: str | None = Field(default=None, max_length=128)
    owner_id: uuid.UUID | None = None
    metadata_json: dict[str, Any] | None = None


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_tag: str
    name: str
    hostname: str | None = None
    ip_address: str | None = None
    asset_type: str
    environment: str
    criticality: str
    status: str
    operating_system: str | None = None
    owner_id: uuid.UUID | None = None
    metadata_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class PaginatedAssetsResponse(BaseModel):
    items: list[AssetOut]
    total: int
    page: int
    page_size: int


# ==============================================================================
# 3. SECURITY EVENTS & LOG INGESTION SCHEMAS
# ==============================================================================


class SecurityEventStatusUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["new", "triaged", "linked", "false_positive", "archived"]


class SecurityEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID | None = None
    event_type: str
    source: str
    severity: str
    status: str
    title: str
    description: str | None = None
    source_ip: str | None = None
    destination_ip: str | None = None
    mitre_tactic: str | None = None
    mitre_technique: str | None = None
    raw_payload: dict[str, Any]
    event_fingerprint: str | None = None
    is_synthetic: bool
    detection_reasons: list[dict[str, Any]]
    correlation_group_id: str | None = None
    risk_score: int
    risk_level: str
    risk_breakdown: dict[str, Any]
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime


class PaginatedSecurityEventsResponse(BaseModel):
    items: list[SecurityEventOut]
    total: int
    page: int
    page_size: int


class LogImportPayloadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: str = Field(..., min_length=1, max_length=32)
    content: str = Field(default="")
    filename: str | None = Field(default=None, max_length=255)


class SyntheticGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenario: Literal[
        "all_scenarios",
        "brute_force",
        "suspicious_login",
        "unusual_access",
        "port_scanning",
        "privilege_escalation",
        "suspicious_outbound",
    ] = Field(default="all_scenarios")
    auto_correlate: bool = Field(default=True)


# ==============================================================================
# 4. DETECTIONS, CORRELATIONS & RISK ASSESSMENTS SCHEMAS
# ==============================================================================


class DetectionRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_ids: list[uuid.UUID] | None = None


class CorrelationRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    window_minutes: int = Field(default=60, ge=5, le=1440)
    min_cluster_size: int = Field(default=2, ge=2, le=50)


class RiskCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    severity: Literal["informational", "low", "medium", "high", "critical"] = (
        Field(default="high")
    )
    asset_id: uuid.UUID | None = None
    rule_confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    correlated_events_count: int = Field(default=1, ge=1, le=500)
    distinct_tactics_count: int = Field(default=1, ge=1, le=14)


# ==============================================================================
# 5. INCIDENTS, PLAYBOOKS & AUDIT LOGS SCHEMAS
# ==============================================================================


class IncidentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    severity: Literal["low", "medium", "high", "critical"] = Field(
        default="high"
    )
    assigned_to_id: uuid.UUID | None = None
    playbook_id: uuid.UUID | None = None
    security_event_ids: list[uuid.UUID] = Field(default_factory=list)
    correlation_explanation: str | None = Field(default=None, max_length=2000)


class IncidentUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=3, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    severity: Literal["low", "medium", "high", "critical"] | None = None
    playbook_id: uuid.UUID | None = None
    root_cause_notes: str | None = Field(default=None, max_length=4000)


class IncidentAssignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assigned_to_id: uuid.UUID | None
    notes: str | None = Field(default=None, max_length=1000)


class IncidentStatusChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal[
        "open",
        "investigating",
        "containment",
        "eradication",
        "recovered",
        "closed",
    ]
    notes: str | None = Field(default=None, max_length=2000)


class IncidentLinkEventsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    security_event_ids: list[uuid.UUID] = Field(..., min_length=1)
    correlation_role: str = Field(
        default="related_indicator", max_length=64
    )
    analyst_notes: str | None = Field(default=None, max_length=1000)


class IncidentAddNoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str = Field(..., min_length=2, max_length=2000)


class IncidentResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    root_cause_notes: str = Field(..., min_length=5, max_length=4000)
    resolution_status: Literal["recovered", "closed"] = Field(
        default="resolved" if False else "recovered"
    )


class LinkedIncidentEventOut(BaseModel):
    id: uuid.UUID
    security_event_id: uuid.UUID
    correlation_role: str
    analyst_notes: str | None = None
    linked_at: datetime
    event_title: str | None = None
    event_type: str | None = None
    event_severity: str | None = None
    source_ip: str | None = None


class IncidentOut(BaseModel):
    id: uuid.UUID
    incident_number: str
    title: str
    summary: str | None = None
    severity: str
    status: str
    risk_score: int
    risk_level: str
    risk_breakdown: dict[str, Any]
    correlation_explanation: str | None = None
    timeline_json: list[dict[str, Any]]
    assigned_to_id: uuid.UUID | None = None
    playbook_id: uuid.UUID | None = None
    detected_at: datetime
    resolved_at: datetime | None = None
    root_cause_notes: str | None = None
    linked_events: list[LinkedIncidentEventOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PaginatedIncidentsResponse(BaseModel):
    items: list[IncidentOut]
    total: int
    page: int
    page_size: int


class PlaybookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    category: str
    target_severity: str
    description: str | None = None
    steps_json: list[dict[str, Any]]
    is_active: bool
    version: str
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: uuid.UUID | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    details_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class PaginatedAuditLogsResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int
