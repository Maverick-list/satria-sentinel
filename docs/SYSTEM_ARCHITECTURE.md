# SATRIA SENTINEL — System Architecture & Modular Design

Dokumen ini menjelaskan struktur arsitektur perangkat lunak SATRIA SENTINEL, pemisahan tanggung jawab (Separation of Concerns), dan pola desain modular yang diimplementasikan pada backend dan frontend.

---

## 1. Arsitektur Berlapis (Layered Architecture)

SATRIA SENTINEL mengadopsi pola arsitektur berlapis bersih (*Clean Layered Architecture*):

```
+------------------------------------------------------------------+
|                     1. PRESENTATION LAYER                        |
|   Next.js 15 App Router | React Components | Tailwind CSS       |
+------------------------------------------------------------------+
                                 | HTTP REST / JSON (Bearer JWT)
                                 v
+------------------------------------------------------------------+
|                     2. API & SECURITY GATEWAY                    |
|   FastAPI Routers | Dependency Injection | RBAC Security Checks  |
+------------------------------------------------------------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                     3. BUSINESS LOGIC & ENGINES                  |
|   Ingestion | Detection Engine | Correlation | Risk | Playbooks  |
+------------------------------------------------------------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                     4. DATA ACCESS & PERSISTENCE                 |
|   SQLAlchemy 2.0 ORM | Alembic Migrations | PostgreSQL 16 DB    |
+------------------------------------------------------------------+
```

---

## 2. Struktur Modul Backend

Backend diorganisasikan dalam folder modular di bawah [`backend/app/`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/):

```
backend/app/
├── api/
│   ├── deps.py                 # Dependency injection (DB session, current user, role guards)
│   └── v1/
│       ├── api.py              # Root router agregasi v1
│       └── routes/
│           ├── auth.py         # Login, logout, token refresh, current user profile
│           ├── users.py        # Manajemen pengguna dan penetapan role
│           ├── assets.py       # CRUD inventaris aset digital dan filter kritikalitas
│           ├── events.py       # Querying dan visualisasi security events
│           ├── ingestion.py    # Endpoint import CSV/JSON dan generator data sintetis
│           ├── detections.py   # Eksekusi 6 aturan deteksi deterministik
│           ├── correlations.py # Pengelompokan klaster ancaman multidimensi
│           ├── incidents.py    # Manajemen lifecycle insiden, penugasan, dan resolusi
│           ├── playbooks.py    # SOP playbook terpandu dan rekomendasi cerdas
│           ├── audit_logs.py   # Endpoint audit trail append-only (Viewer/Analyst/Admin)
│           ├── risk.py         # Metodologi dan kalkulasi skor risiko
│           └── health.py       # Liveness probe, readiness probe, dan cek koneksi DB
├── core/
│   ├── config.py               # Konfigurasi Pydantic Settings berbasis environment variable
│   ├── security.py             # Kriptografi scrypt RFC 7914, JWT HS256, dan blacklist jti
│   ├── exceptions.py           # Envelope error terpusat tanpa membocorkan stack trace
│   └── logging.py              # Konfigurasi JSON logging terstruktur
├── db/
│   ├── base.py                 # DeclarativeBase SQLAlchemy
│   ├── session.py              # Engine koneksi dan sessionmaker
│   └── seed.py                 # Seed awal demo (aset dan pengguna terverifikasi)
├── models/                     # Entitas tabel database SQLAlchemy
│   ├── user.py, asset.py, security_event.py, incident.py,
│   ├── incident_event.py, response_playbook.py, audit_log.py, enums.py
├── schemas/                    # Kontrak DTO Pydantic untuk request dan response
│   ├── user.py, operational.py
└── services/                   # Mesin pemrosesan inti (Domain Business Logic)
    ├── ingestion_service.py    # Validasi input, sanitasi, dan deduplikasi SHA-256
    ├── detection_service.py    # Evaluasi deterministik 6 aturan deteksi keamanan
    ├── correlation_engine.py   # Algoritma korelasi multivariat temporal dan aset
    ├── risk_service.py         # Formula matematis pembobotan risiko 5 faktor
    ├── playbook_service.py     # Rekomendasi otomatis SOP berdasarkan tipe insiden
    ├── audit_service.py        # Pembuatan rekaman audit log append-only
    └── bootstrap_service.py    # Auto-seeding aset strategis dan akun demo
```

---

## 3. Struktur Modul Frontend

Frontend menggunakan Next.js 15 App Router di [`frontend/src/`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/frontend/src/):

```
frontend/src/
├── app/                        # App Router Pages
│   ├── layout.tsx              # Root layout dengan AuthProvider dan TopHeader
│   ├── page.tsx                # Dashboard Komando Utama (Command Center)
│   ├── assets/page.tsx         # Manajemen Aset Digital dan Filter Kritikalitas
│   ├── security-events/page.tsx# Ingesti Log (CSV/JSON/Sintetis) dan Tabel Event
│   ├── detection-correlation/  # Analisis Aturan Deteksi dan Klaster Korelasi
│   ├── incidents/page.tsx      # Ruang Kerja Investigasi dan Lifecycle Insiden
│   ├── playbooks/page.tsx      # Katalog SOP Penanganan Insiden & CLI Commands
│   ├── audit-logs/page.tsx     # Rekaman Jejak Audit yang Tidak Dapat Diubah
│   └── settings/page.tsx       # Baseline Keamanan, Arsitektur, dan Konfigurasi
├── components/
│   ├── layout/                 # Sidebar Navigasi, Top Header, dan Role Switcher
│   └── ui/                     # Komponen UI Reusable (Card, Button, Badge, Modal, Tabs)
├── features/
│   └── auth/                   # AuthContext, penyimpanan token, dan auto-bootstrap
├── services/                   # HTTP API Client type-safe berbasis Fetch
│   └── operational-service.ts  # Fungsi pemanggil endpoint REST backend
└── types/                      # Definisi tipe TypeScript domain & API
    ├── domain.ts               # Tipe aset, event, insiden, status, role
    └── operational.ts          # Skema DTO request/response payload
```

---

## 4. Prinsip Desain Utama

1. **Prinsip Hak Akses Terkecil (Least Privilege)**: Pengguna hanya dapat mengakses atau memodifikasi data sesuai perannya. Viewer tidak dapat mengakses tombol aksi penulisan (*mutation*).
2. **Explainability First**: Setiap deteksi ancaman dan angka risiko harus memiliki alasan matematis dan bukti log yang dapat diperiksa oleh manusia (*human verifiable*).
3. **Defensive Isolation**: Tidak ada perintah destruktif otomatis ke infrastruktur; seluruh tindakan perbaikan dijalankan dengan rekomendasi SOP (*Human-in-the-Loop*).
