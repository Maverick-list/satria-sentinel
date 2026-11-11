# SATRIA SENTINEL — Technical Boundaries & Known Limitations
**Document ID**: `SATRIA-LIMITATIONS-2026`  
**Execution Timestamp**: 12 November 2026, 00:32 WIB  
**Target Category**: Kartika Cyber Hackathon 2026 — Penangkalan (Cyber Defense)

---

## 1. Architectural & Prototype Boundaries

In compliance with competition guidelines and engineering integrity, the following prototype boundaries are documented:

### 1.1 Process-Local JWT Blacklist
- **Current Behavior**: When an operator logs out, the JWT ID (`jti`) is stored in an in-memory set (`_REVOKED_TOKEN_JTIS: set[str]`).
- **Limitation**: In a distributed multi-worker backend deployment (e.g. Gunicorn with multiple Uvicorn workers or clustered Kubernetes pods), revocation is isolated to the process handling the logout request.
- **Production Recommendation**: Integrate Redis or database-backed token blacklisting with TTL matching token expiration.

### 1.2 Application-Level Append-Only Audit Logging
- **Current Behavior**: Application-level append-only audit logging; direct database modification is not technically prevented. No `POST`, `PUT`, `PATCH`, or `DELETE` endpoints exist for audit logs in the API layer.
- **Limitation**: A PostgreSQL database administrator with direct superuser SQL access could technically modify or truncate rows in the table.
- **Production Recommendation**: Implement PostgreSQL `BEFORE UPDATE OR DELETE` triggers that raise exceptions, or stream audit events in real-time to a write-once SIEM (e.g. Wazuh, Splunk, or immutable CloudWatch/Cloud Storage logs).

### 1.3 Advisory-Only Defensive Playbooks
- **Current Behavior**: Playbooks provide structured, copyable CLI remediation commands (`iptables`, `systemctl`, `pkill`) with safety verification checklists.
- **Design Decision**: The platform intentionally enforces a human-in-the-loop operational model rather than executing autonomous destructive commands on critical network infrastructure.
- **Future Roadmap**: Implement authenticated SOAR agent execution with explicit dual-analyst authorization.

### 1.4 Synthetic Telemetry Data
- **Current Behavior**: All security logs, network traces, and host telemetry are generated synthetically or imported from authorized benchmark datasets.
- **Policy Compliance**: Zero classified, sensitive personal, or unauthorized operational military data is included.
- **No Certification Claims**: The prototype does not claim formal military security certification (e.g. Common Criteria EAL4+, DISA STIG compliance).
