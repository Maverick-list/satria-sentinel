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
from app.services.bootstrap_service import ensure_initial_seed_data
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
    """Return actual risk distribution and command center telemetry across stored security events, assets, and incidents."""
    ensure_initial_seed_data(db)
    events = list(
        db.scalars(
            select(SecurityEvent).order_by(desc(SecurityEvent.risk_score))
        ).all()
    )
    incidents = list(
        db.scalars(select(Incident).order_by(desc(Incident.detected_at))).all()
    )
    assets = list(db.scalars(select(Asset)).all())
    asset_map = {str(a.id): a for a in assets}

    distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    severity_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    synthetic_count = 0
    non_synthetic_count = 0
    high_risk_findings_count = 0

    per_asset_stats: dict[str, dict[str, Any]] = {
        str(a.id): {
            "id": str(a.id),
            "asset_tag": a.asset_tag,
            "name": a.name,
            "hostname": a.hostname,
            "ip_address": a.ip_address,
            "environment": a.environment,
            "criticality": a.criticality,
            "status": a.status,
            "event_count": 0,
            "detections_count": 0,
            "peak_risk_score": 0,
            "risk_level": "low",
        }
        for a in assets
    }

    trend_buckets: dict[str, dict[str, Any]] = {}

    for ev in events:
        lvl = (ev.risk_level or "low").lower()
        if lvl in distribution:
            distribution[lvl] += 1

        sev = (ev.severity or "low").lower()
        if sev in severity_distribution:
            severity_distribution[sev] += 1

        if ev.is_synthetic:
            synthetic_count += 1
        else:
            non_synthetic_count += 1

        reasons = ev.detection_reasons or []
        if lvl in {"high", "critical"} or len(reasons) > 0:
            high_risk_findings_count += 1

        if ev.asset_id and str(ev.asset_id) in per_asset_stats:
            st = per_asset_stats[str(ev.asset_id)]
            st["event_count"] += 1
            if len(reasons) > 0:
                st["detections_count"] += 1
            if ev.risk_score > st["peak_risk_score"]:
                st["peak_risk_score"] = ev.risk_score
                st["risk_level"] = ev.risk_level

        bucket_label = ev.occurred_at.strftime("%H:%M")
        if bucket_label not in trend_buckets:
            trend_buckets[bucket_label] = {
                "bucket": bucket_label,
                "events": 0,
                "detections": 0,
            }
        trend_buckets[bucket_label]["events"] += 1
        if len(reasons) > 0:
            trend_buckets[bucket_label]["detections"] += 1

    avg_score = (
        round(sum(e.risk_score for e in events) / len(events), 1)
        if events
        else 0.0
    )
    max_score = max((e.risk_score for e in events), default=0)
    critical_assets_count = sum(
        1 for a in assets if (a.criticality or "").lower() == "critical"
    )

    events_by_recency = sorted(
        events, key=lambda item: item.occurred_at, reverse=True
    )
    recent_detections = [
        {
            "id": str(ev.id),
            "title": ev.title,
            "event_type": ev.event_type,
            "source": ev.source,
            "severity": ev.severity,
            "risk_score": ev.risk_score,
            "risk_level": ev.risk_level,
            "is_synthetic": ev.is_synthetic,
            "asset_id": str(ev.asset_id) if ev.asset_id else None,
            "asset_tag": (
                asset_map[str(ev.asset_id)].asset_tag
                if ev.asset_id and str(ev.asset_id) in asset_map
                else None
            ),
            "source_ip": ev.source_ip,
            "detection_reasons": ev.detection_reasons or [],
            "occurred_at": ev.occurred_at.isoformat(),
        }
        for ev in events_by_recency
        if ev.detection_reasons
    ][:6]

    recent_incidents = [
        {
            "id": str(inc.id),
            "incident_number": inc.incident_number,
            "title": inc.title,
            "severity": inc.severity,
            "status": inc.status,
            "risk_score": inc.risk_score,
            "risk_level": inc.risk_level,
            "assigned_to_id": (
                str(inc.assigned_to_id) if inc.assigned_to_id else None
            ),
            "detected_at": inc.detected_at.isoformat(),
            "updated_at": inc.updated_at.isoformat(),
        }
        for inc in incidents[:5]
    ]

    asset_risk_overview = sorted(
        per_asset_stats.values(),
        key=lambda item: (item["peak_risk_score"], item["event_count"]),
        reverse=True,
    )

    detection_trend = [
        trend_buckets[k] for k in sorted(trend_buckets.keys())
    ][-12:]

    return {
        "total_assets": len(assets),
        "critical_assets_count": critical_assets_count,
        "total_events": len(events),
        "synthetic_events_count": synthetic_count,
        "non_synthetic_events_count": non_synthetic_count,
        "high_risk_findings_count": high_risk_findings_count,
        "total_incidents": len(incidents),
        "open_incidents": sum(
            1 for inc in incidents if inc.status not in {"recovered", "closed"}
        ),
        "average_event_risk_score": avg_score,
        "highest_event_risk_score": max_score,
        "event_risk_distribution": distribution,
        "event_severity_distribution": severity_distribution,
        "top_risk_events": [
            {
                "id": str(ev.id),
                "title": ev.title,
                "event_type": ev.event_type,
                "severity": ev.severity,
                "is_synthetic": ev.is_synthetic,
                "asset_tag": (
                    asset_map[str(ev.asset_id)].asset_tag
                    if ev.asset_id and str(ev.asset_id) in asset_map
                    else None
                ),
                "risk_score": ev.risk_score,
                "risk_level": ev.risk_level,
                "risk_breakdown": ev.risk_breakdown,
                "occurred_at": ev.occurred_at.isoformat(),
            }
            for ev in events[:10]
        ],
        "recent_detections": recent_detections,
        "recent_incidents": recent_incidents,
        "asset_risk_overview": asset_risk_overview,
        "detection_trend": detection_trend,
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
