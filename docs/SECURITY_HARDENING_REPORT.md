# SATRIA SENTINEL — Security Hardening & Threat Posture Report

**Project**: SATRIA SENTINEL (Security Asset & Threat Response Intelligence Assistant)  
**Date**: 2026-11-12  
**Scope**: Full-Stack Security Architecture, Cryptography, RBAC, Ingestion Defense, and Operational Hygiene  

---

## 1. Ringkasan Postur Keamanan (*Executive Security Summary*)

Platform **SATRIA SENTINEL** dirancang dengan pendekatan *Defensive by Design* dan *Zero Trust* pada lapisan operasional. Dalam Phase 4, dilakukan audit keamanan menyeluruh (*security hardening audit*) untuk memastikan bahwa sistem tidak hanya berfungsi sebagai alat pemantau, tetapi juga membentengi dirinya sendiri dari potensi eksploitasi oleh pihak yang tidak berwenang.

Hasil verifikasi:
- **Kredensial & Secrets**: `ZERO SECRET MATCHES` terdeteksi pada pemindaian seluruh berkas yang terlacak oleh Git.
- **RBAC Strict Enforcement**: Teruji ketat pada tingkat endpoint backend FastAPI via dependencies (`require_admin`, `require_analyst_or_admin`, `require_viewer_or_above`).
- **Input Sanitization**: Ingesti log CSV/JSON menolak berkas melebihi batas ukuran, membersihkan formula spreadsheet berbahaya, dan tidak pernah mengeksekusi muatan log sebagai perintah sistem.

---

## 2. Rincian Hardening Arsitektur & Kontrol Keamanan

### 2.1. Manajemen Kredensial & Password Hashing
- **Algoritma**: RFC 7914 **scrypt** (Memory-hard key derivation function).
- **Parameter Kriptografi**:
  - $N = 16384$ (CPU/memory cost parameter)
  - $r = 8$ (Block size parameter)
  - $p = 1$ (Parallelization parameter)
  - Key length = 64 bytes (`dklen=64`)
  - Salt = 16 bytes acak kriptografis (`secrets.token_bytes(16)` per user)
- **Mitigasi Serangan**:
  - Resistensi tinggi terhadap serangan *GPU-accelerated brute-force* dan *ASIC-based rainbow tables* berkat kebutuhan memori intensif algoritma scrypt.
  - Verifikasi kata sandi dijalankan menggunakan fungsi `hmac.compare_digest` untuk mengeliminasi kerentanan *timing attack*.
  - Panjang kata sandi minimal 6 karakter ditegakkan di level API.

### 2.2. Otentikasi JWT & Manajemen Token
- **Format Token**: RFC 7519 JSON Web Token (`JWT`) bertanda tangan HMAC-SHA256 (`HS256`).
- **Klaim Token**:
  - `sub`: ID Pengguna (UUIDv4)
  - `username`: Nama operator
  - `role`: Peran kanonikal RBAC (`admin`, `security_analyst`, `viewer`)
  - `jti`: JWT ID acak unik per sesi login
  - `iat`: Waktu penerbitan (Unix timestamp)
  - `exp`: Waktu kedaluwarsa token (ditegakkan ketat, default 480 menit / 8 jam)
- **Validasi Kriptografis**:
  - Verifikasi tanda tangan dilakukan secara mandiri di backend menggunakan `hmac.new` dengan kunci rahasia `JWT_SECRET_KEY` sebelum membaca muatan token.
  - Perbandingan tanda tangan menggunakan `hmac.compare_digest`.
  - Token yang dimodifikasi segmen payload-nya secara otomatis ditolak dengan kode `401 UNAUTHORIZED_INVALID_TOKEN`.
  - Token yang melewati waktu kedaluwarsa ditolak dengan kode `401 UNAUTHORIZED_TOKEN_EXPIRED`.

---

## 3. Analisis Mendalam Batasan Token Revocation & Panduan Multi-Worker

> [!IMPORTANT]
> **Dokumentasi Batasan Teknis Terbuka (*Process-Local Revocation*)**

Dalam implementasi prototype saat ini di `backend/app/core/security.py`, pencabutan token saat *logout* dicatat menggunakan struktur data lokal Python:
```python
_REVOKED_TOKEN_JTIS: set[str] = set()
```
- **Kelebihan**: Berkecepatan tinggi ($O(1)$ lookup), tanpa ketergantungan infrastruktur pihak ketiga untuk instalasi lokal atau pengujian kontainer tunggal.
- **Batasan**: Struktur data ini bersifat **in-memory process-local**. Jika backend dijalankan dalam mode multi-worker (misalnya `uvicorn --workers 4`) atau pada beberapa kontainer terdistribusi di balik load balancer, permintaan berikutnya yang mendarat pada proses/worker yang berbeda tidak akan memiliki catatan JTI yang dicabut tersebut sampai token kedaluwarsa secara alami berdasarkan klaim `exp`.
- **Rekomendasi Lingkungan Produksi (Multi-Worker / Enterprise)**:
  Untuk deployment skala besar dengan banyak worker, *token revocation registry* harus dimigrasikan ke shared in-memory database dengan *Time-To-Live* (TTL) otomatis, seperti **Redis** (`SETEX revoked_jti:<jti> <remaining_ttl_seconds> 1`).

---

## 4. Analisis Keutuhan Jejak Audit (*Audit Log Integrity*)

> [!NOTE]
> **Tingkat Perlindungan Jejak Audit (*Audit Trail Protections*)**

SATRIA SENTINEL menerapkan prinsip akuntabilitas tanpa kompromi pada layanan jejak audit (`backend/app/services/audit_service.py`):
1. **Nihil Rute Modifikasi pada API**:
   Pada rute `/api/v1/audit-logs`, hanya tersedia metode `GET` (daftar log audit). Tidak ada rute `POST`, `PUT`, `PATCH`, atau `DELETE` yang diekspos ke klien.
2. **Pencatatan Eksklusif dari Dalam Backend**:
   Entri audit log hanya dapat dibuat oleh fungsi internal backend (`record_audit_log`) saat terjadi operasi penting (login, pembuatan aset, ingesti log, pembentukan deteksi, eskalasi insiden, penugasan analis, penambahan catatan, dan resolusi kasus).
3. **Penyaringan Kredensial Sensitif**:
   Fungsi pencatatan audit secara otomatis membersihkan kunci-kunci sensitif:
   ```python
   for forbidden_key in ("password", "password_hash", "token", "access_token", "secret"):
       safe_details.pop(forbidden_key, None)
   ```
4. **Batasan Integritas Database**:
   Di tingkat aplikasi, jejak audit berstatus *append-only*. Namun, secara teknis pada level database PostgreSQL, superuser database (`POSTGRES_USER`) masih memiliki kapabilitas mutasi kecuali database dikonfigurasi dengan izin tabel *INSERT-only* atau media penyimpanan *Write Once Read Many* (WORM).

---

## 5. Matriks Penegakan RBAC (*Role-Based Access Control*)

Tiga peran operasional ditegakkan melalui FastAPI dependency injection:

| Rute / Kapabilitas Operasional | Endpoint API | ADMIN | SECURITY_ANALYST | VIEWER |
| :--- | :--- | :---: | :---: | :---: |
| **Pemeriksaan Kesehatan & Metrik** | `GET /api/v1/health` | **Allowed** | **Allowed** | **Allowed** |
| **Daftar Inventaris Aset** | `GET /api/v1/assets` | **Allowed** | **Allowed** | **Allowed** |
| **Pembuatan Aset Baru** | `POST /api/v1/assets` | **Allowed** | **Denied (403)** | **Denied (403)** |
| **Pembaruan Data Aset** | `PATCH /api/v1/assets/{id}` | **Allowed** | **Denied (403)** | **Denied (403)** |
| **Daftar Pengguna Sistem** | `GET /api/v1/users` | **Allowed** | **Allowed** | **Allowed** |
| **Pembuatan Akun Operator Baru** | `POST /api/v1/users` | **Allowed** | **Denied (403)** | **Denied (403)** |
| **Pembangkitan Log Sintetis** | `POST /api/v1/log-ingestion/generate-synthetic` | **Allowed** | **Allowed** | **Denied (403)** |
| **Impor Berkas Log CSV/JSON** | `POST /api/v1/log-ingestion/import` | **Allowed** | **Allowed** | **Denied (403)** |
| **Eksekusi Mesin Deteksi** | `POST /api/v1/detections/run` | **Allowed** | **Allowed** | **Denied (403)** |
| **Eksekusi Mesin Korelasi** | `POST /api/v1/correlations/run` | **Allowed** | **Allowed** | **Denied (403)** |
| **Pembuatan Kasus Insiden** | `POST /api/v1/incidents` | **Allowed** | **Allowed** | **Denied (403)** |
| **Penugasan Analis Insiden** | `POST /api/v1/incidents/{id}/assign` | **Allowed** | **Allowed** | **Denied (403)** |
| **Transisi Status Insiden** | `POST /api/v1/incidents/{id}/status` | **Allowed** | **Allowed** | **Denied (403)** |
| **Penambahan Catatan Investigasi** | `POST /api/v1/incidents/{id}/notes` | **Allowed** | **Allowed** | **Denied (403)** |
| **Resolusi Kasus Insiden** | `POST /api/v1/incidents/{id}/resolve` | **Allowed** | **Allowed** | **Denied (403)** |
| **Pembacaan Jejak Audit** | `GET /api/v1/audit-logs` | **Allowed** | **Allowed** | **Allowed** |

---

## 6. Perlindungan Ingesti Data & Sanitasi Input

1. **Pembatasan Ukuran Muatan (*Payload Size Guard*)**:
   - Konten log yang diunggah dibatasi maksimal 2 MB per batch permintaan. Berkas berukuran lebih besar langsung ditolak dengan kode status `413 PAYLOAD_TOO_LARGE`.
2. **Sanitasi Formula Injeksi CSV**:
   - Seluruh baris CSV yang diawali karakter eksekusi spreadsheet (`=`, `+`, `-`, `@`, `\t`, `\r`) dinetralisir untuk mencegah serangan *CSV Formula Injection* pada perangkat analis.
3. **Pembersihan Karakter Kontrol**:
   - Karakter non-printable berbahaya (seperti null byte `\x00` dan ANSI escape sequence `\x1b`) dihapus sebelum pemrosesan.
4. **Deduplikasi Kejadian Kriptografis**:
   - Setiap baris kejadian menghasilkan sidik jari SHA-256 (`event_fingerprint`) yang dihitung dari kombinasi: asset_tag, event_type, source, source_ip, destination_ip, dan waktu kejadian. Baris duplikat diabaikan secara aman untuk mencegah pembengkakan database (*resource exhaustion*).

---

## 7. Keamanan Jaringan & Header HTTP

Setiap respon HTTP dari backend SATRIA SENTINEL dilengkapi header keamanan pertahanan berlapis:
- `X-Content-Type-Options: nosniff`: Mencegah peramban melakukan MIME-sniffing terhadap respon API.
- `X-Frame-Options: DENY`: Memblokir serangan clickjacking dengan melarang penyematan aplikasi di dalam frame/iframe situs lain.
- `Referrer-Policy: strict-origin-when-cross-origin`: Membatasi kebocoran URL referer ke pihak luar.
- `X-Request-ID`: Melacak setiap transaksi permintaan API untuk penelusuran insiden forensik (*forensic audit trail*).
- `CORS Policy`: Dibatasi secara eksplisit ke domain frontend yang diizinkan (default `http://localhost:3000` dan `http://127.0.0.1:3000`).
