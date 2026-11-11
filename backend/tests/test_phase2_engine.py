"""Comprehensive Phase 2 Backend Acceptance & Security Test Suite for SATRIA SENTINEL.

Covers all Phase 2 Final Acceptance Audit categories:
1. Authentication, Password Hashing (scrypt), JWT Signature/Expiration/Tampering, Logout & Token Revocation.
2. RBAC Enforcement across Admin, Security Analyst, and Viewer roles + Error Hygiene.
3. Log Ingestion Engine (CSV, JSON, Invalid Format, Duplicates, Invalid Rows, Empty File, Oversized Payload, Control Chars & Malicious Payloads).
4. Threat Detection Engine (All 6 Rules + False-Positive Boundaries), Event Correlation Engine (Multi-Factor + Anti-Severity-Only Grouping), and Risk Scoring Engine (0-100 Combinations & Clamping).
5. Incident Lifecycle (Create, Assign Analyst, Change Status, Link Events, Investigation Notes, Resolve) & Immutable Audit Trail.
"""

from datetime import timedelta
import json
import os
import uuid

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password

_PREFIX = os.getenv("SATRIA_DEMO_ACCESS_PREFIX", "Satria")
_SUFFIX = os.getenv("SATRIA_DEMO_ACCESS_SUFFIX", "#2026")
ADMIN_PASS = f"{_PREFIX}Admin{_SUFFIX}"
ANALYST_PASS = f"{_PREFIX}Analyst{_SUFFIX}"
VIEWER_PASS = f"{_PREFIX}Viewer{_SUFFIX}"


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


def test_authentication_password_hashing_jwt_and_logout_revocation(
    client: TestClient,
) -> None:
    """Verify scrypt hashing, login (valid/invalid), JWT signature/expiration, and logout token revocation."""
    # 1. Direct unit verification of scrypt password hashing
    sample_secret = f"UnitCheck!{uuid.uuid4().hex[:8]}"
    digest_1 = hash_password(sample_secret)
    digest_2 = hash_password(sample_secret)
    assert digest_1.startswith("scrypt$")
    assert digest_1 != sample_secret
    assert digest_1 != digest_2  # unique random salt per hash
    assert verify_password(sample_secret, digest_1) is True
    assert verify_password("WrongSecret!", digest_1) is False
    assert verify_password(sample_secret, "malformed_hash_string") is False

    # 2. Invalid login attempts (wrong password & unknown username)
    bad_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "WrongPassword123"},
    )
    assert bad_resp.status_code == 401
    assert bad_resp.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    unknown_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "nonexistent_operator", "password": "WrongPassword123"},
    )
    assert unknown_resp.status_code == 401
    assert unknown_resp.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    # 3. Valid login & /me profile retrieval
    token = _login(client, "admin", ADMIN_PASS)
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "admin"
    assert me_data["role"] == "admin"

    # 4. JWT Signature Tampering & Expiration Checks
    parts = token.split(".")
    tampered_sig = ("A" if parts[2][0] != "A" else "B") + parts[2][1:]
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"
    tampered_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert tampered_resp.status_code == 401
    assert (
        tampered_resp.json()["error"]["code"]
        == "UNAUTHORIZED_INVALID_TOKEN"
    )

    expired_token, _, _ = create_access_token(
        subject=me_data["id"],
        username="admin",
        role="admin",
        expires_minutes=-5,
    )
    expired_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_resp.status_code == 401
    assert expired_resp.json()["error"]["code"] == "UNAUTHORIZED_TOKEN_EXPIRED"

    malformed_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
    )
    assert malformed_resp.status_code == 401

    # 5. Logout revokes the token immediately
    logout_resp = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_resp.status_code == 200

    # Subsequent use of revoked token is rejected with 401
    revoked_resp = client.get("/api/v1/auth/me", headers=headers)
    assert revoked_resp.status_code == 401
    assert revoked_resp.json()["error"]["code"] == "UNAUTHORIZED_TOKEN_REVOKED"


def test_rbac_authorization_and_asset_crud(client: TestClient) -> None:
    """Verify Viewer, Security Analyst, and Admin RBAC boundaries and error response hygiene."""
    # Unauthenticated request rejected
    unauth = client.get("/api/v1/assets")
    assert unauth.status_code == 401

    viewer_token = _login(client, "viewer", VIEWER_PASS)
    analyst_token = _login(client, "analyst", ANALYST_PASS)
    admin_token = _login(client, "admin", ADMIN_PASS)

    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Viewer can read operational GET endpoints
    for get_path in (
        "/api/v1/assets",
        "/api/v1/security-events",
        "/api/v1/incidents",
        "/api/v1/playbooks",
        "/api/v1/audit-logs",
        "/api/v1/detections/rules",
        "/api/v1/risk-assessments/methodology",
    ):
        get_resp = client.get(get_path, headers=viewer_headers)
        assert get_resp.status_code == 200, f"Viewer failed GET {get_path}"

    # Viewer is forbidden from performing Analyst/Admin write operations
    viewer_forbidden_calls = [
        (
            "/api/v1/log-ingestion/generate-synthetic",
            {"scenario": "brute_force", "auto_correlate": False},
        ),
        (
            "/api/v1/log-ingestion/import",
            {"format": "json", "content": "[]"},
        ),
        (
            "/api/v1/incidents",
            {
                "title": "Unauthorized Incident Creation Attempt",
                "severity": "medium",
            },
        ),
        ("/api/v1/detections/run", {}),
        ("/api/v1/correlations/run", {"window_minutes": 60}),
    ]
    for path, body in viewer_forbidden_calls:
        v_resp = client.post(path, json=body, headers=viewer_headers)
        assert v_resp.status_code == 403, f"Viewer was not blocked on POST {path}"
        assert v_resp.json()["error"]["code"] == "FORBIDDEN_INSUFFICIENT_ROLE"

    # Viewer and Analyst are forbidden from Admin-only operations (creating assets & creating users)
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
        forbidden_asset = client.post(
            "/api/v1/assets", json=asset_payload, headers=hdrs
        )
        assert forbidden_asset.status_code == 403
        assert (
            forbidden_asset.json()["error"]["code"]
            == "FORBIDDEN_INSUFFICIENT_ROLE"
        )

        forbidden_user = client.post(
            "/api/v1/users",
            json={
                "username": f"unauth_{uuid.uuid4().hex[:4]}",
                "email": "unauth@satria.local",
                "full_name": "Unauthorized User",
                "password": "ValidPassword#123",
                "role": "viewer",
            },
            headers=hdrs,
        )
        assert forbidden_user.status_code == 403

    # Admin creates a new user and a new asset
    new_username = f"auditor_{uuid.uuid4().hex[:5]}"
    user_create_resp = client.post(
        "/api/v1/users",
        json={
            "username": new_username,
            "email": f"{new_username}@satria-sentinel.local",
            "full_name": "Audit Verification Viewer",
            "password": f"{_PREFIX}Audit{_SUFFIX}",
            "role": "viewer",
        },
        headers=admin_headers,
    )
    assert user_create_resp.status_code == 201
    assert user_create_resp.json()["username"] == new_username

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

    # Analyst cannot delete asset (Admin only)
    analyst_del = client.delete(
        f"/api/v1/assets/{asset_id}", headers=analyst_headers
    )
    assert analyst_del.status_code == 403

    # Admin updates & deletes test asset
    patch_resp = client.patch(
        f"/api/v1/assets/{asset_id}",
        json={"status": "maintenance", "criticality": "critical"},
        headers=admin_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "maintenance"
    assert patch_resp.json()["criticality"] == "critical"

    del_resp = client.delete(
        f"/api/v1/assets/{asset_id}", headers=admin_headers
    )
    assert del_resp.status_code == 204

    # Input validation error hygiene check (no stack trace or internal leakage)
    invalid_input = client.post(
        "/api/v1/assets",
        json={"asset_tag": "!", "name": ""},
        headers=admin_headers,
    )
    assert invalid_input.status_code == 422
    assert "Traceback" not in invalid_input.text
    assert "postgresql://" not in invalid_input.text


def test_log_ingestion_csv_json_duplicates_limits_and_malicious_payloads(
    client: TestClient,
) -> None:
    """Verify CSV/JSON ingestion, invalid formats, duplicates, empty/oversized files, and malicious payload sanitization."""
    analyst_token = _login(client, "analyst", ANALYST_PASS)
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Invalid format & disallowed filename extension rejected with 400
    bad_fmt = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "xml", "content": "<events></events>"},
        headers=analyst_headers,
    )
    assert bad_fmt.status_code == 400
    assert bad_fmt.json()["error"]["code"] == "UNSUPPORTED_LOG_FORMAT"

    bad_ext = client.post(
        "/api/v1/log-ingestion/import",
        json={
            "format": "json",
            "filename": "suspicious_binary.exe",
            "content": "[]",
        },
        headers=analyst_headers,
    )
    assert bad_ext.status_code == 400
    assert bad_ext.json()["error"]["code"] == "UNSUPPORTED_LOG_FORMAT"

    # 2. Empty file / whitespace / zero-record array rejected with 400
    for empty_content in ("", "   \n\t  ", "[]"):
        empty_resp = client.post(
            "/api/v1/log-ingestion/import",
            json={"format": "json", "content": empty_content},
            headers=analyst_headers,
        )
        assert empty_resp.status_code == 400
        assert empty_resp.json()["error"]["code"] == "EMPTY_LOG_CONTENT"

    # 3. File exceeding MAX_UPLOAD_SIZE_BYTES rejected with 413
    settings = get_settings()
    oversized_content = "x" * (settings.MAX_UPLOAD_SIZE_BYTES + 1024)
    oversized_resp = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "csv", "content": oversized_content},
        headers=analyst_headers,
    )
    assert oversized_resp.status_code == 413
    assert oversized_resp.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"

    # 4. Invalid JSON structure & invalid CSV headers rejected with 400
    bad_json = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "json", "content": "{not-valid-json"},
        headers=analyst_headers,
    )
    assert bad_json.status_code == 400
    assert bad_json.json()["error"]["code"] == "INVALID_JSON_STRUCTURE"

    bad_csv = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "csv", "content": "wrong_col1,wrong_col2\nval1,val2"},
        headers=analyst_headers,
    )
    assert bad_csv.status_code == 400
    assert bad_csv.json()["error"]["code"] == "INVALID_CSV_COLUMNS"

    # 5. Valid JSON batch with 1 valid event, 1 duplicate, 1 invalid row, and 1 malicious/control-char payload
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
        {
            "asset_tag": "AST-WEB-003",
            "event_type": "suspicious_login",
            "source": "waf\x00\x07_sensor",
            "severity": "medium",
            "title": f"=cmd|' /C calc'!A0 \x00\x1b[31m; rm -rf /; $(whoami) {run_id}",
            "description": "<script>alert('xss')</script> ' OR 1=1 -- \x00\x08",
            "source_ip": "198.51.100.202",
            "occurred_at": "2026-11-11T02:15:00Z",
            "raw_payload": {"off_hours": True},
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
    assert summary["total_received"] == 4
    assert summary["imported_count"] == 2
    assert summary["duplicates_skipped"] == 1
    assert summary["failed_count"] == 1
    assert summary["detections_triggered"] == 2

    # Verify control chars were stripped and formula prefix neutralized without code execution
    sanitized_event_id = summary["imported_event_ids"][1]
    ev_detail = client.get(
        f"/api/v1/security-events/{sanitized_event_id}",
        headers=analyst_headers,
    )
    assert ev_detail.status_code == 200
    ev_json = ev_detail.json()
    assert "\x00" not in ev_json["title"]
    assert "\x1b" not in ev_json["title"]
    assert ev_json["title"].startswith("'=cmd")
    assert ev_json["source"] == "waf_sensor"

    # 6. Valid CSV import
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


def test_all_six_detection_rules_false_positive_boundaries_and_risk_combinations(
    client: TestClient,
) -> None:
    """Test all 6 detection rules individually, false-positive boundaries, and risk scoring combinations."""
    analyst_token = _login(client, "analyst", ANALYST_PASS)
    headers = {"Authorization": f"Bearer {analyst_token}"}
    tag = uuid.uuid4().hex[:6]

    # 1. Six events that match each of the 6 deterministic rules
    matching_events = [
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "auth_failure",
            "source": "sshd",
            "severity": "high",
            "title": f"[SYNTHETIC SIMULATION] Rule 1 Brute Force {tag}",
            "source_ip": "198.51.100.11",
            "occurred_at": "2026-11-11T11:00:00Z",
            "raw_payload": {"failed_attempts": 7},
        },
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "suspicious_login",
            "source": "sso-idp",
            "severity": "high",
            "title": f"[SYNTHETIC SIMULATION] Rule 2 Suspicious Login {tag}",
            "source_ip": "198.51.100.12",
            "occurred_at": "2026-11-11T02:00:00Z",
            "raw_payload": {"anomalous_geo": True, "off_hours": True},
        },
        {
            "asset_tag": "AST-DB-002",
            "event_type": "unusual_access_pattern",
            "source": "db-audit",
            "severity": "medium",
            "title": f"[SYNTHETIC SIMULATION] Rule 3 Unusual Access {tag}",
            "source_ip": "198.51.100.13",
            "occurred_at": "2026-11-11T11:05:00Z",
            "raw_payload": {"requests_per_minute": 180},
        },
        {
            "asset_tag": "AST-WKS-004",
            "event_type": "privilege_escalation",
            "source": "auditd",
            "severity": "critical",
            "title": f"[SYNTHETIC SIMULATION] Rule 4 Priv Esc {tag}",
            "source_ip": "198.51.100.14",
            "occurred_at": "2026-11-11T11:10:00Z",
            "raw_payload": {"target_privilege": "root"},
        },
        {
            "asset_tag": "AST-DB-002",
            "event_type": "suspicious_outbound_traffic",
            "source": "egress-fw",
            "severity": "critical",
            "title": f"[SYNTHETIC SIMULATION] Rule 5 Outbound Exfil {tag}",
            "source_ip": "10.20.2.15",
            "destination_ip": "203.0.113.99",
            "occurred_at": "2026-11-11T11:15:00Z",
            "raw_payload": {"bytes_out": 75_000_000, "destination_port": 8443},
        },
        {
            "asset_tag": "AST-WEB-003",
            "event_type": "port_scan_indicator",
            "source": "ids-suricata",
            "severity": "medium",
            "title": f"[SYNTHETIC SIMULATION] Rule 6 Port Scan {tag}",
            "source_ip": "203.0.113.55",
            "occurred_at": "2026-11-11T11:20:00Z",
            "raw_payload": {"distinct_ports_probed": 25},
        },
    ]

    pos_resp = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "json", "content": json.dumps(matching_events)},
        headers=headers,
    )
    assert pos_resp.status_code == 201
    pos_summary = pos_resp.json()
    assert pos_summary["imported_count"] == 6
    assert pos_summary["detections_triggered"] == 6

    expected_rules = {
        "SATRIA-RULE-BF-001",
        "SATRIA-RULE-AUTH-002",
        "SATRIA-RULE-ACC-003",
        "SATRIA-RULE-PRIV-004",
        "SATRIA-RULE-EXFIL-005",
        "SATRIA-RULE-RECON-006",
    }
    observed_rules: set[str] = set()
    for ev_id in pos_summary["imported_event_ids"]:
        ev_data = client.get(
            f"/api/v1/security-events/{ev_id}", headers=headers
        ).json()
        assert len(ev_data["detection_reasons"]) >= 1
        for reason_obj in ev_data["detection_reasons"]:
            observed_rules.add(reason_obj["rule_id"])
            assert len(reason_obj["reason"]) > 15
            assert len(reason_obj["recommended_action"]) > 10
    assert expected_rules.issubset(observed_rules)

    # 2. False-positive boundary events (below threshold / benign telemetry)
    benign_ip = f"198.18.{int(tag[:2], 16)}.{int(tag[2:4], 16)}"
    benign_events = [
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "auth_failure",
            "source": "sshd",
            "severity": "low",
            "title": f"[SYNTHETIC SIMULATION] Benign Single Typo {tag}",
            "source_ip": benign_ip,
            "occurred_at": "2026-11-11T12:00:00Z",
            "raw_payload": {"failed_attempts": 1},
        },
        {
            "asset_tag": "AST-WEB-003",
            "event_type": "normal_http_request",
            "source": "nginx",
            "severity": "low",
            "title": f"[SYNTHETIC SIMULATION] Benign Web Request {tag}",
            "source_ip": "192.0.2.51",
            "occurred_at": "2026-11-11T12:05:00Z",
            "raw_payload": {"requests_per_minute": 12, "bytes_out": 4096, "destination_port": 443},
        },
        {
            "asset_tag": "AST-WEB-003",
            "event_type": "network_connection",
            "source": "firewall",
            "severity": "low",
            "title": f"[SYNTHETIC SIMULATION] Benign 3-Port Check {tag}",
            "source_ip": "192.0.2.52",
            "occurred_at": "2026-11-11T12:10:00Z",
            "raw_payload": {"distinct_ports_probed": 3},
        },
    ]

    neg_resp = client.post(
        "/api/v1/log-ingestion/import",
        json={"format": "json", "content": json.dumps(benign_events)},
        headers=headers,
    )
    assert neg_resp.status_code == 201
    neg_summary = neg_resp.json()
    assert neg_summary["imported_count"] == 3
    assert neg_summary["detections_triggered"] == 0

    # 3. Verify Risk Scoring Engine across multiple combinations & 0-100 clamping
    assets_list = client.get("/api/v1/assets", headers=headers).json()["items"]
    critical_asset_id = next(
        a["id"] for a in assets_list if a["criticality"] == "critical"
    )
    combinations = [
        (
            {
                "severity": "low",
                "rule_confidence": 0.0,
                "correlated_events_count": 1,
                "distinct_tactics_count": 1,
            },
            "low",
        ),
        (
            {
                "severity": "medium",
                "rule_confidence": 0.65,
                "correlated_events_count": 2,
                "distinct_tactics_count": 1,
            },
            "medium",
        ),
        (
            {
                "severity": "high",
                "rule_confidence": 0.85,
                "correlated_events_count": 3,
                "distinct_tactics_count": 2,
            },
            "high",
        ),
        (
            {
                "severity": "critical",
                "asset_id": critical_asset_id,
                "rule_confidence": 1.0,
                "correlated_events_count": 25,
                "distinct_tactics_count": 5,
            },
            "critical",
        ),
    ]
    for payload, expected_level in combinations:
        r_resp = client.post(
            "/api/v1/risk-assessments/calculate",
            json=payload,
            headers=headers,
        )
        assert r_resp.status_code == 200
        r_body = r_resp.json()
        assert 0 <= r_body["risk_score"] <= 100
        assert r_body["risk_level"] == expected_level


def test_synthetic_generator_correlation_incident_lifecycle_and_audit_trail(
    client: TestClient,
) -> None:
    """Verify synthetic generator, anti-false-correlation, full incident lifecycle (assign, link, status, note, resolve), and audit logs."""
    analyst_token = _login(client, "analyst", ANALYST_PASS)
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

    # 2. Verify Correlation Engine does NOT group unrelated events solely by identical severity
    iso_id = uuid.uuid4().hex[:6]
    unrelated_events = [
        {
            "asset_tag": "AST-IAM-001",
            "event_type": "auth_failure",
            "source": "sensor_a",
            "severity": "critical",
            "title": f"[SYNTHETIC SIMULATION] Isolated Critical A {iso_id}",
            "source_ip": "192.0.2.111",
            "occurred_at": "2026-01-01T01:00:00Z",
        },
        {
            "asset_tag": "AST-NET-005",
            "event_type": "suspicious_login",
            "source": "sensor_b",
            "severity": "critical",
            "title": f"[SYNTHETIC SIMULATION] Isolated Critical B {iso_id}",
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
        assert not iso_ids.issubset(cluster_ev_ids)
        assert "Severity alone was not used" in cluster["correlation_explanation"]

    # 3. Incident Management Full Lifecycle (create -> assign analyst -> link events -> status -> note -> resolve)
    users_resp = client.get("/api/v1/users", headers=headers)
    assert users_resp.status_code == 200
    analyst_user = next(
        u for u in users_resp.json()["items"] if u["username"] == "analyst"
    )

    top_cluster = clusters[0]
    initial_event_ids = [top_cluster["events"][0]["id"]]
    additional_event_id = top_cluster["events"][1]["id"]

    inc_create = client.post(
        "/api/v1/incidents",
        json={
            "title": "Correlated Credential Access & Privilege Escalation Case",
            "summary": "Multi-stage synthetic campaign detected across IAM and Vault assets.",
            "severity": "critical",
            "security_event_ids": initial_event_ids,
            "correlation_explanation": top_cluster["correlation_explanation"],
        },
        headers=headers,
    )
    assert inc_create.status_code == 201
    incident = inc_create.json()
    inc_id = incident["id"]
    assert len(incident["linked_events"]) == 1

    # Assign analyst via POST /api/v1/incidents/{inc_id}/assign
    assign_resp = client.post(
        f"/api/v1/incidents/{inc_id}/assign",
        json={
            "assigned_to_id": analyst_user["id"],
            "notes": "Assigned to Senior Security Analyst for containment.",
        },
        headers=headers,
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["assigned_to_id"] == analyst_user["id"]

    # Link additional security event via POST /api/v1/incidents/{inc_id}/link-events
    link_resp = client.post(
        f"/api/v1/incidents/{inc_id}/link-events",
        json={
            "security_event_ids": [additional_event_id],
            "correlation_role": "secondary_indicator",
            "analyst_notes": "Linked secondary stage indicator from same source IP.",
        },
        headers=headers,
    )
    assert link_resp.status_code == 200
    assert len(link_resp.json()["linked_events"]) == 2

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
        json={
            "note": "Confirmed synthetic simulation run; verified IAM session revocation procedure."
        },
        headers=headers,
    )
    assert note_resp.status_code == 200
    assert len(note_resp.json()["timeline_json"]) >= 4

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

    # 4. Verify Response Playbooks recommendation
    pb_rec = client.get(
        "/api/v1/playbooks/recommend?incident_type=brute_force",
        headers=headers,
    )
    assert pb_rec.status_code == 200
    assert pb_rec.json()["advisory_only"] is True
    assert pb_rec.json()["recommended_playbook"]["code"] == "PB-IR-002"

    # 5. Verify Audit Logs captured all critical operational actions
    audit_resp = client.get(
        "/api/v1/audit-logs?page=1&page_size=100", headers=headers
    )
    assert audit_resp.status_code == 200
    logged_actions = {item["action"] for item in audit_resp.json()["items"]}
    for expected_action in (
        "auth.login_success",
        "log_ingestion.synthetic_generated",
        "log_ingestion.imported",
        "incident.created",
        "incident.assigned",
        "incident.events_linked",
        "incident.status_changed",
        "incident.note_added",
        "incident.resolved",
    ):
        assert (
            expected_action in logged_actions
        ), f"Missing audit log action: {expected_action}"


def test_incident_complete_lifecycle_open_investigating_contained_closed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify complete incident lifecycle: open -> investigating -> contained -> closed with persistence, root cause, timeline, audit logs, and RBAC restrictions."""
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long!")

    analyst_token = _login(client, "analyst", ANALYST_PASS)
    viewer_token = _login(client, "viewer", VIEWER_PASS)
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # 1. Create incident as analyst (initial status: open)
    create_resp = client.post(
        "/api/v1/incidents",
        json={
            "title": "Lifecycle Verification Incident: Unauthorized C2 Channel",
            "summary": "Telemetry indicates potential data beaconing activity.",
            "severity": "high",
        },
        headers=analyst_headers,
    )
    assert create_resp.status_code == 201
    inc_data = create_resp.json()
    inc_id = inc_data["id"]
    assert inc_data["status"] == "open"
    assert inc_data["resolved_at"] is None

    # 2. Verify unauthorized role (viewer) cannot transition status
    viewer_attempt = client.post(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "investigating", "notes": "Viewer attempt"},
        headers=viewer_headers,
    )
    assert viewer_attempt.status_code == 403

    # 3. Transition status: open -> investigating (analyst)
    inv_resp = client.post(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "investigating",
            "notes": "Analyst initiated forensic triage and egress packet capture.",
        },
        headers=analyst_headers,
    )
    assert inv_resp.status_code == 200
    assert inv_resp.json()["status"] == "investigating"

    # 4. Verify viewer cannot add notes
    viewer_note = client.post(
        f"/api/v1/incidents/{inc_id}/notes",
        json={"note": "Viewer note attempt"},
        headers=viewer_headers,
    )
    assert viewer_note.status_code == 403

    # 5. Analyst appends investigation note
    note_resp = client.post(
        f"/api/v1/incidents/{inc_id}/notes",
        json={"note": "Egress flow telemetry confirmed anomalous port 4444 traffic."},
        headers=analyst_headers,
    )
    assert note_resp.status_code == 200

    # 6. Transition status: investigating -> contained (analyst)
    cont_resp = client.post(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "contained",
            "notes": "Border firewall ACL applied; malicious destination IP blocked.",
        },
        headers=analyst_headers,
    )
    assert cont_resp.status_code == 200
    assert cont_resp.json()["status"] == "contained"

    # 7. Verify viewer cannot resolve incident
    viewer_resolve = client.post(
        f"/api/v1/incidents/{inc_id}/resolve",
        json={
            "root_cause_notes": "Attempted resolution by viewer",
            "resolution_status": "closed",
        },
        headers=viewer_headers,
    )
    assert viewer_resolve.status_code == 403

    # 8. Verify root cause is required (short or missing root_cause_notes is rejected)
    short_resolve = client.post(
        f"/api/v1/incidents/{inc_id}/resolve",
        json={
            "root_cause_notes": "tiny",
            "resolution_status": "closed",
        },
        headers=analyst_headers,
    )
    assert short_resolve.status_code == 422

    # 9. Resolve incident with resolution_status='closed' and comprehensive root cause
    root_cause = "Outbound connection initiated by misconfigured diagnostic container. Service quarantined and credentials revoked."
    resolve_resp = client.post(
        f"/api/v1/incidents/{inc_id}/resolve",
        json={
            "root_cause_notes": root_cause,
            "resolution_status": "closed",
        },
        headers=analyst_headers,
    )
    assert resolve_resp.status_code == 200
    resolved_data = resolve_resp.json()
    assert resolved_data["status"] == "closed"
    assert resolved_data["resolved_at"] is not None
    assert resolved_data["root_cause_notes"] == root_cause

    # 10. Verify persistence via direct GET /api/v1/incidents/{inc_id}
    fetch_resp = client.get(f"/api/v1/incidents/{inc_id}", headers=analyst_headers)
    assert fetch_resp.status_code == 200
    persisted = fetch_resp.json()
    assert persisted["status"] == "closed"
    assert persisted["root_cause_notes"] == root_cause
    assert persisted["resolved_at"] is not None

    # 11. Verify incident timeline contains all status changes and entries
    timeline_titles = [entry["title"] for entry in persisted["timeline_json"]]
    assert any("open -> investigating" in t for t in timeline_titles)
    assert any("investigation note added" in t.lower() for t in timeline_titles)
    assert any("investigating -> contained" in t for t in timeline_titles)
    assert any("incident resolved" in t.lower() for t in timeline_titles)

    # 12. Verify audit trail captures the actions
    audit_resp = client.get("/api/v1/audit-logs?page=1&page_size=50", headers=analyst_headers)
    assert audit_resp.status_code == 200
    logged_actions = {item["action"] for item in audit_resp.json()["items"]}
    assert "incident.status_changed" in logged_actions
    assert "incident.note_added" in logged_actions
    assert "incident.resolved" in logged_actions

