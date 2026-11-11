# SATRIA SENTINEL

**Security Asset & Threat Response Intelligence Assistant**  
*Defensive Cybersecurity Operations Command Platform — Kartika Cyber Hackathon 2026 (Phase 1–4 Complete & Submission Ready)*

---

## 1. Gambaran Umum Proyek

**SATRIA SENTINEL** adalah platform komando operasi pertahanan siber defensif (*Defensive Security Operations Command Platform*) yang dirancang untuk membantu tim SOC (*Security Operations Center*) dalam memantau inventaris aset digital, mengimpor dan memvalidasi log keamanan, mendeteksi indikasi ancaman menggunakan aturan deterministik yang transparan, mengorelasikan kejadian terkait, menghitung indeks prioritas risiko (`0–100`), mengelola siklus hidup investigasi insiden, serta menyajikan rekomendasi *Response Playbooks* dan *Audit Trail* terpusat.

Platform ini diajukan untuk **Kategori Penangkalan** pada **Kartika Cyber Hackathon 2026**, berfokus pada pencegahan proaktif, penghadangan manuver musuh di tahap awal rantai serangan (*Early Kill Chain Interception*), dan kejelasan bukti kausal (*Explainable by Design*).

### Fitur Utama Platform (Phase 1–4)
1. **Authentication & RBAC (`/api/v1/auth`, `/api/v1/users`)**: Autentikasi JWT HS256, *password hashing* memory-hard `scrypt` (RFC 7914), pencabutan token saat *logout*, dan kontrol akses berbasis peran tiga tingkat (`admin`, `security_analyst`, `viewer`).
2. **Command Center Dashboard Intelligence (`/`)**: Ringkasan postur keamanan *real-time*, **Analyst Priority Attention Queue**, **Asset Risk Overview**, pemisahan eksplisit data `[SYNTHETIC SIM]`, serta grafik distribusi tingkat risiko gabungan dan severitas event.
3. **Asset Inventory & Risk Context (`/assets`, `/api/v1/assets`)**: CRUD inventaris aset digital beserta filter kritikalitas/lingkungan, rasional bobot risiko (*Why Asset Criticality Matters: +7 s/d +25 poin*), dan daftar *security events* terkait per aset.
4. **Synthetic Security Log Generator & CSV/JSON Ingestion (`/security-events`, `/api/v1/log-ingestion`)**: Generator 6 skenario simulasi ancaman berlabel `[SYNTHETIC SIMULATION]` serta mesin impor CSV/JSON dengan validasi skema, sanitasi input, batas payload, dan deteksi duplikat SHA-256.
5. **Deterministic Threat Detection & Explainable Risk Scoring (`/api/v1/detections`, `/api/v1/correlations`, `/api/v1/risk-assessments`)**: 6 aturan deteksi deterministik (`SATRIA-RULE-BF-001` s/d `SATRIA-RULE-RECON-006`) terpetakan ke **MITRE ATT&CK**, mesin korelasi multi-faktor, dan perhitungan skor prioritas risiko `0–100` dengan rincian 5 faktor berbobot.
6. **End-to-End Incident Investigation Workspace (`/incidents`, `/api/v1/incidents`)**: Manajemen kasus insiden lengkap dengan penugasan analis (`assign`), penautan bukti event (`link-events`), daftar aset terdampak, temuan deteksi, panduan *playbook* terintegrasi, catatan investigasi, resolusi *root-cause*, dan lini masa kronologis.
7. **Advisory Response Playbooks & Immutable Audit Trail (`/playbooks`, `/audit-logs`, `/settings`)**: Katalog SOP respons defensif (`PB-IR-001` s/d `PB-IR-005`) dengan pagar pengaman *Advisory-Only (Human-in-the-Loop)*, jejak audit *append-only* dengan resolusi aktor `@username`, dan matriks izin RBAC.

---

## 2. Tumpukan Teknologi (*Technology Stack*)

| Lapisan | Teknologi & Versi Terverifikasi |
| :--- | :--- |
| **Frontend** | Next.js `15.5.29` (App Router), React `19.0.0`, TypeScript `5.8.2`, Tailwind CSS `4.0.14`, Recharts `2.15.1`, Lucide Icons |
| **Backend** | Python (`3.12` Docker / `3.14.4` Host), FastAPI `0.135.3`, Pydantic `2.12.5`, SQLAlchemy `2.0.35`, Alembic `1.13.3` |
| **Database** | PostgreSQL `16-alpine` (7 tabel inti, migrasi Alembic `20261111_0002`) |
| **Testing** | Pytest `9.2.0` (`9 passed`), Playwright `1.58.2` (`4 passed`, termasuk skenario demo 18 langkah) |
| **Kontainer** | Docker Engine `24+` & Docker Compose v2 |

---

## 3. Cara Menjalankan Proyek

### A. Menggunakan Docker Compose (Direkomendasikan)
```bash
cp .env.example .env
docker compose up -d --build
```
Akses antarmuka web pada `http://localhost:3000` dan dokumentasi API Swagger pada `http://localhost:8000/api/v1/docs`.

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

## 4. Paket Submisi Kompetisi (`submission/`)

Berkas persiapan kompetisi lengkap tersedia di direktori `submission/`:
- [`submission/PROJECT_DESCRIPTION.md`](submission/PROJECT_DESCRIPTION.md) — Deskripsi komprehensif produk, arsitektur, dan inovasi kategori Penangkalan.
- [`submission/DEMO_SCRIPT.md`](submission/DEMO_SCRIPT.md) — Naskah presentasi dan live walkthrough video YouTube 10 menit.
- [`submission/PRESENTATION_OUTLINE.md`](submission/PRESENTATION_OUTLINE.md) — Kerangka materi presentasi 10 slide.
- [`submission/SCREENSHOT_CHECKLIST.md`](submission/SCREENSHOT_CHECKLIST.md) — Panduan 5 tangkapan layar antarmuka aplikasi berjalan.
- [`submission/THUMBNAIL_SPEC.md`](submission/THUMBNAIL_SPEC.md) — Spesifikasi desain thumbnail video YouTube (1200 × 630 px, < 500 KB).

---

## 5. Dokumentasi Teknis Lengkap (`docs/`)

- [`docs/PHASE4_FINAL_AUDIT.md`](docs/PHASE4_FINAL_AUDIT.md) — Laporan audit penerimaan akhir integrasi, verifikasi 18 langkah, dan batasan sistem.
- [`docs/SECURITY_HARDENING_REPORT.md`](docs/SECURITY_HARDENING_REPORT.md) — Laporan hardening keamanan, analisis pembatalan JWT, dan keutuhan jejak audit.
- [`docs/DEPLOYMENT_READINESS.md`](docs/DEPLOYMENT_READINESS.md) — Panduan deployment Docker Compose, variabel lingkungan, dan pemulihan sistem.
- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) — Gambaran umum produk dan arsitektur awal.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arsitektur modular frontend, backend, dan database.
- [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) — Skema 7 tabel PostgreSQL, relasi, dan indeks.
- [`docs/DETECTION_METHODOLOGY.md`](docs/DETECTION_METHODOLOGY.md) — Katalog 6 aturan deteksi deterministik dan pemetaan MITRE ATT&CK.
- [`docs/RISK_SCORING.md`](docs/RISK_SCORING.md) — Formula skor risiko `0–100`, bobot 5 faktor, dan kategori tingkat risiko.
- [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) — Spesifikasi seluruh endpoint `/api/v1` dan matriks perizinan RBAC.
- [`docs/SYNTHETIC_DATA_GUIDE.md`](docs/SYNTHETIC_DATA_GUIDE.md) — Panduan generator skenario simulasi dan format impor CSV/JSON.
- [`docs/PHASE3_UX_WORKFLOW.md`](docs/PHASE3_UX_WORKFLOW.md) — Panduan UX Command Center dan alur investigasi insiden.
- [`docs/SECURITY_BASELINE.md`](docs/SECURITY_BASELINE.md) — Kontrol keamanan autentikasi, sanitasi input, CORS, dan *secret hygiene*.
- [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md) — Panduan lingkungan kerja dan konvensi pengembangan.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Laporan hasil eksekusi pengujian Pytest dan Playwright E2E.
