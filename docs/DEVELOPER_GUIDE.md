# SATRIA SENTINEL — Developer & Contributor Guide
**Panduan Arsitektur Kode, Standar Pengembangan & Panduan Berkontribusi**

Dokumen ini ditujukan bagi perekayasa perangkat lunak dan arsitek sistem yang ingin memelihara, memperluas aturan deteksi, atau mengintegrasikan modul baru ke dalam platform SATRIA SENTINEL.

---

## 1. Lingkungan Pengembangan Lokal (Local Dev Setup)

### Struktur Repositori
```
satria-sentinel/
├── backend/            # Aplikasi FastAPI, SQLAlchemy models, alembic, dan pytest
├── frontend/           # Aplikasi Next.js 15, components, services, dan playwright
├── docs/               # Dokumentasi arsitektur, API, diagram, dan panduan
├── infrastructure/     # Konfigurasi basis data PostgreSQL init script
├── scripts/            # Skrip otomatisasi pengujian dan verifikasi browser
├── docker-compose.yml  # Definisi kontainer layanan lokal
└── README.md           # Ringkasan utama proyek
```

### Menjalankan Backend Dev Server
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Menjalankan Frontend Dev Server
```bash
cd frontend
npm run dev
```

---

## 2. Cara Menambahkan Aturan Deteksi Baru (Adding Detection Rules)

Seluruh logika deteksi terpusat di [`backend/app/services/detection_service.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/services/detection_service.py).

Langkah-langkah:
1. Daftarkan definisi aturan baru di kamus `STATIC_RULES_CATALOG`:
   ```python
   "SATRIA-RULE-NEW-007": {
       "rule_id": "SATRIA-RULE-NEW-007",
       "name": "SQL Injection Pattern Detected",
       "category": "Injection",
       "severity": "high",
       "confidence": 0.88,
       "description": "Mendeteksi payload injeksi SQL pada request parameter.",
   }
   ```
2. Tambahkan fungsi evaluator pada `evaluate_event()`:
   ```python
   if _has_sql_injection_pattern(event.raw_payload):
       findings.append(...)
   ```
3. Tambahkan unit test baru di [`backend/tests/test_phase2_engine.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/tests/test_phase2_engine.py) untuk menguji kondisi *true positive* dan batas *false positive*.

---

## 3. Menambahkan SOP Response Playbook Baru

1. Tambahkan data playbook di [`backend/app/services/playbook_service.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/services/playbook_service.py):
   ```python
   {
       "code": "PB-IR-006",
       "name": "Ransomware Immediate Quarantine SOP",
       "category": "Malware",
       "target_severity": "critical",
       "steps_json": [
           {
               "step": 1,
               "title": "Isolate Network Adapter",
               "command": "ip link set dev eth0 down",
               "description": "Putuskan koneksi fisik/virtual secara instan."
           }
       ]
   }
   ```
2. Pastikan playbook terhubung dengan rekomendasi otomatis pada rute `/api/v1/playbooks/recommend`.

---

## 4. Standar Kode & Kualitas (Code Quality & Testing)

Sebelum melakukan commit atau push:

1. **Jalankan Test Backend**:
   ```bash
   cd backend && .venv/bin/pytest -v
   ```
2. **Jalankan Typecheck Frontend**:
   ```bash
   cd frontend && npm run typecheck
   ```
3. **Jalankan Production Build Frontend**:
   ```bash
   cd frontend && npm run build
   ```
4. **Jalankan Test End-to-End**:
   ```bash
   cd frontend && npx playwright test
   ```
5. **Verifikasi Kebersihan Git**:
   Pastikan tidak ada kredensial, token, atau file `.env` yang terlacak oleh Git:
   ```bash
   git status
   git ls-files .env
   ```
