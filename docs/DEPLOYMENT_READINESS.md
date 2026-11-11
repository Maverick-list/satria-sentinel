# SATRIA SENTINEL — Deployment Readiness & Operations Guide

**Project**: SATRIA SENTINEL (Security Asset & Threat Response Intelligence Assistant)  
**Status**: Local & Container Deployment Verified (Ready for On-Premise / Self-Hosted Staging)  
**Target Environment**: Linux (Ubuntu 22.04 / 24.04 LTS, Debian 12) dengan Docker Engine & Docker Compose  

---

## 1. Status Kesiapan Deployment (*Readiness Summary*)

| Komponen Deployment | Status Verifikasi | Catatan Operasional |
| :--- | :--- | :--- |
| **Docker Compose Orchestration** | **VERIFIED** | Mendefinisikan 3 layanan terisolasi: `db`, `backend`, dan `frontend` di jaringan `satria_net`. |
| **PostgreSQL Database** | **VERIFIED** | PostgreSQL `16-alpine` dengan volume persisten `satria_pgdata` dan *healthcheck* otomatis. |
| **Database Migrations (Alembic)** | **VERIFIED** | Terintegrasi otomatis pada perintah startup container backend (`alembic upgrade head`). |
| **FastAPI Backend Service** | **VERIFIED** | Menjalankan server Uvicorn pada port `:8000` dengan pengecekan kesehatan via curl. |
| **Next.js Frontend Service** | **VERIFIED** | Build produksi teroptimasi (`next start -p 3000`) pada Node.js 22 Alpine. |
| **Health Check Endpoint** | **VERIFIED** | `GET /api/v1/health` mengembalikan status database dan integritas migrasi 7 tabel. |
| **Interactive API Documentation** | **VERIFIED** | Swagger UI aktif di `/api/v1/docs` dan ReDoc aktif di `/api/v1/redoc`. |
| **Public Deployment Notice** | **LOCAL / ON-PREMISE ONLY** | Belum dideploy ke domain publik; tidak ada URL publik fiktif yang diklaim. |

---

## 2. Panduan Variabel Lingkungan (*Environment Configuration*)

Salin berkas template `.env.example` ke `.env` di root repositori:

```bash
cp .env.example .env
```

### Kamus Variabel Lingkungan

| Nama Variabel | Wajib / Opsional | Nilai Standar / Rekomendasi | Deskripsi & Tujuan Keamanan |
| :--- | :---: | :--- | :--- |
| `PROJECT_NAME` | Opsional | `SATRIA SENTINEL` | Nama tampilan platform pada log dan OpenAPI. |
| `ENVIRONMENT` | Opsional | `production` / `development` | Mode runtime aplikasi. |
| `APP_VERSION` | Opsional | `0.1.0` | Versi build rilis. |
| `LOG_LEVEL` | Opsional | `INFO` | Tingkat verbositas log sistem (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `API_V1_PREFIX` | Opsional | `/api/v1` | Awalan rute API versi 1. |
| `POSTGRES_USER` | **Wajib** | `satria_admin` | Username pengelola database PostgreSQL. |
| `POSTGRES_PASSWORD` | **Wajib** | *Gunakan kata sandi kuat* | Kata sandi database (minimal 16 karakter acak). |
| `POSTGRES_DB` | **Wajib** | `satria_sentinel_db` | Nama database relasional aplikasi. |
| `POSTGRES_PORT` | Opsional | `5432` | Port eksposur PostgreSQL pada host. |
| `DATABASE_URL` | **Wajib** | `postgresql+psycopg://...` | URI koneksi SQLAlchemy untuk backend. |
| `JWT_SECRET_KEY` | **Wajib** | *Kunci kriptografis 64-karakter* | Kunci simetris HMAC-SHA256 untuk menandatangani JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Opsional | `480` | Durasi aktif token akses sebelum kedaluwarsa (menit). |
| `CORS_ORIGINS` | **Wajib** | `http://localhost:3000` | Daftar domain asal peramban yang diizinkan memanggil API. |
| `NEXT_PUBLIC_APP_NAME` | Opsional | `SATRIA SENTINEL` | Nama tampilan di antarmuka frontend. |
| `NEXT_PUBLIC_API_BASE_URL` | **Wajib** | `http://localhost:8000/api/v1` | URL basis API yang dipanggil peramban pengguna. |

---

## 3. Prosedur Menjalankan Aplikasi (*Startup Procedures*)

### Opsi A: Menjalankan Menggunakan Docker Compose (Direkomendasikan)

1. **Siapkan Konfigurasi Lingkungan**:
   ```bash
   cp .env.example .env
   # Edit .env dan masukkan POSTGRES_PASSWORD serta JWT_SECRET_KEY yang kuat
   nano .env
   ```
2. **Build dan Jalankan Seluruh Kontainer**:
   ```bash
   docker compose up -d --build
   ```
3. **Verifikasi Status Kontainer**:
   ```bash
   docker compose ps
   ```
   Pastikan ketiga layanan (`satria-sentinel-db`, `satria-sentinel-backend`, dan `satria-sentinel-frontend`) berstatus `Up (healthy)` atau `Up`.

4. **Verifikasi Endpoint Kesehatan**:
   ```bash
   curl -s http://localhost:8000/api/v1/health | python3 -m json.tool
   ```

5. **Akses Antarmuka Web**:
   Buka peramban di `http://localhost:3000`.

---

### Opsi B: Menjalankan Secara Manual pada Host (Host Development)

1. **Jalankan Database PostgreSQL**:
   ```bash
   docker compose up -d db
   ```
2. **Setup dan Jalankan Backend**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Setup dan Jalankan Frontend**:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   npm run build
   npm run start
   ```

---

## 4. Prosedur Restart, Pemulihan & Troubleshooting (*Restart & Recovery*)

### 4.1. Restart Seluruh Layanan
```bash
docker compose restart
```

### 4.2. Penanganan Masalah Koneksi Database
Jika backend gagal terhubung ke database saat startup:
```bash
# Periksa status kesehatan PostgreSQL
docker compose logs db --tail 50
# Pastikan kontainer db berstatus healthy sebelum backend mulai
docker compose up -d db
docker compose restart backend
```

### 4.3. Menjalankan Ulang Migrasi Skema Database
```bash
docker compose exec backend alembic upgrade head
```

### 4.4. Pembersihan Data Simulasi & Reset Total
Jika ingin mereset seluruh database ke kondisi awal kosong dengan akun bawaan:
```bash
docker compose down -v
docker compose up -d --build
```
*Catatan: Parameter `-v` akan menghapus volume data `satria_pgdata` dan membangun ulang skema awal.*

---

## 5. Rencana & Langkah Manual Menuju Deployment Cloud Publik

Platform saat ini telah 100% siap untuk di-deploy ke lingkungan komputasi awan (misalnya GCP Compute Engine, AWS EC2, atau VPS Mandiri). Berikut daftar periksa manual yang diperlukan sebelum *go-live* publik:

1. **Domain & DNS**: Memetakan domain/subdomain publik (misal: `sentinel.kartika.id`) ke alamat IP statis server.
2. **Reverse Proxy & SSL/TLS**: Mengonfigurasi Nginx atau Caddy sebagai reverse proxy dengan sertifikat HTTPS otomatis dari Let's Encrypt.
3. **Pembaruan Environment**:
   - Ubah `NEXT_PUBLIC_API_BASE_URL` ke `https://api.sentinel.kartika.id/api/v1`.
   - Ubah `CORS_ORIGINS` ke `https://sentinel.kartika.id`.
   - Ganti `JWT_SECRET_KEY` dengan string acak 64-karakter yang dihasilkan secara kriptografis (`openssl rand -hex 32`).
4. **Firewall Perimeter**: Buka hanya port `80` (HTTP) dan `443` (HTTPS) ke publik; tutup akses port database `5432` dari luar.
