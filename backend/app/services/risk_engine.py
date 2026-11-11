"""Deterministic, Explainable Risk Scoring Engine (0-100 Scale).

IMPORTANT ENGINEERING NOTE:
This engine calculates a deterministic, rule-weighted priority index on a 0-100 scale
to guide SOC analyst triage. It is NOT a statistical probability of compromise.
"""

from datetime import datetime, timezone
from typing import Any

from app.models.asset import Asset
from app.models.enums import RiskLevel
from app.models.security_event import SecurityEvent

SEVERITY_POINTS: dict[str, int] = {
    "informational": 5,
    "low": 12,
    "medium": 20,
    "high": 28,
    "critical": 35,
}

ASSET_CRITICALITY_POINTS: dict[str, int] = {
    "low": 6,
    "medium": 12,
    "high": 19,
    "critical": 25,
}


def classify_risk_level(score: int) -> str:
    """Map a 0-100 risk score into canonical risk level categories."""
    if score >= 80:
        return RiskLevel.CRITICAL.value
    if score >= 55:
        return RiskLevel.HIGH.value
    if score >= 30:
        return RiskLevel.MEDIUM.value
    return RiskLevel.LOW.value


def calculate_risk_assessment(
    *,
    severity: str,
    asset: Asset | None = None,
    detection_reasons: list[dict[str, Any]] | None = None,
    correlated_events_count: int = 1,
    occurred_at: datetime | None = None,
    distinct_tactics_count: int = 1,
) -> dict[str, Any]:
    """Compute a 0-100 risk score, risk level, factor breakdown, and human-readable explanation."""
    norm_severity = (severity or "medium").lower()
    sev_pts = SEVERITY_POINTS.get(norm_severity, 20)

    if asset is not None:
        norm_crit = (asset.criticality or "medium").lower()
        crit_pts = ASSET_CRITICALITY_POINTS.get(norm_crit, 12)
        asset_label = f"{asset.asset_tag} ({norm_crit} criticality, {asset.environment})"
        is_prod = (asset.environment or "").lower() == "production"
    else:
        norm_crit = "unlinked"
        crit_pts = 8
        asset_label = "No linked asset (baseline fallback)"
        is_prod = False

    reasons = detection_reasons or []
    max_confidence = 0.0
    matched_rule_ids: list[str] = []
    for item in reasons:
        conf = float(item.get("confidence", 0.0))
        if conf > max_confidence:
            max_confidence = conf
        if item.get("rule_id"):
            matched_rule_ids.append(str(item["rule_id"]))

    conf_pts = min(20, int(round(max_confidence * 20.0)))

    if correlated_events_count >= 5:
        vol_pts = 10
    elif correlated_events_count >= 3:
        vol_pts = 7
    elif correlated_events_count == 2:
        vol_pts = 4
    else:
        vol_pts = 0

    context_pts = 0
    context_notes: list[str] = []
    if is_prod:
        context_pts += 4
        context_notes.append("production environment (+4)")

    now = datetime.now(timezone.utc)
    if occurred_at is not None:
        ts = (
            occurred_at
            if occurred_at.tzinfo is not None
            else occurred_at.replace(tzinfo=timezone.utc)
        )
        age_hours = abs((now - ts).total_seconds()) / 3600.0
        if age_hours <= 24.0:
            context_pts += 3
            context_notes.append("recent activity within 24h (+3)")
    else:
        context_pts += 3
        context_notes.append("active telemetry window (+3)")

    if distinct_tactics_count >= 2 or len(matched_rule_ids) >= 2:
        context_pts += 3
        context_notes.append("multi-rule / multi-tactic indicator (+3)")

    context_pts = min(10, context_pts)

    raw_total = sev_pts + crit_pts + conf_pts + vol_pts + context_pts
    final_score = max(0, min(100, int(raw_total)))
    risk_level = classify_risk_level(final_score)

    factors = [
        {
            "factor": "Event Severity",
            "weight_max": 35,
            "points": sev_pts,
            "detail": f"Severity '{norm_severity}' contributed {sev_pts}/35 points.",
        },
        {
            "factor": "Asset Criticality",
            "weight_max": 25,
            "points": crit_pts,
            "detail": f"Asset context '{asset_label}' contributed {crit_pts}/25 points.",
        },
        {
            "factor": "Detection Rule Confidence",
            "weight_max": 20,
            "points": conf_pts,
            "detail": (
                f"Max rule confidence {max_confidence:.2f} across rules {matched_rule_ids} contributed {conf_pts}/20 points."
                if matched_rule_ids
                else "No detection rule matched yet (0/20 points)."
            ),
        },
        {
            "factor": "Correlated Event Volume",
            "weight_max": 10,
            "points": vol_pts,
            "detail": f"{correlated_events_count} correlated event(s) contributed {vol_pts}/10 points.",
        },
        {
            "factor": "Operational & Temporal Context",
            "weight_max": 10,
            "points": context_pts,
            "detail": (
                "Context factors: " + ", ".join(context_notes)
                if context_notes
                else "Baseline context (0/10 points)."
            ),
        },
    ]

    explanation = (
        f"Risk Score {final_score}/100 ({risk_level.upper()}) calculated via deterministic additive formula: "
        f"Severity ({sev_pts}) + Asset Criticality ({crit_pts}) + Rule Confidence ({conf_pts}) + "
        f"Correlated Volume ({vol_pts}) + Operational Context ({context_pts}). "
        "Note: This score is a deterministic prioritization index, not a statistical probability."
    )

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "formula": "min(100, Severity[0..35] + AssetCriticality[0..25] + RuleConfidence[0..20] + CorrelatedVolume[0..10] + Context[0..10])",
        "thresholds": {
            "low": "0-29",
            "medium": "30-54",
            "high": "55-79",
            "critical": "80-100",
        },
        "factors": factors,
        "explanation": explanation,
    }


def score_security_event(
    event: SecurityEvent,
    *,
    asset: Asset | None = None,
    correlated_events_count: int = 1,
) -> dict[str, Any]:
    """Calculate and attach risk assessment fields onto a SecurityEvent ORM instance."""
    resolved_asset = asset or event.asset
    tactics = {
        str(r.get("mitre_tactic"))
        for r in (event.detection_reasons or [])
        if r.get("mitre_tactic")
    }
    if event.mitre_tactic:
        tactics.add(event.mitre_tactic)

    assessment = calculate_risk_assessment(
        severity=event.severity,
        asset=resolved_asset,
        detection_reasons=event.detection_reasons,
        correlated_events_count=correlated_events_count,
        occurred_at=event.occurred_at,
        distinct_tactics_count=max(1, len(tactics)),
    )
    event.risk_score = assessment["risk_score"]
    event.risk_level = assessment["risk_level"]
    event.risk_breakdown = assessment
    return assessment
