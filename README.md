# SATRIA SENTINEL

**Security Asset & Threat Response Intelligence Assistant**  
*Defensive Cybersecurity Operations Prototype — Kartika Cyber Hackathon 2026 (Phase 1, Phase 2 & Phase 3 Complete)*

---

## 1. Gambaran Umum Proyek

**SATRIA SENTINEL** adalah platform komando keamanan siber defensif yang dirancang untuk membantu tim SOC (*Security Operations Center*) dalam memantau inventaris aset digital, mengimpor dan memvalidasi log keamanan, mendeteksi indikasi ancaman menggunakan aturan deterministik yang transparan, mengorelasikan kejadian terkait, menghitung indeks prioritas risiko (`0–100`), mengelola siklus hidup investigasi insiden, serta menyajikan rekomendasi *Response Playbooks* dan *Audit Trail* terpusat.

### Fitur Utama (Phase 1, Phase 2 & Phase 3)
1. **Authentication & RBAC (`/api/v1/auth`, `/api/v1/users`)**: Autentikasi JWT HS256, *password hashing* `scrypt` (RFC 7914), pencabutan token saat *logout*, dan kontrol akses berbasis peran (`admin`, `security_analyst`, `viewer`).
2. **Command Center Dashboard Intelligence (`/`)**: Ringkasan postur keamanan *real-time*, **Analyst Priority Attention Queue**, **Asset Risk Overview**, pemisahan eksplisit data `[SYNTHETIC SIM]`, serta grafik distribusi tingkat risiko dan severitas event.
3. **Asset Inventory & Risk Context (`/assets`, `/api/v1/assets`)**: CRUD inventaris aset digital beserta filter kritikalitas/lingkungan, rasional bobot risiko (*Why Asset Criticality Matters*), dan daftar *security events* terkait per aset.
4. **Synthetic Security Log Generator & CSV/JSON Ingestion (`/security-events`, `/api/v1/log-ingestion`)**: Generator 6 skenario simulasi ancaman berlabel `[SYNTHETIC SIMULATION]` serta mesin impor CSV/JSON dengan validasi skema, sanitasi input, dan deteksi duplikat SHA-256.
5. **Deterministic Threat Detection & Explainable Risk Scoring (`/api/v1/detections`, `/api/v1/correlations`, `/api/v1/risk-assessments`)**: 6 aturan deteksi deterministik (`SATRIA-RULE-BF-001` s/d `SATRIA-RULE-RECON-006`) terpetakan ke **MITRE ATT&CK**, mesin korelasi multi-faktor, dan perhitungan skor prioritas risiko `0–100` dengan rincian 5 faktor berbobot.
6. **End-to-End Incident Investigation Workspace (`/incidents`, `/api/v1/incidents`)**: Manajemen kasus insiden lengkap dengan penugasan analis (`assign`), penautan bukti event (`link-events`), daftar aset terdampak, temuan deteksi, panduan *playbook* terintegrasi, catatan investigasi, resolusi *root-cause*, dan lini masa kronologis.
7. **Advisory Response Playbooks & Immutable Audit Trail (`/playbooks`, `/audit-logs`, `/settings`)**: Katalog SOP respons defensif (`PB-IR-001` s/d `PB-IR-005`) dengan pagar pengaman *Advisory-Only (Human-in-the-Loop)*, jejak audit dengan resolusi aktor `@username`, dan matriks izin RBAC.

---

## 2. Tumpukan Teknologi (*Technology Stack*)

| Lapisan | Teknologi & Versi Terverifikasi |
| :--- | :--- |
| **Frontend** | Next.js `15.5.29` (App Router), React `19.0.0`, TypeScript `5.8.2`, Tailwind CSS `4.0.14`, Recharts `2.15.1`, Lucide Icons |
| **Backend** | Python (`3.12` Docker / `3.14.4` Host), FastAPI `0.135.3`, Pydantic `2.12.5`, SQLAlchemy `2.0.35`, Alembic `1.13.3` |
| **Database** | PostgreSQL `16-alpine` (7 tabel inti, migrasi Alembic `20261111_0002`) |
| **Testing** | Pytest `9.2.0` (`9 passed`), Playwright `1.58.2` (`4 passed`, termasuk skenario demo 14 langkah) |

---

## 3. Cara Menjalankan Proyek

### A. Menggunakan Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
```

### B. Menjalankan Secara Lokal (Host Development)
1. **Jalankan PostgreSQL**:
   ```bash
   docker compose up -d db
   ```
2. **Jalankan Migrasi & Server Backend (`:8000`)**:
   ```bash
   cd backend
   .venv/bin/alembic upgrade head
   .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Jalankan Server Frontend (`:3000`)**:
   ```bash
   cd frontend
   npm run build && npm run start
   ```

---

## 4. Dokumentasi Lengkap (`docs/`)

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) — Tujuan produk dan cakupan Phase 1–3.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arsitektur modular *frontend*, *backend*, dan database.
- [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) — Skema 7 tabel PostgreSQL, relasi, dan indeks.
- [`docs/DETECTION_METHODOLOGY.md`](docs/DETECTION_METHODOLOGY.md) — Katalog 6 aturan deteksi deterministik, pemetaan MITRE ATT&CK, dan metodologi korelasi.
- [`docs/RISK_SCORING.md`](docs/RISK_SCORING.md) — Formula skor risiko `0–100`, bobot 5 faktor, dan kategori tingkat risiko.
- [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) — Spesifikasi seluruh *endpoint* `/api/v1` dan matriks RBAC.
- [`docs/SYNTHETIC_DATA_GUIDE.md`](docs/SYNTHETIC_DATA_GUIDE.md) — Panduan generator skenario simulasi dan format impor CSV/JSON.
- [`docs/PHASE3_UX_WORKFLOW.md`](docs/PHASE3_UX_WORKFLOW.md) — Panduan UX Command Center Phase 3 dan alur demonstrasi operasional 14 langkah.
- [`docs/SECURITY_BASELINE.md`](docs/SECURITY_BASELINE.md) — Kontrol keamanan autentikasi, sanitasi input, CORS, dan *secret hygiene*.
- [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md) — Panduan lingkungan kerja dan konvensi pengembangan.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Laporan hasil eksekusi pengujian Pytest dan Playwright E2E.
