# SATRIA SENTINEL — Project Overview

## 1. Latar Belakang & Tujuan

**SATRIA SENTINEL** (*Security Asset & Threat Response Intelligence Assistant*) dikembangkan untuk kompetisi **Kartika Cyber Hackathon 2026** sebagai platform pertahanan siber (*defensive cybersecurity platform*) terpadu.

Fokus utama platform ini adalah membantu tim Security Operations Center (SOC) dan pengelola infrastruktur digital dalam:
- Memetakan aset digital beserta tingkat kritikalitas dan pemiliknya.
- Memantau dan menormalisasi indikasi ancaman (*Security Events*) secara terstruktur.
- Mengorelasikan berbagai indikasi ancaman menjadi kasus insiden (*Incidents*) yang memiliki prioritas risiko jelas.
- Menjalankan respons insiden secara terstandar menggunakan *Response Playbooks*.
- Menjaga integritas operasional melalui pencatatan *Audit Logs*.

---

## 2. Ruang Lingkup Phase 1 (Foundation & Environment Setup)

Sesuai dengan prinsip rekayasa perangkat lunak yang disiplin, **Phase 1** difokuskan sepenuhnya pada pembangunan fondasi teknis yang stabil, modular, aman, dan terverifikasi:

1. **Struktur Monorepo Modular**: Pemisahan tegas antara `frontend/`, `backend/`, `docs/`, `infrastructure/`, dan `scripts/`.
2. **Database Foundation (PostgreSQL + SQLAlchemy 2.x + Alembic)**:
   - Implementasi 7 entitas fondasi: `Users`, `Assets`, `SecurityEvents`, `Incidents`, `IncidentEvents`, `ResponsePlaybooks`, dan `AuditLogs`.
   - Penggunaan UUIDv4 sebagai primary key, *foreign key constraints* yang aman (`ON DELETE SET NULL` / `ON DELETE CASCADE`), *timestamps* UTC (`created_at`, `updated_at`), serta indeks komposit untuk performa query analitik.
3. **Backend Foundation (FastAPI)**:
   - Konfigurasi berbasis environment variable (`pydantic-settings`).
   - Prefix versi API `/api/v1`.
   - Endpoint `GET /api/v1/health` yang memeriksa konektivitas database PostgreSQL, latensi query, dan kesiapan tabel skema tanpa membocorkan kredensial.
   - *Centralized exception handling* dengan `request_id` tanpa membocorkan *stack trace*.
   - *Structured JSON logging* dan konfigurasi CORS ketat berbasis environment variable.
4. **Frontend Foundation (Next.js App Router + TypeScript + Tailwind + shadcn/ui + Recharts)**:
   - Desain *Modern Cybersecurity Command Center* dengan palet warna *Dark Navy* (`#060d1a`) dan *Emerald Green* (`#10b981`).
   - 7 halaman utama yang berfungsi penuh dengan navigasi sidebar responsif:
     - `Dashboard` (`/`)
     - `Assets` (`/assets`)
     - `Security Events` (`/security-events`)
     - `Incidents` (`/incidents`)
     - `Response Playbooks` (`/playbooks`)
     - `Audit Logs` (`/audit-logs`)
     - `Settings` (`/settings`)
   - Integrasi langsung ke `GET /api/v1/health` melalui *typed API client* (`src/services/api-client.ts`).
   - Transparansi data: Tidak menggunakan grafik serangan palsu atau mengklaim telemetri nyata yang belum diimplementasikan.

---

## 3. Batasan Etika & Keamanan Pengembangan

- **100% Defensive Platform**: SATRIA SENTINEL tidak memuat fitur *offensive scanning*, eksploitasi, atau serangan terhadap sistem pihak ketiga.
- **Zero Malware / Zero Real PII**: Seluruh pengujian dan pengembangan menggunakan data sintetis (*synthetic security telemetry*) dan akun dummy lokal.
