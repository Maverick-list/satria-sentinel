# SATRIA SENTINEL — Database Design (Phase 1)

## 1. Design Principles

1. **UUIDv4 Primary Keys**: Seluruh 7 tabel utama menggunakan kolom `id UUID PRIMARY KEY` untuk mencegah *enumeration* ID berurutan dan memudahkan pembuatan ID terdistribusi.
2. **Timezone-Aware Timestamps**: Seluruh kolom waktu menggunakan `TIMESTAMPTZ` (`DateTime(timezone=True)`) dalam UTC (`created_at`, `updated_at`, `occurred_at`, `detected_at`, `linked_at`).
3. **Safe Referential Integrity**:
   - Relasi ke `users` (`owner_id`, `assigned_to_id`, `created_by_id`, `actor_user_id`) menggunakan `ON DELETE SET NULL` agar penghapusan akun operator tidak pernah menghilangkan histori aset, insiden, playbook, maupun log audit.
   - Tabel asosiasi `incident_events` menggunakan `ON DELETE CASCADE` terhadap `incidents` dan `security_events`, dilengkapi constraint unik `(incident_id, security_event_id)`.
4. **Structured Extensibility via JSONB**: Atribut telemetri mentah (`raw_payload`), metadata aset (`metadata_json`), langkah playbook (`steps_json`), dan detail audit (`details_json`) disimpan menggunakan tipe `JSONB` PostgreSQL.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ ASSETS : "owns (owner_id)"
    USERS ||--o{ INCIDENTS : "assigned to (assigned_to_id)"
    USERS ||--o{ RESPONSE_PLAYBOOKS : "authors (created_by_id)"
    USERS ||--o{ AUDIT_LOGS : "performs (actor_user_id)"

    ASSETS ||--o{ SECURITY_EVENTS : "generates (asset_id)"
    RESPONSE_PLAYBOOKS ||--o{ INCIDENTS : "guides (playbook_id)"

    INCIDENTS ||--o{ INCIDENT_EVENTS : "correlates (incident_id)"
    SECURITY_EVENTS ||--o{ INCIDENT_EVENTS : "linked in (security_event_id)"

    USERS {
        uuid id PK
        varchar email UK
        varchar username UK
        varchar full_name
        varchar password_hash
        varchar role
        boolean is_active
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    ASSETS {
        uuid id PK
        varchar asset_tag UK
        varchar name
        varchar hostname
        varchar ip_address
        varchar asset_type
        varchar environment
        varchar criticality
        varchar status
        varchar operating_system
        uuid owner_id FK
        jsonb metadata_json
        timestamptz created_at
        timestamptz updated_at
    }

    SECURITY_EVENTS {
        uuid id PK
        uuid asset_id FK
        varchar event_type
        varchar source
        varchar severity
        varchar status
        varchar title
        text description
        varchar source_ip
        varchar destination_ip
        varchar mitre_tactic
        varchar mitre_technique
        jsonb raw_payload
        timestamptz occurred_at
        timestamptz created_at
        timestamptz updated_at
    }

    RESPONSE_PLAYBOOKS {
        uuid id PK
        varchar code UK
        varchar name
        varchar category
        varchar target_severity
        text description
        jsonb steps_json
        boolean is_active
        varchar version
        uuid created_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    INCIDENTS {
        uuid id PK
        varchar incident_number UK
        varchar title
        text summary
        varchar severity
        varchar status
        integer risk_score
        uuid assigned_to_id FK
        uuid playbook_id FK
        timestamptz detected_at
        timestamptz resolved_at
        text root_cause_notes
        timestamptz created_at
        timestamptz updated_at
    }

    INCIDENT_EVENTS {
        uuid id PK
        uuid incident_id FK
        uuid security_event_id FK
        varchar correlation_role
        text analyst_notes
        timestamptz linked_at
        timestamptz created_at
        timestamptz updated_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_user_id FK
        varchar action
        varchar entity_type
        varchar entity_id
        varchar ip_address
        varchar user_agent
        jsonb details_json
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 3. Table & Index Inventory

| Table Name | ORM Class | Unique Constraints | Key Single & Composite Indexes |
| :--- | :--- | :--- | :--- |
| `users` | `User` | `email`, `username` | `ix_users_email`, `ix_users_username`, `ix_users_role` |
| `assets` | `Asset` | `asset_tag` | `ix_assets_asset_tag`, `ix_assets_hostname`, `ix_assets_ip_address`, `ix_assets_crit_status (criticality, status)` |
| `security_events` | `SecurityEvent` | — | `ix_security_events_severity_occurred (severity, occurred_at)`, `ix_security_events_asset_occurred (asset_id, occurred_at)`, `ix_security_events_mitre_technique` |
| `response_playbooks` | `ResponsePlaybook` | `code` | `ix_response_playbooks_code`, `ix_response_playbooks_category`, `ix_response_playbooks_is_active` |
| `incidents` | `Incident` | `incident_number` | `ix_incidents_incident_number`, `ix_incidents_status_severity (status, severity)`, `ix_incidents_detected_at` |
| `incident_events` | `IncidentEvent` | `(incident_id, security_event_id)` | `ix_incident_events_incident_id`, `ix_incident_events_security_event_id` |
| `audit_logs` | `AuditLog` | — | `ix_audit_logs_entity (entity_type, entity_id)`, `ix_audit_logs_action_created (action, created_at)` |
