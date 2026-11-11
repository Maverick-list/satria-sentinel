"""Risk Scoring Engine endpoints (/api/v1/risk-assessments)."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import require_viewer_or_above
from app.db.session import get_db
from app.models.asset import Asset
from app.models.incident import Incident
from app.models.security_event import SecurityEvent
from app.models.user import User
from app.schemas.operational import RiskCalculationRequest
from app.services.risk_engine import calculate_risk_assessment

router = APIRouter(prefix="/risk-assessments", tags=["Risk Scoring Engine"])


@router.get("/methodology")
def get_risk_methodology(
    _current_user: User = Depends(require_viewer_or_above),
) -> dict[str, Any]:
    """Return the documented 0-100 deterministic risk scoring formula and category boundaries."""
    return {
        "scale": "0-100",
        "model_type": "Deterministic Additive Priority Index (Not a Statistical Probability)",
        "formula": "RiskScore = min(100, Severity[0..35] + AssetCriticality[0..25] + RuleConfidence[0..20] + CorrelatedVolume[0..10] + OperationalContext[0..10])",
        "weights": {
            "event_severity_max": 35,
            "asset_criticality_max": 25,
            "rule_confidence_max": 20,
            "correlated_volume_max": 10,
            "operational_context_max": 10,
        },
        "thresholds": {
            "low": {"min": 0, "max": 29},
            "medium": {"min": 30, "max": 54},
            "high": {"min": 55, "max": 79},
            "critical": {"min": 80, "max": 100},
        },
    }


@router.get("/summary")
def get_platform_risk_summary(
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return actual risk distribution across stored security events, assets, and incidents."""
    events = list(
        db.scalars(
            select(SecurityEvent).order_by(desc(SecurityEvent.risk_score))
        ).all()
    )
    incidents = list(
        db.scalars(select(Incident).order_by(desc(Incident.risk_score))).all()
    )
    assets = list(db.scalars(select(Asset)).all())

    distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for ev in events:
        lvl = (ev.risk_level or "low").lower()
        if lvl in distribution:
            distribution[lvl] += 1

    avg_score = (
        round(sum(e.risk_score for e in events) / len(events), 1)
        if events
        else 0.0
    )
    max_score = max((e.risk_score for e in events), default=0)

    return {
        "total_assets": len(assets),
        "total_events": len(events),
        "total_incidents": len(incidents),
        "open_incidents": sum(
            1 for inc in incidents if inc.status not in {"recovered", "closed"}
        ),
        "average_event_risk_score": avg_score,
        "highest_event_risk_score": max_score,
        "event_risk_distribution": distribution,
        "top_risk_events": [
            {
                "id": str(ev.id),
                "title": ev.title,
                "event_type": ev.event_type,
                "severity": ev.severity,
                "risk_score": ev.risk_score,
                "risk_level": ev.risk_level,
                "risk_breakdown": ev.risk_breakdown,
                "occurred_at": ev.occurred_at.isoformat(),
            }
            for ev in events[:10]
        ],
    }


@router.post("/calculate")
def calculate_custom_risk(
    payload: RiskCalculationRequest,
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Calculate and explain a 0-100 risk score for given parameters."""
    asset = (
        db.get(Asset, payload.asset_id)
        if payload.asset_id is not None
        else None
    )
    synthetic_reasons = (
        [{"rule_id": "SIMULATED-RULE", "confidence": payload.rule_confidence}]
        if payload.rule_confidence > 0
        else []
    )
    return calculate_risk_assessment(
        severity=payload.severity,
        asset=asset,
        detection_reasons=synthetic_reasons,
        correlated_events_count=payload.correlated_events_count,
        distinct_tactics_count=payload.distinct_tactics_count,
    )
