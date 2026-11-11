# SATRIA SENTINEL

**Security Asset & Threat Response Intelligence Assistant**  
*Defensive Cybersecurity Platform — Kartika Cyber Hackathon 2026 (Phase 1 Foundation)*

---

## 1. Overview

**SATRIA SENTINEL** adalah platform operasional keamanan siber defensif (*defensive cybersecurity command center*) yang dirancang untuk:
1. **Monitoring Aset Digital (`Assets`)** — inventarisasi infrastruktur, klasifikasi kritikalitas, status operasional, dan pemetaan pemilik aset.
2. **Deteksi Indikasi Ancaman (`SecurityEvents`)** — pencatatan telemetri keamanan sintetis, klasifikasi taktik/teknik MITRE ATT&CK, dan antrean triase analis.
3. **Analisis Risiko & Pengelolaan Insiden (`Incidents` & `IncidentEvents`)** — korelasi banyak event keamanan menjadi kasus insiden terstruktur dengan *risk score* dan *root-cause notes*.
4. **Orkestrasi Respons Defensif (`ResponsePlaybooks`)** — panduan prosedur standar (*containment*, *eradication*, *recovery*) berbasis *checklist* terversi.
5. **Akuntabilitas Operasional (`AuditLogs`)** — rekam jejak audit atas setiap tindakan operator dan perubahan status sistem.

> **Status Proyek Saat Ini (Phase 1):**  
> Fondasi arsitektur modular, skema database PostgreSQL (7 tabel inti beserta relasi & indeks), migrasi Alembic, REST API `/api/v1/health` pada FastAPI, *centralized error handling*, *structured JSON logging*, serta UI Command Center berbasis Next.js App Router (7 halaman utama + integrasi *live health telemetry*) telah selesai diimplementasikan dan diverifikasi.

---

## 2. Technology Stack (Actual Verified Versions)

| Layer | Technology | Version |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | `15.5.29` |
| **Frontend UI Library** | React / React DOM | `19.3.1` |
| **Frontend Language** | TypeScript | `5.9.3` |
| **UI & Styling** | Tailwind CSS + shadcn/ui + Lucide Icons | `3.4.19` / `0.475.0` |
| **Data Visualization** | Recharts | `2.15.4` |
| **Backend Framework** | FastAPI (Python `3.14.4` local / `3.12` container) | `0.162.4` |
| **Validation & Settings** | Pydantic / Pydantic Settings | `2.14.3` / `2.16.2` |
| **ORM & Database Migration** | SQLAlchemy / Alembic | `2.1.8` / `1.20.1` |
| **PostgreSQL Driver** | Psycopg v3 (`psycopg[binary]`) | `3.3.8` |
| **Database Engine** | PostgreSQL | `16-alpine` (`16.13`) |
| **Testing & QA** | Pytest + HTTPX (Backend), Playwright (E2E) | `9.2.0` / `0.28.1` / `1.65.0` |
| **Containerization** | Docker (`29.9.2`) & Docker Compose (`v5.6.1`) | Compose v2 spec |

---

## 3. Repository Structure

```text
satria-sentinel/
├── backend/                  # FastAPI application, SQLAlchemy models, Alembic migrations, Pytest suite
│   ├── alembic/              # Database migration environment and version scripts
│   ├── app/
│   │   ├── api/v1/           # Versioned API routers (/api/v1/health)
│   │   ├── core/             # Environment config, structured JSON logging, centralized exceptions
│   │   ├── db/               # SQLAlchemy 2.x DeclarativeBase, session & engine management
│   │   ├── models/           # 7 foundational ORM entities + domain enums
│   │   ├── repositories/     # Data access layer & database readiness probe
│   │   ├── schemas/          # Pydantic v2 request/response schemas
│   │   └── services/         # Application business & health orchestration services
│   ├── tests/                # Pytest unit & integration tests
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Next.js App Router TypeScript Command Center UI
│   ├── src/
│   │   ├── app/              # 7 App Router pages (/, /assets, /security-events, /incidents, /playbooks, /audit-logs, /settings)
│   │   ├── components/       # shadcn/ui primitives & Command Center layout shell
│   │   ├── features/         # Health telemetry panel, schema profile chart, module foundation view
│   │   ├── hooks/            # React hooks (useBackendHealth)
│   │   ├── lib/              # Tailwind class merger & formatting utilities
│   │   ├── services/         # Typed HTTP client & backend health API service
│   │   └── types/            # TypeScript contracts matching FastAPI schemas
│   ├── tests/e2e/            # Playwright end-to-end verification specs
│   ├── Dockerfile
│   └── package.json
├── docs/                     # Architectural, database, development, and security documentation
├── infrastructure/           # PostgreSQL initialization scripts
├── scripts/                  # Phase 1 automated verification script
├── .env.example              # Safe environment variable template (no secrets)
├── .gitignore
├── docker-compose.yml        # Multi-container orchestration (db, backend, frontend)
└── README.md
```

---

## 4. Quick Start

### 4.1. Prepare Environment Configuration

```bash
cp .env.example .env
```

### 4.2. Option A — Hybrid Local Development (Recommended for Fast Iteration)

1. **Jalankan PostgreSQL via Docker Compose:**
   ```bash
   docker compose up -d db
   ```
2. **Jalankan Migrasi Database & Backend FastAPI:**
   ```bash
   cd backend
   .venv/bin/alembic upgrade head
   .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. **Jalankan Frontend Next.js:**
   ```bash
   cd frontend
   npm run dev
   ```
4. **Akses Aplikasi:**
   - Command Center UI: `http://localhost:3000`
   - Backend Health Endpoint: `http://localhost:8000/api/v1/health`
   - OpenAPI Swagger Docs: `http://localhost:8000/api/v1/docs`

### 4.3. Option B — Full Docker Compose Stack

```bash
docker compose up --build -d
```

---

## 5. Documentation Index

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Architecture Specification](docs/ARCHITECTURE.md)
- [Database Design & ERD](docs/DATABASE_DESIGN.md)
- [Development & Testing Guide](docs/DEVELOPMENT_GUIDE.md)
- [Security Baseline](docs/SECURITY_BASELINE.md)
