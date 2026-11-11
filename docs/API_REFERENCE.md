# SATRIA SENTINEL — REST API Reference
**Base URL**: `/api/v1`  
**Authentication**: Bearer Token (`Authorization: Bearer <JWT_ACCESS_TOKEN>`)  
**Data Format**: JSON (`Content-Type: application/json`)

Dokumen ini menyediakan referensi lengkap seluruh endpoint API yang tersedia pada platform SATRIA SENTINEL, dikelompokkan berdasarkan domain fungsional.

---

## 1. Authentication & Users (`/api/v1/auth` & `/api/v1/users`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/token` | Public | Login pengguna, validasi scrypt, dan penerbitan access token JWT HS256. |
| `GET` | `/auth/me` | Authenticated | Mengambil profil dan peran pengguna yang sedang aktif. |
| `POST` | `/auth/logout` | Authenticated | Logout pengguna dan mencatat JTI token ke dalam daftar pencabutan (*revocation*). |
| `GET` | `/users` | `admin` | Menampilkan seluruh akun pengguna terdaftar (hash password tidak ditampilkan). |
| `POST` | `/users` | `admin` | Mendaftarkan pengguna baru dan meng-hash password menggunakan scrypt RFC 7914. |
| `PUT` | `/users/{id}` | `admin` | Memperbarui nama, role, status aktif, atau merotasi password pengguna. |

### Contoh Request Login (`POST /api/v1/auth/token`)
```json
{
  "username": "analyst",
  "password": "SatriaAnalyst#2026"
}
```

### Contoh Response Sukses (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "968d8ab1-85b1-4dd4-bb02-fe387b6feb65",
    "username": "analyst",
    "email": "analyst@satria-sentinel.local",
    "full_name": "Raka Pratama (Senior Security Analyst)",
    "role": "security_analyst",
    "is_active": true
  }
}
```

---

## 2. Digital Assets (`/api/v1/assets`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/assets` | `viewer`, `analyst`, `admin` | Daftar aset digital dengan filter kritikalitas, tipe, dan pencarian nama/tag. |
| `GET` | `/assets/{id}` | `viewer`, `analyst`, `admin` | Detail aset lengkap beserta daftar event keamanan terkait. |
| `POST` | `/assets` | `analyst`, `admin` | Mendaftarkan aset digital baru. |
| `PUT` | `/assets/{id}` | `analyst`, `admin` | Memperbarui informasi aset (IP, status kritikalitas, owner). |
| `DELETE`| `/assets/{id}` | `admin` | Menghapus aset dari inventaris. |

---

## 3. Security Events & Ingestion (`/api/v1/security-events` & `/api/v1/log-ingestion`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/security-events` | `viewer`, `analyst`, `admin` | Querying event keamanan dengan paginasi dan filter severity/tipe. |
| `GET` | `/security-events/{id}` | `viewer`, `analyst`, `admin` | Detail event dan visualisasi kalkulasi risiko. |
| `POST` | `/log-ingestion/import` | `analyst`, `admin` | Mengimpor file log mentah (CSV atau JSON) dengan deduplikasi SHA-256. |
| `POST` | `/log-ingestion/generate-synthetic` | `analyst`, `admin` | Menghasilkan telemetri sintetis simulasi serangan (brute force, port scan, privesc). |

---

## 4. Detections & Correlations (`/api/v1/detections` & `/api/v1/correlations`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/detections/rules` | `viewer`, `analyst`, `admin` | Daftar 6 aturan deteksi deterministik beserta metadata dan deskripsi SOP. |
| `POST` | `/detections/run` | `analyst`, `admin` | Mengeksekusi evaluasi aturan deteksi pada seluruh event yang belum dianalisis. |
| `GET` | `/correlations/clusters` | `viewer`, `analyst`, `admin` | Menampilkan klaster ancaman hasil korelasi kejadian terkait. |
| `POST` | `/correlations/run` | `analyst`, `admin` | Menjalankan algoritma pengelompokan korelasi dalam jendela waktu tertentu. |

---

## 5. Incidents & Response Workspace (`/api/v1/incidents`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/incidents` | `viewer`, `analyst`, `admin` | Daftar insiden keamanan terfilter berdasarkan status dan severity. |
| `GET` | `/incidents/{id}` | `viewer`, `analyst`, `admin` | Detail lengkap insiden, kronologis timeline, dan daftar event terkait. |
| `POST` | `/incidents` | `analyst`, `admin` | Membuat insiden baru atau mengeskalasi klaster korelasi menjadi tiket insiden. |
| `POST` | `/incidents/{id}/assign` | `analyst`, `admin` | Menugaskan analis keamanan yang bertanggung jawab menangani insiden. |
| `POST` | `/incidents/{id}/link-events` | `analyst`, `admin` | Menautkan security event tambahan ke insiden dan menghitung ulang skor risiko. |
| `POST` | `/incidents/{id}/notes` | `analyst`, `admin` | Menambahkan catatan analisis investigasi ke dalam kronologi timeline. |
| `POST` | `/incidents/{id}/status` | `analyst`, `admin` | Mentransisikan status insiden (`open`, `investigating`, `contained`, `closed`). |
| `POST` | `/incidents/{id}/resolve`| `analyst`, `admin` | Menyelesaikan insiden dengan wajib menyertakan analisis akar masalah (*root cause*). |

---

## 6. Defensive Response Playbooks (`/api/v1/playbooks`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/playbooks` | `viewer`, `analyst`, `admin` | Menampilkan seluruh katalog playbook penanganan insiden NIST SP 800-61. |
| `GET` | `/playbooks/{id}` | `viewer`, `analyst`, `admin` | Menampilkan detail langkah mitigasi dan perintah CLI dari sebuah playbook. |
| `GET` | `/playbooks/recommend` | `viewer`, `analyst`, `admin` | Memberikan rekomendasi cerdas playbook berdasarkan tipe ancaman insiden. |

---

## 7. Audit Trail & Health (`/api/v1/audit-logs` & `/api/v1/health`)

| Method | Endpoint | Role Diperlukan | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/audit-logs` | `viewer`, `analyst`, `admin` | Menampilkan riwayat jejak audit sistem append-only dengan paginasi dan filter aksi. |
| `GET` | `/health` | Public | Liveness probe dan verifikasi kesiapan koneksi database PostgreSQL. |
