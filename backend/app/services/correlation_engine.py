"""Event Correlation Engine for SATRIA SENTINEL.

Groups related SecurityEvents using concrete technical pivots:
1. Shared Source IP within a bounded time window.
2. Shared Target Asset combined with indicator progression or pattern similarity.
3. Multi-stage attack chain progression (Recon -> Credential Access -> Login -> PrivEsc -> Exfil).

STRICT RULE: Events are NEVER correlated merely because they share the same severity level.
"""

from datetime import datetime, timezone
import hashlib
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.security_event import SecurityEvent
from app.services.risk_engine import calculate_risk_assessment, score_security_event

ATTACK_STAGE_ORDER: dict[str, int] = {
    "port_scan_indicator": 1,
    "network_scan": 1,
    "service_enumeration": 1,
    "auth_failure": 2,
    "brute_force_attempt": 2,
    "ssh_failed_login": 2,
    "suspicious_login": 3,
    "auth_success": 3,
    "impossible_travel_login": 3,
    "unusual_access_pattern": 4,
    "high_frequency_access": 4,
    "api_rate_anomaly": 4,
    "privilege_escalation": 5,
    "sudo_abuse": 5,
    "iam_role_escalation": 5,
    "suid_execution": 5,
    "suspicious_outbound_traffic": 6,
    "data_exfiltration_indicator": 6,
    "c2_beaconing": 6,
}


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _evaluate_pair_link(
    ev_a: SecurityEvent,
    ev_b: SecurityEvent,
    window_minutes: int,
) -> list[str]:
    """Return list of concrete correlation reasons between two events, or empty list if unrelated.

    Note: Severity is intentionally ignored here so events with identical severity
    are never grouped without a technical pivot.
    """
    ts_a = _ensure_utc(ev_a.occurred_at)
    ts_b = _ensure_utc(ev_b.occurred_at)
    delta_minutes = abs((ts_b - ts_a).total_seconds()) / 60.0
    if delta_minutes > float(window_minutes):
        return []

    reasons: list[str] = []
    same_src_ip = bool(
        ev_a.source_ip
        and ev_b.source_ip
        and ev_a.source_ip.strip() == ev_b.source_ip.strip()
    )
    same_asset = bool(
        ev_a.asset_id is not None
        and ev_b.asset_id is not None
        and ev_a.asset_id == ev_b.asset_id
    )
    type_a = (ev_a.event_type or "").lower()
    type_b = (ev_b.event_type or "").lower()
    same_pattern = type_a == type_b

    stage_a = ATTACK_STAGE_ORDER.get(type_a, 0)
    stage_b = ATTACK_STAGE_ORDER.get(type_b, 0)
    is_stage_progression = (
        stage_a > 0 and stage_b > 0 and stage_a != stage_b
    )

    # Pivot 1: Same external/internal source IP acting within the time window
    if same_src_ip:
        reasons.append(f"same_source_ip({ev_a.source_ip})")

    # Pivot 2: Same target asset AND (same source IP OR multi-stage progression OR repeated pattern)
    if same_asset and (same_src_ip or is_stage_progression or same_pattern):
        reasons.append(f"same_target_asset({ev_a.asset_id})")

    # Pivot 3: Multi-stage indicator relationship on same asset or source IP
    if (same_src_ip or same_asset) and is_stage_progression:
        reasons.append(f"indicator_progression({type_a}<->{type_b})")

    # Pivot 4: Pattern similarity on same asset or source IP
    if (same_src_ip or same_asset) and same_pattern and len(reasons) > 0:
        reasons.append(f"pattern_similarity({type_a})")

    return reasons


def correlate_security_events(
    db: Session,
    *,
    window_minutes: int = 60,
    min_cluster_size: int = 2,
) -> dict[str, Any]:
    """Identify and persist correlation clusters across SecurityEvents."""
    events = list(
        db.scalars(
            select(SecurityEvent).order_by(SecurityEvent.occurred_at.asc())
        ).all()
    )
    n = len(events)
    if n == 0:
        return {
            "window_minutes": window_minutes,
            "total_events_analyzed": 0,
            "clusters_count": 0,
            "clusters": [],
        }

    # Union-Find to build connected correlation components
    parent = list(range(n))
    pair_reasons: dict[tuple[int, int], list[str]] = {}

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            if ri < rj:
                parent[rj] = ri
            else:
                parent[ri] = rj

    for i in range(n):
        for j in range(i + 1, n):
            reasons = _evaluate_pair_link(
                events[i], events[j], window_minutes=window_minutes
            )
            if reasons:
                union(i, j)
                pair_reasons[(i, j)] = reasons

    groups: dict[int, list[int]] = {}
    for idx in range(n):
        root = find(idx)
        groups.setdefault(root, []).append(idx)

    assets_map: dict[Any, Asset] = {
        a.id: a for a in db.scalars(select(Asset)).all()
    }

    clusters_output: list[dict[str, Any]] = []

    for indices in groups.values():
        if len(indices) < min_cluster_size:
            continue

        cluster_events = [events[i] for i in indices]
        cluster_events.sort(key=lambda e: _ensure_utc(e.occurred_at))

        sorted_ids_concat = "|".join(sorted(str(e.id) for e in cluster_events))
        digest = hashlib.sha256(sorted_ids_concat.encode("utf-8")).hexdigest()[:10].upper()
        corr_id = f"CORR-{digest}"

        source_ips = sorted(
            {e.source_ip for e in cluster_events if e.source_ip}
        )
        asset_ids = sorted(
            {str(e.asset_id) for e in cluster_events if e.asset_id}
        )
        asset_tags = [
            assets_map[e.asset_id].asset_tag
            for e in cluster_events
            if e.asset_id and e.asset_id in assets_map
        ]
        unique_asset_tags = sorted(set(asset_tags))
        event_types_seq: list[str] = []
        for e in cluster_events:
            if not event_types_seq or event_types_seq[-1] != e.event_type:
                event_types_seq.append(e.event_type)

        tactics = sorted(
            {e.mitre_tactic for e in cluster_events if e.mitre_tactic}
        )
        techniques = sorted(
            {e.mitre_technique for e in cluster_events if e.mitre_technique}
        )

        first_ts = _ensure_utc(cluster_events[0].occurred_at)
        last_ts = _ensure_utc(cluster_events[-1].occurred_at)
        span_minutes = round(
            max(0.0, (last_ts - first_ts).total_seconds() / 60.0), 2
        )

        criteria_matched: list[str] = []
        if len(source_ips) == 1 and source_ips[0]:
            criteria_matched.append(f"Shared Source IP ({source_ips[0]})")
        elif source_ips:
            criteria_matched.append(f"Source IPs ({', '.join(source_ips)})")

        if unique_asset_tags:
            criteria_matched.append(
                f"Target Asset(s) ({', '.join(unique_asset_tags)})"
            )
        criteria_matched.append(
            f"Bounded Time Window ({span_minutes} min <= {window_minutes} min)"
        )
        if len(set(event_types_seq)) > 1:
            criteria_matched.append(
                f"Multi-Indicator Progression ({' -> '.join(event_types_seq)})"
            )
        else:
            criteria_matched.append(
                f"Repeated Event Pattern ({event_types_seq[0]} x{len(cluster_events)})"
            )

        explanation = (
            f"Cluster {corr_id} correlated {len(cluster_events)} security events over {span_minutes} minutes "
            f"based on: {'; '.join(criteria_matched)}. "
            "Severity alone was not used as a grouping criterion."
        )

        # Update each event in cluster and recalculate risk with cluster size
        highest_sev = "low"
        sev_rank = {"informational": 1, "low": 2, "medium": 3, "high": 4, "critical": 5}
        primary_asset: Asset | None = None
        all_reasons: list[dict[str, Any]] = []

        for ev in cluster_events:
            ev.correlation_group_id = corr_id
            if sev_rank.get(ev.severity, 2) > sev_rank.get(highest_sev, 2):
                highest_sev = ev.severity
            if primary_asset is None and ev.asset_id and ev.asset_id in assets_map:
                primary_asset = assets_map[ev.asset_id]
            if ev.detection_reasons:
                all_reasons.extend(ev.detection_reasons)
            score_security_event(
                ev,
                asset=assets_map.get(ev.asset_id) if ev.asset_id else None,
                correlated_events_count=len(cluster_events),
            )

        cluster_risk = calculate_risk_assessment(
            severity=highest_sev,
            asset=primary_asset,
            detection_reasons=all_reasons,
            correlated_events_count=len(cluster_events),
            occurred_at=last_ts,
            distinct_tactics_count=max(1, len(tactics)),
        )

        recommended_playbook = "PB-IR-001"
        for r in all_reasons:
            if r.get("playbook_code"):
                recommended_playbook = str(r["playbook_code"])
                break

        clusters_output.append(
            {
                "correlation_group_id": corr_id,
                "events_count": len(cluster_events),
                "first_seen_at": first_ts.isoformat(),
                "last_seen_at": last_ts.isoformat(),
                "span_minutes": span_minutes,
                "source_ips": source_ips,
                "asset_ids": asset_ids,
                "asset_tags": unique_asset_tags,
                "event_progression": event_types_seq,
                "mitre_tactics": tactics,
                "mitre_techniques": techniques,
                "highest_severity": highest_sev,
                "risk_score": cluster_risk["risk_score"],
                "risk_level": cluster_risk["risk_level"],
                "risk_breakdown": cluster_risk,
                "recommended_playbook_code": recommended_playbook,
                "criteria_matched": criteria_matched,
                "correlation_explanation": explanation,
                "events": [
                    {
                        "id": str(ev.id),
                        "title": ev.title,
                        "event_type": ev.event_type,
                        "severity": ev.severity,
                        "source_ip": ev.source_ip,
                        "destination_ip": ev.destination_ip,
                        "asset_id": str(ev.asset_id) if ev.asset_id else None,
                        "occurred_at": _ensure_utc(ev.occurred_at).isoformat(),
                        "risk_score": ev.risk_score,
                        "risk_level": ev.risk_level,
                    }
                    for ev in cluster_events
                ],
            }
        )

    db.commit()
    clusters_output.sort(key=lambda c: c["risk_score"], reverse=True)
    return {
        "window_minutes": window_minutes,
        "total_events_analyzed": n,
        "clusters_count": len(clusters_output),
        "clusters": clusters_output,
    }
