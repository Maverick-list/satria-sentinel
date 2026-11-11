"""Idempotent bootstrap seeder for demo RBAC users, monitored assets, and defensive playbooks.

All seeded records represent synthetic hackathon evaluation entities and never use real PII.
"""

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.asset import Asset
from app.models.enums import AssetCriticality, AssetStatus, AssetType, SeverityLevel, UserRole
from app.models.response_playbook import ResponsePlaybook
from app.models.user import User

_DEMO_PREFIX = os.getenv("SATRIA_DEMO_ACCESS_PREFIX", "Satria")
_DEMO_SUFFIX = os.getenv("SATRIA_DEMO_ACCESS_SUFFIX", "#2026")

DEFAULT_DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@satria-sentinel.local",
        "full_name": "Commander Satria (Platform Admin)",
        "role": UserRole.ADMIN.value,
        "initial_passphrase": f"{_DEMO_PREFIX}Admin{_DEMO_SUFFIX}",
    },
    {
        "username": "analyst",
        "email": "analyst@satria-sentinel.local",
        "full_name": "Raka Pratama (Senior Security Analyst)",
        "role": UserRole.SECURITY_ANALYST.value,
        "initial_passphrase": f"{_DEMO_PREFIX}Analyst{_DEMO_SUFFIX}",
    },
    {
        "username": "viewer",
        "email": "viewer@satria-sentinel.local",
        "full_name": "Dina Kartika (Compliance & SOC Viewer)",
        "role": UserRole.VIEWER.value,
        "initial_passphrase": f"{_DEMO_PREFIX}Viewer{_DEMO_SUFFIX}",
    },
]

DEFAULT_DEMO_ASSETS = [
    {
        "asset_tag": "AST-IAM-001",
        "name": "Central Identity & SSO Gateway",
        "hostname": "iam-sso-gw-01.satria.local",
        "ip_address": "10.20.1.10",
        "asset_type": AssetType.SERVER.value,
        "environment": "production",
        "criticality": AssetCriticality.CRITICAL.value,
        "status": AssetStatus.ACTIVE.value,
        "operating_system": "Ubuntu 24.04 LTS",
        "metadata_json": {
            "synthetic_demo": True,
            "zone": "dmz-auth",
            "services": ["oauth2", "ldap-bridge", "ssh"],
        },
    },
    {
        "asset_tag": "AST-DB-002",
        "name": "Core Telemetry & Vault PostgreSQL Cluster",
        "hostname": "pg-core-vault-01.satria.local",
        "ip_address": "10.20.2.15",
        "asset_type": AssetType.DATABASE.value,
        "environment": "production",
        "criticality": AssetCriticality.CRITICAL.value,
        "status": AssetStatus.ACTIVE.value,
        "operating_system": "Debian 12 (PostgreSQL 16)",
        "metadata_json": {
            "synthetic_demo": True,
            "zone": "restricted-data",
            "encryption_at_rest": True,
        },
    },
    {
        "asset_tag": "AST-WEB-003",
        "name": "Public Portal API Edge Node",
        "hostname": "edge-api-01.satria.local",
        "ip_address": "10.20.1.25",
        "asset_type": AssetType.CONTAINER.value,
        "environment": "production",
        "criticality": AssetCriticality.HIGH.value,
        "status": AssetStatus.ACTIVE.value,
        "operating_system": "Alpine Linux 3.20 (Container)",
        "metadata_json": {
            "synthetic_demo": True,
            "zone": "public-edge",
            "ingress": "https:443",
        },
    },
    {
        "asset_tag": "AST-WKS-004",
        "name": "SOC Operations Bastion Workstation",
        "hostname": "wks-bastion-04.satria.local",
        "ip_address": "10.20.3.44",
        "asset_type": AssetType.WORKSTATION.value,
        "environment": "production",
        "criticality": AssetCriticality.HIGH.value,
        "status": AssetStatus.ACTIVE.value,
        "operating_system": "Ubuntu 24.04 Hardened",
        "metadata_json": {
            "synthetic_demo": True,
            "zone": "soc-management",
        },
    },
    {
        "asset_tag": "AST-NET-005",
        "name": "Perimeter Egress Inspection Firewall",
        "hostname": "fw-egress-01.satria.local",
        "ip_address": "10.20.0.1",
        "asset_type": AssetType.NETWORK_DEVICE.value,
        "environment": "production",
        "criticality": AssetCriticality.CRITICAL.value,
        "status": AssetStatus.ACTIVE.value,
        "operating_system": "SATRIA NetOS 5.2",
        "metadata_json": {
            "synthetic_demo": True,
            "zone": "perimeter",
        },
    },
]

DEFAULT_PLAYBOOKS = [
    {
        "code": "PB-IR-001",
        "name": "Account Compromise & Suspicious Authentication Response",
        "category": "account_compromise",
        "target_severity": SeverityLevel.HIGH.value,
        "version": "1.2.0",
        "description": (
            "Defensive response procedure when anomalous login patterns, impossible travel, "
            "or post-brute-force authentication success is detected. Strictly advisory; "
            "requires authorized operator verification."
        ),
        "steps_json": [
            {
                "step_number": 1,
                "phase": "Identification",
                "title": "Verify Authentication Telemetry & Source Context",
                "instruction": "Review source IP, user agent, timestamp sequence, and correlated failed login attempts on the target asset.",
                "verification": "Confirm whether the login originated from an authorized VPN/bastion or an untrusted network.",
            },
            {
                "step_number": 2,
                "phase": "Containment",
                "title": "Revoke Active Sessions & Rotate Credentials via Official IAM Procedure",
                "instruction": "Coordinate with the Identity Administrator to invalidate active JWT/SSO sessions and enforce password + MFA reset.",
                "verification": "Verify session termination in IAM audit logs.",
            },
            {
                "step_number": 3,
                "phase": "Eradication",
                "title": "Inspect Post-Authentication Activity",
                "instruction": "Audit command history, privilege changes, and newly created API keys or cron jobs during the session window.",
                "verification": "Confirm no unauthorized persistence mechanisms exist.",
            },
            {
                "step_number": 4,
                "phase": "Recovery & Lessons Learned",
                "title": "Restore Normal Access & Document Root Cause",
                "instruction": "Re-enable user access after MFA verification and record root cause notes in the SATRIA SENTINEL incident timeline.",
                "verification": "Incident status transitioned to recovered/closed with audit trail entry.",
            },
        ],
    },
    {
        "code": "PB-IR-002",
        "name": "Brute-Force Authentication Indicators Mitigation",
        "category": "brute_force",
        "target_severity": SeverityLevel.HIGH.value,
        "version": "1.1.0",
        "description": (
            "Standardized defensive workflow for high-velocity failed authentication attempts "
            "against SSH, SSO, or API authentication endpoints."
        ),
        "steps_json": [
            {
                "step_number": 1,
                "phase": "Identification",
                "title": "Analyze Failure Velocity & Targeted Usernames",
                "instruction": "Inspect correlated auth_failure events to determine whether a single account (targeted brute-force) or multiple accounts (password spraying) are affected.",
                "verification": "Document source IP(s) and targeted account list.",
            },
            {
                "step_number": 2,
                "phase": "Containment",
                "title": "Review Authentication Rate-Limiting & Access Policy",
                "instruction": "Recommend rate-limiting or temporary ACL restriction at the ingress gateway according to organizational network security policy.",
                "verification": "Confirm rate-limiting policy status with network/IAM team.",
            },
            {
                "step_number": 3,
                "phase": "Recovery",
                "title": "Verify No Subsequent Successful Login Occurred",
                "instruction": "Cross-check correlated events from the same source IP for any auth_success event within the 30-minute window.",
                "verification": "If auth_success is present, escalate to PB-IR-001 (Account Compromise).",
            },
        ],
    },
    {
        "code": "PB-IR-003",
        "name": "Suspicious Outbound Traffic & Data Exfiltration Investigation",
        "category": "suspicious_outbound",
        "target_severity": SeverityLevel.CRITICAL.value,
        "version": "1.3.0",
        "description": (
            "Defensive investigation and containment checklist for unusual outbound data transfers, "
            "non-standard egress ports, or periodic C2 beacon indicators."
        ),
        "steps_json": [
            {
                "step_number": 1,
                "phase": "Identification",
                "title": "Inspect Destination Endpoint, Volume & Process Lineage",
                "instruction": "Examine bytes_out, destination IP/port, protocol, and initiating process on the affected asset.",
                "verification": "Determine whether transfer matches scheduled backup/replication or unauthorized egress.",
            },
            {
                "step_number": 2,
                "phase": "Containment",
                "title": "Evaluate Egress Policy & Host Isolation",
                "instruction": "Follow change-control procedure to restrict outbound connections to the unverified destination and place asset in maintenance/isolated state if compromise is confirmed.",
                "verification": "Confirm egress traffic cessation in firewall telemetry.",
            },
            {
                "step_number": 3,
                "phase": "Eradication & Recovery",
                "title": "Assess Data Exposure & Remediate Host",
                "instruction": "Identify accessed datasets, rotate affected service credentials on the host, and document findings in incident root-cause notes.",
                "verification": "Complete data impact assessment and close incident.",
            },
        ],
    },
    {
        "code": "PB-IR-004",
        "name": "Unauthorized Privilege Escalation Response",
        "category": "privilege_escalation",
        "target_severity": SeverityLevel.CRITICAL.value,
        "version": "1.0.0",
        "description": (
            "Defensive playbook for unexpected sudo/root elevation, IAM role modification, "
            "or SUID binary execution indicators."
        ),
        "steps_json": [
            {
                "step_number": 1,
                "phase": "Identification",
                "title": "Validate Change Ticket & Executing Principal",
                "instruction": "Check whether the privilege elevation or role change corresponds to an approved maintenance window.",
                "verification": "Compare actor username and timestamp against change management log.",
            },
            {
                "step_number": 2,
                "phase": "Containment",
                "title": "Revert Unauthorized Role Assignment & Isolate Session",
                "instruction": "Recommend immediate rollback of unauthorized group/sudoer modifications via authorized system administrator.",
                "verification": "Verify `/etc/sudoers` or IAM role policy integrity.",
            },
            {
                "step_number": 3,
                "phase": "Eradication",
                "title": "Audit Binaries & Scheduled Tasks",
                "instruction": "Inspect host for unauthorized binaries, kernel modules, or systemd timers created after elevation.",
                "verification": "Host integrity check passed.",
            },
        ],
    },
    {
        "code": "PB-IR-005",
        "name": "Port Scanning & Network Reconnaissance Review",
        "category": "reconnaissance",
        "target_severity": SeverityLevel.MEDIUM.value,
        "version": "1.0.0",
        "description": (
            "Defensive review workflow when synthetic or internal network sensors detect "
            "sequential port probing or service enumeration."
        ),
        "steps_json": [
            {
                "step_number": 1,
                "phase": "Identification",
                "title": "Classify Scan Origin (Internal vs. External)",
                "instruction": "Verify if the source IP belongs to an authorized vulnerability scanner or an unrecognized host indicating lateral reconnaissance.",
                "verification": "Record source IP classification and probed port range.",
            },
            {
                "step_number": 2,
                "phase": "Containment",
                "title": "Verify Exposed Services on Targeted Asset",
                "instruction": "Review asset firewall rules to ensure only required production ports are reachable from the source segment.",
                "verification": "Network segmentation policy verified.",
            },
        ],
    },
]


def ensure_initial_seed_data(db: Session) -> None:
    """Seed default RBAC users, assets, and response playbooks if not already present."""
    admin_user: User | None = None
    for user_spec in DEFAULT_DEMO_USERS:
        existing = db.scalar(
            select(User).where(User.username == user_spec["username"])
        )
        if existing is None:
            existing = User(
                username=user_spec["username"],
                email=user_spec["email"],
                full_name=user_spec["full_name"],
                role=user_spec["role"],
                password_hash=hash_password(user_spec["initial_passphrase"]),
                is_active=True,
            )
            db.add(existing)
            db.flush()
        if existing.username == "admin":
            admin_user = existing

    for asset_spec in DEFAULT_DEMO_ASSETS:
        existing_asset = db.scalar(
            select(Asset).where(Asset.asset_tag == asset_spec["asset_tag"])
        )
        if existing_asset is None:
            db.add(
                Asset(
                    asset_tag=asset_spec["asset_tag"],
                    name=asset_spec["name"],
                    hostname=asset_spec["hostname"],
                    ip_address=asset_spec["ip_address"],
                    asset_type=asset_spec["asset_type"],
                    environment=asset_spec["environment"],
                    criticality=asset_spec["criticality"],
                    status=asset_spec["status"],
                    operating_system=asset_spec["operating_system"],
                    owner_id=admin_user.id if admin_user else None,
                    metadata_json=asset_spec["metadata_json"],
                )
            )

    for pb_spec in DEFAULT_PLAYBOOKS:
        existing_pb = db.scalar(
            select(ResponsePlaybook).where(
                ResponsePlaybook.code == pb_spec["code"]
            )
        )
        if existing_pb is None:
            db.add(
                ResponsePlaybook(
                    code=pb_spec["code"],
                    name=pb_spec["name"],
                    category=pb_spec["category"],
                    target_severity=pb_spec["target_severity"],
                    version=pb_spec["version"],
                    description=pb_spec["description"],
                    steps_json=pb_spec["steps_json"],
                    is_active=True,
                    created_by_id=admin_user.id if admin_user else None,
                )
            )

    db.commit()
