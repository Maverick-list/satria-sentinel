"""Domain enumerations for SATRIA SENTINEL database models."""

from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    SECURITY_ANALYST = "security_analyst"
    VIEWER = "viewer"
    # Phase 1 compatibility aliases
    SOC_LEAD = "soc_lead"
    SOC_ANALYST = "soc_analyst"
    AUDITOR = "auditor"


class AssetType(StrEnum):
    SERVER = "server"
    WORKSTATION = "workstation"
    CONTAINER = "container"
    NETWORK_DEVICE = "network_device"
    CLOUD_SERVICE = "cloud_service"
    DATABASE = "database"


class AssetCriticality(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AssetStatus(StrEnum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    ISOLATED = "isolated"
    DECOMMISSIONED = "decommissioned"


class SeverityLevel(StrEnum):
    INFORMATIONAL = "informational"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityEventStatus(StrEnum):
    NEW = "new"
    TRIAGED = "triaged"
    LINKED = "linked"
    FALSE_POSITIVE = "false_positive"
    ARCHIVED = "archived"


class IncidentStatus(StrEnum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    CONTAINMENT = "containment"
    CONTAINED = "contained"
    ERADICATION = "eradication"
    RECOVERED = "recovered"
    CLOSED = "closed"
