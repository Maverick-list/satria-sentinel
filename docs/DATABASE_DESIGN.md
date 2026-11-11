# SATRIA SENTINEL — Database Design & Schema Reference

## 1. Gambaran Umum Database

- **DBMS**: PostgreSQL 16 (`postgres:16-alpine`)
- **ORM & Migration**: SQLAlchemy 2.0.35 + Alembic 1.13.3
- **Revisi Migrasi Aktif (`head`)**:
  1. `20261111_0001` (`backend/alembic/versions/20261111_0001_initial_foundation_schema.py`): Pembuatan 7 tabel fondasi beserta enumerasi dan indeks.
  2. `20261111_0002` (`backend/alembic/versions/20261111_0002_phase2_operational_columns.py`): Penambahan kolom operasional Phase 2 (`users.username`, `security_events.event_hash`, `security_events.risk_level`, `security_events.risk_explanation`, `security_events.detection_reasons`, `security_events.correlation_reason`, `security_events.is_synthetic`, `incidents.timeline_json`, dan `incidents.root_cause_notes`).

---

## 2. Diagram Relasi Entitas (*Entity-Relationship Diagram*)

```mermaid
erDiagram
    USERS ||--o{ INCIDENTS : "assigned_to_id"
    USERS ||--o{ AUDIT_LOGS : "actor_user_id"
    ASSETS ||--o{ SECURITY_EVENTS : "asset_id"
    RESPONSE_PLAYBOOKS ||--o{ INCIDENTS : "recommended_playbook_id"
    INCIDENTS ||--o{ INCIDENT_EVENTS : "incident_id"
    SECURITY_EVENTS ||--o{ INCIDENT_EVENTS : "security_event_id"

    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar full_name
        varchar hashed_password
        user_role_enum role
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ASSETS {
        uuid id PK
        varchar asset_tag UK
        varchar name
        varchar asset_type
        varchar ip_address
        varchar hostname
        varchar environment
        asset_criticality_enum criticality
        varchar owner
        boolean is_monitored
        timestamptz created_at
        timestamptz updated_at
    }

    SECURITY_EVENTS {
        uuid id PK
        timestamptz occurred_at
        varchar source
        varchar event_type
        severity_level_enum severity
        uuid asset_id FK
        varchar source_ip
        varchar destination_ip
        varchar username
        text description
        jsonb raw_payload
        varchar event_hash UK
        varchar rule_id
        varchar mitre_Mapping
        float risk_score
        varchar risk_level
        text risk_explanation
        jsonb detection_reasons
        varchar correlation_group_id
        text correlation_reason
        boolean is_synthetic
        timestamptz created_at
    }

    INCIDENTS {
        uuid id PK
        varchar incident_number UK
        varchar title
        text description
        severity_level_enum severity
        incident_status_enum status
        float risk_score
        uuid assigned_to_id FK
        uuid recommended_playbook_id FK
        text resolution_notes
        text root_cause_notes
        jsonb timeline_json
        timestamptz resolved_at
        timestamptz created_at
        timestamptz updated_at
    }

    INCIDENT_EVENTS {
        uuid id PK
        uuid incident_id FK
        uuid security_event_id FK
        varchar note
        timestamptz created_at
    }

    RESPONSE_PLAYBOOKS {
        uuid id PK
        varchar code UK
        varchar name
        varchar category
        severity_level_enum target_severity
        text description
        jsonb steps_json
        varchar mitre_Mapping
        boolean is_active
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
        jsonb details_json
        timestamptz created_at
    }
```

---

## 3. Indeks & Integritas Data

- **Deduplikasi Kejadian (`ix_security_events_event_hash`)**: Indeks unik pada `security_events.event_hash` (SHA-256) mencegah duplikasi impor log CSV/JSON yang identik.
- **Indeks Korelasi & Pencarian Cepat**: Indeks pada `security_events.occurred_at`, `security_events.event_type`, `security_events.severity`, `security_events.asset_id`, dan `security_events.correlation_group_id` mendukung kueri korelasi lintas waktu dan aset secara efisien.
- **Kaskade Relasi**: Tabel jembatan `incident_events` menggunakan `ON DELETE CASCADE` terhadap `incidents.id` dan `security_events.id`, sedangkan referensi analitik seperti `security_events.asset_id` dan `audit_logs.actor_user_id` menggunakan `ON DELETE SET NULL` agar histori kejadian dan jejak audit tetap terjaga.
