# SATRIA SENTINEL — REST API Documentation (`/api/v1`)

Seluruh endpoint operasional berada di bawah prefix `/api/v1` dan menggunakan autentikasi **HTTP Bearer JWT (HS256)** kecuali `/api/v1/health` dan `/api/v1/auth/login`.

Implementasi router: [`backend/app/api/v1/router.py`](../backend/app/api/v1/router.py).

---

## 1. Role-Based Access Control (RBAC) Matrix

| Role | Nilai Enum | Hak Akses Endpoint |
| :--- | :--- | :--- |
| **Viewer** | `viewer` | Seluruh endpoint `GET` (pembacaan *dashboard*, aset, *security events*, deteksi, korelasi, risiko, insiden, *playbooks*, dan *audit logs*). |
| **Security Analyst** | `security_analyst` | Seluruh hak akses `viewer` **ditambah** `POST` / `PATCH` operasional: registrasi & pembaruan aset, *import* CSV/JSON, generator data sintetis, eksekusi deteksi/korelasi/risiko, serta pembuatan, pembaruan, penambahan catatan, dan resolusi insiden. |
| **Admin** | `admin` | Seluruh hak akses `security_analyst` **ditambah** manajemen pengguna (`POST /api/v1/users`) dan penghapusan aset (`DELETE /api/v1/assets/{asset_id}`). |

---

## 2. Daftar Endpoint REST API

### 2.1 System Health (`/api/v1/health`)
- `GET /api/v1/health?include_components=true`
  - **Auth**: Publik
  - **Deskripsi**: Memeriksa status aplikasi FastAPI, konektivitas PostgreSQL (`SELECT 1`), dan keberadaan 7 tabel fondasi tanpa membocorkan kredensial database.

### 2.2 Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/login`
  - **Auth**: Publik
  - **Body**: `{"username": "admin", "password": "<password>"}`
  - **Response**: `TokenResponse` (`access_token`, `token_type: "bearer"`, `expires_in_seconds`, `user`). Mencatat `auth.login.success` atau `auth.login.failed` ke `audit_logs`.
- `POST /api/v1/auth/logout`
  - **Auth**: Semua role terautentikasi
  - **Deskripsi**: Mencabut `jti` token JWT aktif dalam registri revokasi dan mencatat `auth.logout` ke `audit_logs`.
- `GET /api/v1/auth/me`
  - **Auth**: Semua role terautentikasi
  - **Deskripsi**: Mengembalikan profil pengguna dari sesi token aktif.

### 2.3 Users & RBAC (`/api/v1/users`)
- `GET /api/v1/users` (`viewer+`): Daftar pengguna aktif untuk penugasan insiden & tinjauan RBAC.
- `POST /api/v1/users` (`admin`): Membuat pengguna baru dengan password yang di-hash menggunakan `scrypt`.

### 2.4 Assets Inventory (`/api/v1/assets`)
- `GET /api/v1/assets` (`viewer+`): Daftar aset dengan filter `search`, `criticality`, dan `environment`.
- `GET /api/v1/assets/{asset_id}` (`viewer+`): Detail aset tunggal.
- `POST /api/v1/assets` (`security_analyst+`): Registrasi aset baru (mencatat `asset.create` di `audit_logs`).
- `PATCH /api/v1/assets/{asset_id}` (`security_analyst+`): Pembaruan atribut/kritikalitas aset (mencatat `asset.update` di `audit_logs`).
- `DELETE /api/v1/assets/{asset_id}` (`admin`): Menghapus aset (mencatat `asset.delete` di `audit_logs`).

### 2.5 Security Events (`/api/v1/security-events`)
- `GET /api/v1/security-events` (`viewer+`): Daftar *security events* terurut waktu terbaru dengan filter `search`, `severity`, `event_type`, `asset_id`, `only_detected`, `limit`, dan `offset`.
- `GET /api/v1/security-events/{event_id}` (`viewer+`): Detail satu *security event* beserta rincian aturan deteksi dan penjelasan skor risiko.

### 2.6 Log Ingestion & Synthetic Generator (`/api/v1/log-ingestion`)
- `GET /api/v1/log-ingestion/scenarios` (`viewer+`): Katalog 6 skenario generator data sintetis.
- `POST /api/v1/log-ingestion/generate-synthetic` (`security_analyst+`): Menghasilkan data simulasi bertanda `[SYNTHETIC SIMULATION]`, menjalankan mesin deteksi, korelasi, dan *risk scoring*, serta mencatat `log_ingestion.synthetic_generate` di `audit_logs`.
- `POST /api/v1/log-ingestion/import` (`security_analyst+`): Mengimpor log berformat `csv` atau `json` dengan validasi skema, sanitasi karakter berbahaya, deteksi duplikat (`event_hash` SHA-256), pelaporan error per baris, dan pencatatan `log_ingestion.import` di `audit_logs`.

### 2.7 Threat Detection Engine (`/api/v1/detections`)
- `GET /api/v1/detections/rules` (`viewer+`): Katalog 6 aturan deteksi deterministik beserta kondisi dan pemetaan MITRE ATT&CK.
- `GET /api/v1/detections/findings` (`viewer+`): Daftar temuan deteksi beserta alasan (`reason`) dan rekomendasi tindakan.
- `POST /api/v1/detections/run` (`security_analyst+`): Menjalankan evaluasi ulang aturan deteksi dan perhitungan risiko terhadap seluruh *security events*.

### 2.8 Event Correlation Engine (`/api/v1/correlations`)
- `GET /api/v1/correlations?window_minutes=120` (`viewer+`): Mengelompokkan *security events* terkait berdasarkan kesamaan aset, kesamaan IP sumber, kedekatan waktu, dan progresi multi-indikator beserta `correlation_explanation`.
- `POST /api/v1/correlations/run` (`security_analyst+`): Menjalankan analisis korelasi dan mencatat aktivitas di `audit_logs`.

### 2.9 Risk Scoring Engine (`/api/v1/risk-assessments`)
- `GET /api/v1/risk-assessments/methodology` (`viewer+`): Mengembalikan dokumentasi formula `0–100`, bobot 5 faktor, batas kategori (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), dan penafian non-probabilitas.
- `GET /api/v1/risk-assessments/summary` (`viewer+`): Ringkasan metrik risiko tingkat platform, distribusi tingkat risiko, dan profil risiko per aset.
- `POST /api/v1/risk-assessments/calculate` (`security_analyst+`): Menghitung rincian skor risiko (`RiskBreakdown`) secara langsung untuk parameter kejadian tertentu.

### 2.10 Incident Management (`/api/v1/incidents`)
- `GET /api/v1/incidents` (`viewer+`): Daftar insiden dengan filter `status`, `severity`, dan `search`.
- `GET /api/v1/incidents/{incident_id}` (`viewer+`): Detail insiden beserta lini masa (`timeline`), *linked events*, dan rekomendasi *playbook*.
- `POST /api/v1/incidents` (`security_analyst+`): Membuat insiden baru, menautkan *security events*, mencocokkan *playbook* otomatis, menghitung skor risiko gabungan, dan mencatat `incident.create` di `audit_logs`.
- `PATCH /api/v1/incidents/{incident_id}` (`security_analyst+`): Memperbarui status insiden (`open`, `investigating`, `containment`, `eradication`, `recovered`, `closed`), *severity*, analis yang ditugaskan (`assigned_to_id`), atau *playbook*, serta memperbarui `timeline_json` dan `audit_logs`.
- `POST /api/v1/incidents/{incident_id}/events` (`security_analyst+`): Menautkan *security events* tambahan ke insiden.
- `POST /api/v1/incidents/{incident_id}/notes` (`security_analyst+`): Menambahkan catatan investigasi analis ke lini masa insiden dan `audit_logs`.
- `POST /api/v1/incidents/{incident_id}/resolve` (`security_analyst+`): Menyelesaikan insiden dengan catatan resolusi & akar masalah (*root cause notes*).

### 2.11 Response Playbooks (`/api/v1/playbooks`)
- `GET /api/v1/playbooks` (`viewer+`): Daftar *Response Playbooks* defensif yang bersifat *advisory-only*.
- `GET /api/v1/playbooks/recommend?incident_type=...&event_type=...` (`viewer+`): Memberikan rekomendasi *playbook* yang paling relevan berdasarkan tipe insiden atau kejadian.

### 2.12 Audit Trail (`/api/v1/audit-logs`)
- `GET /api/v1/audit-logs?action=...&entity_type=...&limit=100` (`viewer+`): Daftar jejak audit imutabel atas seluruh aktivitas autentikasi, perubahan data aset, *ingestion*, deteksi, dan siklus hidup insiden.
