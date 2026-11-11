# Diagram Arsitektur Sistem SATRIA SENTINEL

Diagram ini mengilustrasikan arsitektur modular SATRIA SENTINEL yang memisahkan presentasi (Next.js App Router), API gateway & orkestrasi (FastAPI), serta persistensi data relasional (PostgreSQL 16).

```mermaid
graph TD
    subgraph ClientLayer["1. Lapisan Pengguna & Presentasi (Frontend)"]
        Operator["SOC Operator / Analyst / Admin"]
        NextApp["Next.js 15 (App Router / TypeScript)"]
        StateAuth["AuthContext (JWT & Role State)"]
        UIComp["Tailwind CSS & shadcn/ui Components"]
        Charts["Recharts Visualizations"]
    end

    subgraph APILayer["2. Lapisan Layanan API & Keamanan (Backend FastAPI)"]
        RouterAuth["/api/v1/auth & /users (RBAC)"]
        RouterAssets["/api/v1/assets (Asset Registry)"]
        RouterEvents["/api/v1/security-events & /log-ingestion"]
        RouterDetect["/api/v1/detections & /correlations"]
        RouterIncidents["/api/v1/incidents & /playbooks"]
        RouterAudit["/api/v1/audit-logs (Append-Only)"]
        SecurityCore["Security Core (RFC 7914 scrypt & HS256 JWT)"]
    end

    subgraph EngineLayer["3. Defensive Security Processing Engines"]
        IngestEngine["Log Sanitizer & SHA-256 Deduplication"]
        DetectEngine["Deterministic Rule Engine (6 SOP Rules)"]
        CorrelateEngine["Multi-Factor Correlation Engine"]
        RiskEngine["Explainable 5-Factor Risk Engine (0-100)"]
        PlaybookEngine["Advisory Playbooks Matcher (PB-IR-001..005)"]
    end

    subgraph DataLayer["4. Lapisan Persistensi Data (PostgreSQL 16)"]
        T_Users["users"]
        T_Assets["assets"]
        T_Events["security_events"]
        T_Incidents["incidents"]
        T_IncEvents["incident_events"]
        T_Playbooks["response_playbooks"]
        T_Audit["audit_logs"]
    end

    Operator --> NextApp
    NextApp --> StateAuth
    NextApp --> UIComp
    UIComp --> Charts
    NextApp -->|HTTP REST / JSON with Bearer JWT| APILayer

    RouterAuth --> SecurityCore
    RouterEvents --> IngestEngine
    IngestEngine --> DetectEngine
    DetectEngine --> CorrelateEngine
    CorrelateEngine --> RiskEngine
    RouterIncidents --> PlaybookEngine

    APILayer -->|SQLAlchemy 2.0 ORM| DataLayer
    EngineLayer -->|Transactions & Queries| DataLayer
```
