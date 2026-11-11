# SATRIA SENTINEL — Deployment & Operations Guide
**Panduan Penerapan Produksi Lokal & Cloud**

Dokumen ini menyediakan panduan langkah demi langkah untuk menjalankan SATRIA SENTINEL baik di lingkungan kontainer terisolasi lokal maupun cloud publik.

---

## 1. Persyaratan Minimum Sistem (Prerequisites)

- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12 direkomendasikan), macOS, atau Windows WSL2.
- **Hardware**:
  - CPU: Minimum 2 Cores (Direkomendasikan 4 Cores)
  - RAM: Minimum 4 GB (Direkomendasikan 8 GB)
  - Storage: 10 GB ruang disk kosong
- **Perangkat Lunak**:
  - Docker Engine $\ge 24.0$ & Docker Compose $\ge 2.20$
  - Node.js $\ge 20.x$ & npm $\ge 10.x$
  - Python $\ge 3.12$ & PostgreSQL client tools (`psql`)

---

## 2. Penerapan Cepat Berbasis Docker Compose (Direkomendasikan)

Platform SATRIA SENTINEL telah dikonfigurasikan secara penuh dalam [`docker-compose.yml`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/docker-compose.yml).

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/Maverick-list/satria-sentinel.git
cd satria-sentinel
```

### Langkah 2: Salin File Konfigurasi Environment
```bash
cp .env.example .env
```
*Catatan: Sesuaikan `POSTGRES_PASSWORD` dan `JWT_SECRET_KEY` dengan string acak bernilai tinggi untuk deployment produksi.*

### Langkah 3: Jalankan Seluruh Layanan
```bash
docker compose up -d --build
```

### Langkah 4: Verifikasi Status Kontainer
```bash
docker compose ps
```
Seluruh 3 kontainer (`satria-sentinel-db`, `satria-sentinel-backend`, `satria-sentinel-frontend`) harus berada dalam status `Up (healthy)`.

### Langkah 5: Akses Aplikasi
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check API**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 3. Penerapan Mandiri Tanpa Docker (Local Bare-Metal Setup)

### A. Konfigurasi Database PostgreSQL
```bash
createdb satria_sentinel_db
```

### B. Menjalankan Backend FastAPI
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### C. Menjalankan Frontend Next.js
```bash
cd frontend
npm install
npm run build
npm start -p 3000
```

---

## 4. Panduan Penerapan Cloud Publik (Vercel & Render / Fly.io)

### Arsitektur Produksi Cloud
- **Frontend**: Di-deploy pada Vercel (Next.js Edge/Serverless)
- **Backend**: Di-deploy pada Render / Fly.io / AWS ECS (FastAPI Container)
- **Database**: PostgreSQL Terkelola (Neon / Supabase / AWS RDS)

### Variabel Lingkungan Produksi Backend
```ini
ENVIRONMENT=production
LOG_LEVEL=INFO
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+psycopg://<user>:<password>@<db-host>:5432/<dbname>?sslmode=require
CORS_ORIGINS=https://satria-sentinel.vercel.app
JWT_SECRET_KEY=<generate-random-64-character-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Variabel Lingkungan Produksi Frontend
```ini
NEXT_PUBLIC_APP_NAME="SATRIA SENTINEL"
NEXT_PUBLIC_API_BASE_URL="https://satria-backend.onrender.com/api/v1"
```

---

## 5. Prosedur Rollback & Troubleshooting

### Kasus: Backend Gagal Terhubung ke Database
1. Periksa ketersediaan database: `docker exec -i satria-sentinel-db pg_isready -U satria_dev -d satria_sentinel_db`.
2. Periksa format `DATABASE_URL` (wajib menggunakan skema `postgresql+psycopg://`).

### Kasus: Migrasi Skema Mengalami Konflik
```bash
cd backend
alembic downgrade -1
alembic upgrade head
```

### Kasus: Reset Lingkungan Demo ke Kondisi Awal Bersih
```bash
docker compose down -v
docker compose up -d --build
```
*Tindakan ini akan membuat ulang database dan memicu skrip seeding awal secara otomatis.*
