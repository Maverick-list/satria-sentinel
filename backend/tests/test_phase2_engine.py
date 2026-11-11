"""Comprehensive Phase 2 Backend Test Suite for SATRIA SENTINEL.

Tests:
1. Authentication (login, /me, invalid password, logout & token revocation).
2. Authorization & RBAC (Admin vs. Security Analyst vs. Viewer access enforcement).
3. Asset CRUD (create, list/search, update, delete, duplicate tag rejection).
4. Synthetic Security Log Generator (all scenarios, synthetic marker verification).
5. Log Ingestion Engine (CSV & JSON import, duplicate detection, invalid format/structure handling).
6. Threat Detection Engine (all 6 deterministic rules, explainable reason recording).
7. Event Correlation Engine (shared IP/asset/progression clustering, non-grouping of same-severity unrelated events).
8. Risk Scoring Engine (0-100 deterministic score, factor breakdown, category thresholds).
9. Incident Management Workflow (create, link events, assign, status change, investigation notes, resolve).
10. Response Playbooks (list & advisory recommendation).
11. Audit Trail verification across all critical actions.
"""

import json
import uuid

from fastapi.testclient import TestClient


def _login(client: TestClient, username: str, password: str) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert "password_hash" not in resp.text
    return data["access_token"]


def test_authentication_and_logout_revocation(client: TestClient) -> None:
    """Verify login, profile retrieval, invalid credentials rejection, and logout token revocation."""
    # Invalid login attempt
    bad_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "WrongPassword123"},
    )
    assert bad_resp.status_code == 401
    assert bad_resp.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    # Valid login
    token = _login(client, "admin", "SatriaAdmin#2026")
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin"
    assert me_resp.json()["role"] == "admin"

    # Logout revokes the token immediately
    logout_resp = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_resp.status_code == 200

    # Subsequent use of revoked token is rejected with 401
    revoked_resp = client.get("/api/v1/auth/me", headers=headers)
    assert revoked_resp.status_code == 401
    assert revoked_resp.json()["error"]["code"] == "UNAUTHORIZED_TOKEN_REVOKED"


def test_rbac_authorization_and_asset_crud(client: TestClient) -> None:
    """Verify Viewer/Analyst cannot create/modify assets while Admin can perform full Asset CRUD."""
    # Unauthenticated request rejected
    unauth = client.get("/api/v1/assets")
    assert unauth.status_code == 401

    viewer_token = _login(client, "viewer", "SatriaViewer#2026")
    analyst_token = _login(client, "analyst", "SatriaAnalyst#2026")
    admin_token = _login(client, "admin", "SatriaAdmin#2026")

    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Viewer can read assets
    list_resp = client.get("/api/v1/assets", headers=viewer_headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 5

    # Viewer and Analyst are forbidden from creating assets (Admin only)
    unique_tag = f"AST-TEST-{uuid.uuid4().hex[:6].upper()}"
    asset_payload = {
        "asset_tag": unique_tag,
        "name": "Test Honeypot Telemetry Collector",
        "hostname": "collector-test.satria.local",
        "ip_address": "10.20.99.10",
        "asset_type": "server",
        "environment": "staging",
        "criticality": "high",
        "status": "active",
        "operating_system": "Ubuntu 24.04",
    }

    for hdrs in (viewer_headers, analyst_headers):
        forbidden = client.post(
            "/api/v1/assets", json=asset_payload, headers=hdrs
        )
        assert forbidden.status_code == 403
        assert (
            forbidden.json()["error"]["code"] == "FORBIDDEN_INSUFFICIENT_ROLE"
        )

    # Admin creates asset
    create_resp = client.post(
        "/api/v1/assets", json=asset_payload, headers=admin_headers
    )
    assert create_resp.status_code == 201
    created_asset = create_resp.json()
    asset_id = created_asset["id"]
    assert created_asset["asset_tag"] == unique_tag

    # Duplicate asset_tag rejected with 409
    dup_resp = client.post(
        "/api/v1/assets", json=asset_payload, headers=admin_headers
    )
    assert dup_resp.status_code == 409

    # Admin updates asset
    patch_resp = client.patch(
        f"/api/v1/assets/{asset_id}",
        json={"status": "maintenance", "criticality": "critical"},
        headers=admin_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "maintenance"
    assert patch_resp.json()["criticality"] == "critical"

    # Admin deletes test asset
    del_resp = client.delete(
        f"/api/v1/assets/{asset_id}", headers=admin_headers
    )
    assert del_resp.status_code == 204


def test_log_ingestion_csv_json_duplicates_and_invalid_handling(
    client: TestClient,
) -> None:
    """Verify CSV and JSON ingestion, duplicate detection, and invalid file/row error reporting."""
    analyst_token = _login(client, "analyst", "SatriaAnalyst#2026")
    viewer_token = _login(client, "viewer", "SatriaViewer#2026")
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # Viewer cannot import logs
    viewer_import = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "json", "content": "[]"},
        headers=viewer_headers,
    )
    assert viewer_import.status_code == 403

    # Invalid JSON structure rejected with 400
    bad_json = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "json", "content": "{not-valid-json"},
        headers=analyst_headers,
    )
    assert bad_json.status_code == 400
    assert bad_json.json()["error"]["code"] == "INVALID_JSON_STRUCTURE"

    # Invalid CSV missing required columns rejected with 400
    bad_csv = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "csv", "content": "wrong_col1,wrong_col2\nval1,val2"},
        headers=analyst_headers,
    )
    assert bad_csv.status_code == 400
    assert bad_csv.json()["error"]["code"] == "INVALID_CSV_COLUMNS"

    # Valid JSON batch with 1 valid event, 1 duplicate of that event, and 1 malformed row
    run_id = uuid.uuid4().hex[:6]
    json_events = [
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "auth_failure",
            "source": "pytest_json_importer",
            "severity": "high",
            "title": f"[SYNTHETIC SIMULATION] Brute Force Test {run_id}",
            "source_ip": "198.51.100.201",
            "destination_ip": "10.20.1.10",
            "occurred_at": "2026-11-11T10:00:00Z",
            "raw_payload": {"failed_attempts": 12},
        },
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "auth_failure",
            "source": "pytest_json_importer",
            "severity": "high",
            "title": f"[SYNTHETIC SIMULATION] Brute Force Test {run_id}",
            "source_ip": "198.51.100.201",
            "destination_ip": "10.20.1.10",
            "occurred_at": "2026-11-11T10:00:00Z",
            "raw_payload": {"failed_attempts": 12},
        },
        {
            "event_type": "auth_failure",
            "source": "pytest_json_importer",
            "severity": "not_a_valid_severity",
            "title": "Malformed Row",
            "occurred_at": "2026-11-11T10:01:00Z",
        },
    ]

    json_resp = client.post(
        "/api/v1/log-ingestion/import",
        json={
            "format": "json",
            "filename": "test_batch.json",
            "content": json.dumps(json_events),
        },
        headers=analyst_headers,
    )
    assert json_resp.status_code == 201
    summary = json_resp.json()
    assert summary["total_received"] == 3
    assert summary["imported_count"] == 1
    assert summary["duplicates_skipped"] == 1
    assert summary["failed_count"] == 1
    assert summary["detections_triggered"] == 1

    # Valid CSV import
    csv_content = (
        "asset_tag,event_type,source,severity,title,source_ip,destination_ip,occurred_at,distinct_ports_probed\n"
        f"AST-WEB-003,port_scan_indicator,pytest_csv_sensor,medium,[SYNTHETIC SIMULATION] CSV Port Scan {run_id},203.0.113.77,10.20.1.25,2026-11-11T10:05:00Z,30\n"
    )
    csv_resp = client.post(
        "/api/v1/log-ingestion/import",
        json={
            "format": "csv",
            "filename": "scan_events.csv",
            "content": csv_content,
        },
        headers=analyst_headers,
    )
    assert csv_resp.status_code == 201
    csv_summary = csv_resp.json()
    assert csv_summary["imported_count"] == 1
    assert csv_summary["detections_triggered"] == 1


def test_synthetic_generator_detections_correlation_risk_and_incident_workflow(
    client: TestClient,
) -> None:
    """Verify full end-to-end operational pipeline: synthetic generator, detections, correlation, risk, incidents, playbooks, and audit logs."""
    analyst_token = _login(client, "analyst", "SatriaAnalyst#2026")
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Generate all synthetic scenarios
    gen_resp = client.post(
        "/api/v1/log-ingestion/generate-synthetic",
        json={"scenario": "all_scenarios", "auto_correlate": True},
        headers=headers,
    )
    assert gen_resp.status_code == 201
    gen_data = gen_resp.json()
    assert gen_data["synthetic_marker"] == "[SYNTHETIC SIMULATION]"
    assert gen_data["ingestion_summary"]["imported_count"] >= 10
    assert gen_data["ingestion_summary"]["detections_triggered"] >= 10
    assert gen_data["correlation_summary"]["clusters_count"] >= 2

    # 2. Verify detection rules catalog and explainable findings
    rules_resp = client.get("/api/v1/detections/rules", headers=headers)
    assert rules_resp.status_code == 200
    assert rules_resp.json()["rules_count"] >= 6

    findings_resp = client.get("/api/v1/detections/findings", headers=headers)
    assert findings_resp.status_code == 200
    findings = findings_resp.json()["findings"]
    assert len(findings) >= 10
    for f in findings:
        assert len(f["detection_reasons"]) >= 1
        assert "reason" in f["detection_reasons"][0]
        assert "rule_id" in f["detection_reasons"][0]
        assert "recommended_action" in f["detection_reasons"][0]

    # 3. Verify Correlation Engine does NOT group unrelated events solely by identical severity
    iso_id = uuid.uuid4().hex[:6]
    unrelated_events = [
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "auth_failure",
            "source": "sensor_a",
            "severity": "high",
            "title": f"[SYNTHETIC SIMULATION] Isolated Event A {iso_id}",
            "source_ip": "192.0.2.111",
            "occurred_at": "2026-01-01T01:00:00Z",
        },
        {
            "asset_tag": "AST-NET-005",
            "event_type": "suspicious_login",
            "source": "sensor_b",
            "severity": "high",
            "title": f"[SYNTHETIC SIMULATION] Isolated Event B {iso_id}",
            "source_ip": "192.0.2.222",
            "occurred_at": "2026-01-01T01:02:00Z",
        },
    ]
    imp_iso = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "json", "content": json.dumps(unrelated_events)},
        headers=headers,
    )
    assert imp_iso.status_code == 201
    iso_ids = set(imp_iso.json()["imported_event_ids"])

    corr_resp = client.post(
        "/api/v1/correlations/run",
        json={"window_minutes": 60, "min_cluster_size": 2},
        headers=headers,
    )
    assert corr_resp.status_code == 200
    clusters = corr_resp.json()["clusters"]
    assert len(clusters) >= 2
    for cluster in clusters:
        cluster_ev_ids = {e["id"] for e in cluster["events"]}
        # Ensure the two unrelated same-severity events were NEVER grouped together
        assert not iso_ids.issubset(cluster_ev_ids)
        assert "Severity alone was not used" in cluster["correlation_explanation"]

    # 4. Verify Risk Scoring Engine (0-100 scale, factor breakdown, explanation)
    risk_calc = client.post(
        "/api/v1/risk-assessments/calculate",
        json={
            "severity": "critical",
            "rule_confidence": 0.92,
            "correlated_events_count": 5,
            "distinct_tactics_count": 3,
        },
        headers=headers,
    )
    assert risk_calc.status_code == 200
    r_data = risk_calc.json()
    assert 0 <= r_data["risk_score"] <= 100
    assert r_data["risk_level"] in {"low", "medium", "high", "critical"}
    assert len(r_data["factors"]) == 5
    assert "not a statistical probability" in r_data["explanation"]

    # 5. Incident Management Full Lifecycle (create -> status -> note -> link -> resolve)
    top_cluster = clusters[0]
    cluster_event_ids = [e["id"] for e in top_cluster["events"][:2]]

    inc_create = client.post(
        "/api/v1/incidents",
        json={
            "title": "Correlated Credential Access & Privilege Escalation Case",
            "summary": "Multi-stage synthetic campaign detected across IAM and Vault assets.",
            "severity": "critical",
            "security_event_ids": cluster_event_ids,
            "correlation_explanation": top_cluster["correlation_explanation"],
        },
        headers=headers,
    )
    assert inc_create.status_code == 201
    incident = inc_create.json()
    inc_id = incident["id"]
    assert incident["risk_score"] >= 70
    assert len(incident["linked_events"]) == 2

    # Transition status to containment
    status_resp = client.post(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "containment",
            "notes": "Initiated advisory containment steps per PB-IR-001.",
        },
        headers=headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "containment"

    # Add investigation note
    note_resp = client.post(
        f"/api/v1/incidents/{inc_id}/notes",
        json={"note": "Confirmed synthetic simulation run; verified IAM session revocation procedure."},
        headers=headers,
    )
    assert note_resp.status_code == 200
    assert len(note_resp.json()["timeline_json"]) >= 3

    # Resolve incident
    resolve_resp = client.post(
        f"/api/v1/incidents/{inc_id}/resolve",
        json={
            "root_cause_notes": "Synthetic evaluation scenario completed; credentials rotated and rate limits verified.",
            "resolution_status": "recovered",
        },
        headers=headers,
    )
    assert resolve_resp.status_code == 200
    resolved_inc = resolve_resp.json()
    assert resolved_inc["status"] == "recovered"
    assert resolved_inc["resolved_at"] is not None

    # 6. Verify Response Playbooks recommendation
    pb_rec = client.get(
        "/api/v1/playbooks/recommend?incident_type=brute_force",
        headers=headers,
    )
    assert pb_rec.status_code == 200
    assert pb_rec.json()["advisory_only"] is True
    assert pb_rec.json()["recommended_playbook"]["code"] == "PB-IR-002"

    # 7. Verify Audit Logs captured operational actions
    audit_resp = client.get(
        "/api/v1/audit-logs?page=1&page_size=50", headers=headers
    )
    assert audit_resp.status_code == 200
    logged_actions = {item["action"] for item in audit_resp.json()["items"]}
    assert "auth.login_success" in logged_actions
    assert "log_ingestion.synthetic_generated" in logged_actions
    assert "incident.created" in logged_actions
    assert "incident.status_changed" in logged_actions
    assert "incident.resolved" in logged_actions
