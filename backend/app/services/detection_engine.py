"""Rule-Based Threat Detection Engine for SATRIA SENTINEL.

Transparent, deterministic rule evaluation without black-box ML/AI claims.
Every matched rule records a clear human-readable reason, MITRE ATT&CK reference,
rule version, confidence weight, and defensive recommended action.
"""

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.enums import SecurityEventStatus, SeverityLevel
from app.models.security_event import SecurityEvent
from app.services.risk_engine import score_security_event


@dataclass(frozen=True)
class DetectionRuleSpec:
    """Metadata specification for a deterministic detection rule."""

    rule_id: str
    rule_name: str
    version: str
    description: str
    detection_condition: str
    severity: str
    confidence: float
    mitre_tactic: str
    mitre_technique: str
    recommended_action: str
    playbook_code: str


DETECTION_RULES_CATALOG: list[DetectionRuleSpec] = [
    DetectionRuleSpec(
        rule_id="SATRIA-RULE-BF-001",
        rule_name="Brute-Force Authentication Indicator",
        version="1.2.0",
        description="Detects repeated authentication failures or high-velocity login attempts from a single source IP.",
        detection_condition=(
            "event_type IN ('auth_failure', 'brute_force_attempt', 'ssh_failed_login') "
            "AND (raw_payload.failed_attempts >= 5 OR >= 3 failed login events from same source_ip within 15 minutes)"
        ),
        severity=SeverityLevel.HIGH.value,
        confidence=0.88,
        mitre_tactic="Credential Access (TA0006)",
        mitre_technique="T1110 - Brute Force",
        recommended_action=(
            "Review authentication logs for targeted accounts, verify rate-limiting/lockout controls on the authentication gateway, "
            "and check for any subsequent successful login from the same source IP (Playbook PB-IR-002)."
        ),
        playbook_code="PB-IR-002",
    ),
    DetectionRuleSpec(
        rule_id="SATRIA-RULE-AUTH-002",
        rule_name="Suspicious Login Activity",
        version="1.1.0",
        description="Detects anomalous successful logins, including logins following brute-force bursts, untrusted networks, or off-hours administrative access.",
        detection_condition=(
            "event_type IN ('suspicious_login', 'auth_success', 'impossible_travel_login') "
            "AND (event_type == 'suspicious_login' OR raw_payload.post_bruteforce == true OR raw_payload.anomalous_geo == true "
            "OR raw_payload.off_hours == true OR prior auth_failure from same source_ip within 30 minutes)"
        ),
        severity=SeverityLevel.HIGH.value,
        confidence=0.85,
        mitre_tactic="Initial Access (TA0001)",
        mitre_technique="T1078 - Valid Accounts",
        recommended_action=(
            "Confirm login legitimacy with the account custodian, review session activity, and rotate credentials / revoke active tokens "
            "through official IAM procedures if unauthorized (Playbook PB-IR-001)."
        ),
        playbook_code="PB-IR-001",
    ),
    DetectionRuleSpec(
        rule_id="SATRIA-RULE-ACC-003",
        rule_name="Unusual Access Frequency / Bulk Resource Access",
        version="1.0.0",
        description="Detects abnormally high request rates or bulk record retrieval exceeding normal operational baselines.",
        detection_condition=(
            "event_type IN ('unusual_access_pattern', 'high_frequency_access', 'api_rate_anomaly') "
            "OR raw_payload.requests_per_minute >= 120 OR raw_payload.records_accessed >= 500"
        ),
        severity=SeverityLevel.MEDIUM.value,
        confidence=0.80,
        mitre_tactic="Collection (TA0009)",
        mitre_technique="T1213 - Data from Information Repositories",
        recommended_action=(
            "Inspect API client identity and query parameters, verify whether activity corresponds to an approved batch job, "
            "and enforce API throttling or token scope restrictions."
        ),
        playbook_code="PB-IR-001",
    ),
    DetectionRuleSpec(
        rule_id="SATRIA-RULE-PRIV-004",
        rule_name="Suspicious Privilege Escalation or Role Change",
        version="1.1.0",
        description="Detects unauthorized privilege elevation (sudo/root/SYSTEM), IAM role escalation, or SUID binary abuse without an approved change ticket.",
        detection_condition=(
            "event_type IN ('privilege_escalation', 'sudo_abuse', 'iam_role_escalation', 'suid_execution') "
            "OR (raw_payload.target_privilege IN ('root', 'admin', 'SYSTEM') AND NOT raw_payload.authorized_change_ticket)"
        ),
        severity=SeverityLevel.CRITICAL.value,
        confidence=0.92,
        mitre_tactic="Privilege Escalation (TA0004)",
        mitre_technique="T1548 - Abuse Elevation Control Mechanism",
        recommended_action=(
            "Cross-check elevation event against approved change tickets, audit executed commands and modified system files, "
            "and revert unauthorized privilege assignments via Playbook PB-IR-004."
        ),
        playbook_code="PB-IR-004",
    ),
    DetectionRuleSpec(
        rule_id="SATRIA-RULE-EXFIL-005",
        rule_name="Suspicious Outbound Traffic / Exfiltration Indicator",
        version="1.2.0",
        description="Detects large outbound data transfers (>= 50 MB) or egress connections to non-standard ports indicative of C2 or exfiltration.",
        detection_condition=(
            "event_type IN ('suspicious_outbound_traffic', 'data_exfiltration_indicator', 'c2_beaconing') "
            "OR raw_payload.bytes_out >= 50000000 OR raw_payload.destination_port IN (4444, 1337, 8443, 9001)"
        ),
        severity=SeverityLevel.CRITICAL.value,
        confidence=0.90,
        mitre_tactic="Exfiltration (TA0010)",
        mitre_technique="T1041 - Exfiltration Over C2 Channel",
        recommended_action=(
            "Investigate initiating process on the source asset, inspect destination IP reputation, "
            "and review perimeter egress filtering rules in accordance with Playbook PB-IR-003."
        ),
        playbook_code="PB-IR-003",
    ),
    DetectionRuleSpec(
        rule_id="SATRIA-RULE-RECON-006",
        rule_name="Port Scanning & Service Reconnaissance Indicator",
        version="1.0.0",
        description="Detects sequential port probing or internal/external network service discovery activity.",
        detection_condition=(
            "event_type IN ('port_scan_indicator', 'network_scan', 'service_enumeration') "
            "OR raw_payload.distinct_ports_probed >= 15"
        ),
        severity=SeverityLevel.MEDIUM.value,
        confidence=0.82,
        mitre_tactic="Discovery (TA0007)",
        mitre_technique="T1046 - Network Service Discovery",
        recommended_action=(
            "Determine if source IP belongs to an authorized vulnerability scanner; if unauthorized, "
            "review network segmentation and exposed service ports per Playbook PB-IR-005."
        ),
        playbook_code="PB-IR-005",
    ),
]

RULES_BY_ID: dict[str, DetectionRuleSpec] = {
    rule.rule_id: rule for rule in DETECTION_RULES_CATALOG
}


def get_rules_catalog() -> list[dict[str, Any]]:
    """Return serializable list of all configured detection rules."""
    return [asdict(rule) for rule in DETECTION_RULES_CATALOG]


def _build_finding(rule: DetectionRuleSpec, reason: str) -> dict[str, Any]:
    return {
        "rule_id": rule.rule_id,
        "rule_name": rule.rule_name,
        "rule_version": rule.version,
        "severity": rule.severity,
        "confidence": rule.confidence,
        "mitre_tactic": rule.mitre_tactic,
        "mitre_technique": rule.mitre_technique,
        "reason": reason,
        "recommended_action": rule.recommended_action,
        "playbook_code": rule.playbook_code,
        "matched_at": datetime.now(timezone.utc).isoformat(),
    }


def evaluate_event_against_rules(
    db: Session, event: SecurityEvent
) -> list[dict[str, Any]]:
    """Evaluate a single SecurityEvent against all deterministic detection rules."""
    findings: list[dict[str, Any]] = []
    ev_type = (event.event_type or "").strip().lower()
    payload = event.raw_payload or {}
    now_ref = event.occurred_at or datetime.now(timezone.utc)

    # 1. Brute-Force Indicator (SATRIA-RULE-BF-001)
    bf_types = {"auth_failure", "brute_force_attempt", "ssh_failed_login"}
    failed_attempts = int(payload.get("failed_attempts", 0) or 0)
    recent_failures = 0
    if event.source_ip and ev_type in bf_types:
        window_start = now_ref - timedelta(minutes=15)
        window_end = now_ref + timedelta(minutes=15)
        recent_failures = int(
            db.scalar(
                select(func.count())
                .select_from(SecurityEvent)
                .where(
                    SecurityEvent.source_ip == event.source_ip,
                    SecurityEvent.event_type.in_(bf_types),
                    SecurityEvent.occurred_at >= window_start,
                    SecurityEvent.occurred_at <= window_end,
                )
            )
            or 0
        )

    if ev_type in bf_types and (failed_attempts >= 5 or recent_failures >= 3):
        rule = RULES_BY_ID["SATRIA-RULE-BF-001"]
        findings.append(
            _build_finding(
                rule,
                reason=(
                    f"Event '{ev_type}' from source IP {event.source_ip or 'unknown'} triggered brute-force threshold "
                    f"(payload failed_attempts={failed_attempts}, correlated 15m failure events={recent_failures})."
                ),
            )
        )

    # 2. Suspicious Login Activity (SATRIA-RULE-AUTH-002)
    login_types = {"suspicious_login", "auth_success", "impossible_travel_login"}
    prior_failures = 0
    if event.source_ip and ev_type in login_types:
        window_start = now_ref - timedelta(minutes=30)
        prior_failures = int(
            db.scalar(
                select(func.count())
                .select_from(SecurityEvent)
                .where(
                    SecurityEvent.source_ip == event.source_ip,
                    SecurityEvent.event_type.in_(bf_types),
                    SecurityEvent.occurred_at >= window_start,
                    SecurityEvent.occurred_at <= now_ref,
                )
            )
            or 0
        )

    is_anomalous_login = (
        ev_type in {"suspicious_login", "impossible_travel_login"}
        or bool(payload.get("post_bruteforce"))
        or bool(payload.get("anomalous_geo"))
        or bool(payload.get("off_hours"))
        or prior_failures >= 2
    )
    if ev_type in login_types and is_anomalous_login:
        rule = RULES_BY_ID["SATRIA-RULE-AUTH-002"]
        indicators: list[str] = []
        if ev_type in {"suspicious_login", "impossible_travel_login"}:
            indicators.append(f"event_type={ev_type}")
        if payload.get("post_bruteforce") or prior_failures >= 2:
            indicators.append(f"preceded by {max(prior_failures, int(payload.get('prior_failures', 2)))} failed login(s)")
        if payload.get("anomalous_geo"):
            indicators.append(f"unusual geo/origin ({payload.get('geo_country', 'untrusted')})")
        if payload.get("off_hours"):
            indicators.append("off-hours administrative session")
        findings.append(
            _build_finding(
                rule,
                reason=(
                    f"Login activity from {event.source_ip or 'unknown'} matched suspicious criteria: "
                    + ", ".join(indicators)
                    + "."
                ),
            )
        )

    # 3. Unusual Access Frequency (SATRIA-RULE-ACC-003)
    acc_types = {"unusual_access_pattern", "high_frequency_access", "api_rate_anomaly"}
    rpm = int(payload.get("requests_per_minute", 0) or 0)
    records_accessed = int(payload.get("records_accessed", 0) or 0)
    if ev_type in acc_types or rpm >= 120 or records_accessed >= 500:
        rule = RULES_BY_ID["SATRIA-RULE-ACC-003"]
        findings.append(
            _build_finding(
                rule,
                reason=(
                    f"Resource access pattern exceeded normal threshold (event_type='{ev_type}', "
                    f"requests_per_minute={rpm}, records_accessed={records_accessed})."
                ),
            )
        )

    # 4. Suspicious Privilege Escalation (SATRIA-RULE-PRIV-004)
    priv_types = {"privilege_escalation", "sudo_abuse", "iam_role_escalation", "suid_execution"}
    target_priv = str(payload.get("target_privilege", "")).strip()
    has_ticket = bool(payload.get("authorized_change_ticket"))
    if ev_type in priv_types or (
        target_priv in {"root", "admin", "SYSTEM"} and not has_ticket
    ):
        rule = RULES_BY_ID["SATRIA-RULE-PRIV-004"]
        findings.append(
            _build_finding(
                rule,
                reason=(
                    f"Privilege elevation detected (event_type='{ev_type}', target_privilege='{target_priv or 'root/admin'}', "
                    f"authorized_change_ticket={has_ticket}, command='{payload.get('command', 'N/A')}')."
                ),
            )
        )

    # 5. Suspicious Outbound Traffic (SATRIA-RULE-EXFIL-005)
    exfil_types = {"suspicious_outbound_traffic", "data_exfiltration_indicator", "c2_beaconing"}
    bytes_out = int(payload.get("bytes_out", 0) or 0)
    dest_port = int(payload.get("destination_port", 0) or 0)
    if (
        ev_type in exfil_types
        or bytes_out >= 50_000_000
        or dest_port in {4444, 1337, 8443, 9001}
    ):
        rule = RULES_BY_ID["SATRIA-RULE-EXFIL-005"]
        mb_out = round(bytes_out / (1024 * 1024), 2) if bytes_out else 0.0
        findings.append(
            _build_finding(
                rule,
                reason=(
                    f"Suspicious outbound connection from {event.source_ip or 'host'} to "
                    f"{event.destination_ip or 'external'}:{dest_port or 443} "
                    f"(event_type='{ev_type}', transfer_volume={mb_out} MB)."
                ),
            )
        )

    # 6. Port Scanning Indicator (SATRIA-RULE-RECON-006)
    scan_types = {"port_scan_indicator", "network_scan", "service_enumeration"}
    ports_probed = int(payload.get("distinct_ports_probed", 0) or 0)
    if ev_type in scan_types or ports_probed >= 15:
        rule = RULES_BY_ID["SATRIA-RULE-RECON-006"]
        findings.append(
            _build_finding(
                rule,
                reason=(
                    f"Network reconnaissance indicator from {event.source_ip or 'unknown'} targeting "
                    f"{event.destination_ip or 'asset'} (event_type='{ev_type}', distinct_ports_probed={ports_probed})."
                ),
            )
        )

    # Update event fields with findings and MITRE enrichment
    event.detection_reasons = findings
    if findings:
        top_finding = findings[0]
        if not event.mitre_tactic:
            event.mitre_tactic = top_finding["mitre_tactic"]
        if not event.mitre_technique:
            event.mitre_technique = top_finding["mitre_technique"]
        if event.status == SecurityEventStatus.NEW.value:
            event.status = SecurityEventStatus.TRIAGED.value

    asset = (
        db.get(Asset, event.asset_id)
        if event.asset_id is not None
        else None
    )
    score_security_event(event, asset=asset, correlated_events_count=1)
    return findings


def run_detection_scan(
    db: Session,
    *,
    event_ids: list[Any] | None = None,
) -> dict[str, Any]:
    """Run detection rules across specified events or all security events in the database."""
    stmt = select(SecurityEvent).order_by(SecurityEvent.occurred_at.asc())
    if event_ids:
        stmt = stmt.where(SecurityEvent.id.in_(event_ids))

    events = list(db.scalars(stmt).all())
    flagged_events_count = 0
    total_findings_count = 0
    detections_summary: list[dict[str, Any]] = []

    for ev in events:
        findings = evaluate_event_against_rules(db, ev)
        if findings:
            flagged_events_count += 1
            total_findings_count += len(findings)
            detections_summary.append(
                {
                    "event_id": str(ev.id),
                    "title": ev.title,
                    "event_type": ev.event_type,
                    "severity": ev.severity,
                    "source_ip": ev.source_ip,
                    "asset_id": str(ev.asset_id) if ev.asset_id else None,
                    "risk_score": ev.risk_score,
                    "risk_level": ev.risk_level,
                    "findings": findings,
                }
            )

    db.commit()
    return {
        "evaluated_events_count": len(events),
        "flagged_events_count": flagged_events_count,
        "total_findings_count": total_findings_count,
        "detections": detections_summary,
    }
