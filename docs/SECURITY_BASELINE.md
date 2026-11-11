# SATRIA SENTINEL — Security Baseline & Defensive Controls

## 1. Autentikasi, Kriptografi Password, dan Manajemen Sesi

Implementasi kode sumber: [`backend/app/core/security.py`](../backend/app/core/security.py) dan [`backend/app/api/deps.py`](../backend/app/api/deps.py).

- **Password Hashing (`scrypt`)**: Seluruh password pengguna disimpan menggunakan algoritma derivasi kunci **RFC 7914 `scrypt`** (`n=16384, r=8, p=1, dklen=64`) dengan *random cryptographic salt* 16-byte per pengguna dan perbandingan waktu konstan (`hmac.compare_digest`). Tidak ada password yang disimpan dalam bentuk *plaintext*.
- **JSON Web Token (HS256) & Revokasi Logout**:
  - Token akses ditandatangani menggunakan `HMAC-SHA256` (`HS256`) dengan klaim `sub` (User UUID), `username`, `role`, `iat`, `exp`, dan `jti` unik.
  - Saat pengguna memanggil `POST /api/v1/auth/logout`, nilai `jti` dicatat ke dalam registri pencabutan token (*revocation registry*) sehingga token tersebut langsung ditolak pada permintaan berikutnya meskipun belum melewati waktu kedaluwarsa (`exp`).
- **Role-Based Access Control (RBAC)**:
  - `admin`: Hak akses penuh termasuk pembuatan pengguna dan penghapusan aset.
  - `security_analyst`: Hak akses operasional penuh untuk registrasi/pembaruan aset, impor log, generator sintetis, eksekusi mesin deteksi/korelasi/risiko, dan manajemen insiden.
  - `viewer`: Hak akses baca saja (*read-only*) untuk pemantauan *dashboard*, kejadian, insiden, *playbooks*, dan *audit trail*.

---

## 2. Keamanan Ingesti Log & Validasi Input

Implementasi kode sumber: [`backend/app/services/ingestion_service.py`](../backend/app/services/ingestion_service.py).

- **Tanpa Eksekusi Kode (`No Code/Command Execution`)**: Seluruh muatan log CSV maupun JSON diproses murni sebagai struktur data teks/JSON menggunakan `csv.DictReader` dan `json.loads`. Tidak ada penggunaan `eval()`, `exec()`, `pickle`, atau `subprocess` terhadap input log.
- **Sanitasi Input**: Karakter kontrol berbahaya (seperti *null byte* `\x00` dan karakter kontrol non-cetak) dibersihkan dari seluruh atribut string sebelum disimpan ke PostgreSQL.
- **Validasi Skema Pydantic v2**: Seluruh *request body* dan *query parameter* divalidasi secara ketat menggunakan skema Pydantic.

---

## 3. Penanganan Error, CORS, dan Kebersihan Rahasia (*Secret Hygiene*)

- **Centralized Exception Handling**: [`backend/app/core/exceptions.py`](../backend/app/core/exceptions.py) menangkap `HTTPException`, `RequestValidationError`, dan `Exception` tidak terduga serta mengembalikan amplop JSON terstandar (`ErrorEnvelope`) tanpa pernah membocorkan *stack trace* internal atau *connection string* database kepada klien.
- **Konfigurasi CORS Terbatas**: Daftar *origin* yang diizinkan dikendalikan melalui variabel lingkungan `BACKEND_CORS_ORIGINS` (default pengembangan: `http://localhost:3000,http://127.0.0.1:3000`).
- **Zero-Secret Repository**: File `.env` diabaikan oleh `.gitignore`; repositori hanya menyertakan `.env.example` dengan nilai contoh non-sensitif.
- **Imutabilitas Audit Trail**: Seluruh tindakan autentikasi, perubahan aset, impor log, eksekusi deteksi/korelasi, dan perubahan status insiden direkam secara otomatis ke tabel `audit_logs`.
