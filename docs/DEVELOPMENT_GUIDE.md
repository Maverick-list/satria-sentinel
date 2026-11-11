# SATRIA SENTINEL — Development & Testing Guide

## 1. Prerequisites

- **Python**: `3.12+` (terverifikasi pada `3.14.4` lokal & `3.12-slim` container)
- **Node.js & npm**: Node `22+` / `26.x`, npm `10+` / `11.x`
- **Docker & Docker Compose**: Docker Engine `24+` dengan `docker compose` plugin
- **Git**: `2.40+`

---

## 2. Environment Setup

Salin file `.env.example` menjadi `.env` di root direktori proyek:

```bash
cp .env.example .env
```

Pastikan variabel berikut sesuai dengan environment lokal Anda:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- `DATABASE_URL` (gunakan host `localhost` saat menjalankan backend langsung di host, atau `db` di dalam jaringan Docker Compose)
- `CORS_ORIGINS` (default: `http://localhost:3000,http://127.0.0.1:3000`)
- `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000/api/v1`)

---

## 3. Running the Stack

### 3.1. Database (PostgreSQL 16)

```bash
docker compose up -d db
docker compose ps
```

### 3.2. Backend (FastAPI + Alembic)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Jalankan migrasi Alembic ke PostgreSQL
.venv/bin/alembic upgrade head

# Jalankan server FastAPI
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verifikasi health check:
```bash
curl -s http://localhost:8000/api/v1/health | python3 -m json.tool
```

### 3.3. Frontend (Next.js App Router)

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3000` pada browser.

---

## 4. Running Automated Tests

### 4.1. Backend Unit & Integration Tests (Pytest)

```bash
cd backend
.venv/bin/pytest -v
```

### 4.2. Frontend Type Checking & Production Build

```bash
cd frontend
npm run typecheck
npm run build
```

### 4.3. End-to-End Browser Tests (Playwright)

Pastikan backend (`:8000`) dan frontend (`:3000`) sedang berjalan, lalu jalankan:

```bash
cd frontend
npx playwright test
```

### 4.4. One-Command Verification Script

Dari root repositori:

```bash
./scripts/verify-phase1.sh
```
