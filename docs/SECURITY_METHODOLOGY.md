# SATRIA SENTINEL — Security Architecture & Hardening Methodology
**Dokumentasi Desain Keamanan & Penguatan Pertahanan Sistem**

Platform SATRIA SENTINEL dirancang dengan prinsip pertahanan berlapis (*Defense-in-Depth*) untuk memastikan sistem itu sendiri kebal terhadap eksploitasi.

---

## 1. Kriptografi & Manajemen Kredensial

### 1.1 Password Hashing Memory-Hard (RFC 7914 scrypt)
- **Implementasi**: Menggunakan pustaka standar Python `hashlib.scrypt` tanpa dependensi eksternal C-binding yang rentan.
- **Konfigurasi Parameter**:
  - $N = 16384$ (CPU/memory cost parameter)
  - $r = 8$ (Block size parameter)
  - $p = 1$ (Parallelization parameter)
  - $dklen = 64$ (Derived key length)
- **Garam Kriptografis (Cryptographic Salt)**: 16-byte byte acak murni yang dibangkitkan oleh modul sistem operasi `secrets.token_bytes(16)`.
- **Ketahanan Terhadap Serangan**: Resistensi sangat tinggi terhadap serangan kamus (*dictionary attacks*), tabel pelangi (*rainbow tables*), dan akselerasi GPU/FPGA/ASIC.
- **Penyimpanan Database**: Format kanonikal `scrypt$16384$8$1$<salt_b64><hash_b64>`.

### 1.2 Autentikasi JWT HS256 & Pencabutan Token
- **Format Token**: Standar RFC 7519 JSON Web Token ditandatangani menggunakan algoritma simetris HMAC-SHA256 (`HS256`).
- **Masa Berlaku Token**: Default 60 menit.
- **Pencabutan Token Instan (JTI Revocation)**: Setiap token memiliki claim unik `jti` (UUID). Saat pengguna melakukan logout, `jti` didaftarkan ke dalam memori blacklist sistem sehingga token tidak dapat digunakan lagi meskipun belum kedaluwarsa.

---

## 2. Kontrol Akses Berbasis Peran (RBAC 3-Tingkat)

Sistem membedakan secara ketat hak akses operasional menjadi tiga peran (*roles*):

| Peran (Role) | Hak Baca (Read Permissions) | Hak Tulis (Write Permissions) | Hak Administratif (Admin Only) |
| :--- | :--- | :--- | :--- |
| **`viewer`** | Membaca dasbor, melihat inventaris aset, melihat security events, membaca insiden, membaca playbook, membaca audit log. | **TIDAK ADA**. Dilarang menambah/mengedit aset, ingesti log, mengubah status insiden, atau memicu playbook. | Tidak ada. |
| **`security_analyst`** | Seluruh hak baca di atas. | Menambah & mengedit aset, mengimpor log, generate data sintetis, mengeksekusi deteksi & korelasi, mengeskalasi & mengelola siklus insiden, resolusi insiden. | Tidak ada. |
| **`admin`** | Seluruh hak baca di atas. | Seluruh hak tulis analis di atas. | Menghapus aset, mendaftarkan pengguna baru, merotasi password pengguna, mengonfigurasi baseline sistem. |

Penegakan RBAC dilakukan ganda:
1. **Frontend Level**: Menyembunyikan tombol aksi mutasi untuk peran yang tidak berwenang.
2. **Backend API Level**: FastAPI dependency guards (`require_role`, `require_analyst_or_admin`) yang mengembalikan HTTP `403 Forbidden` jika role tidak mencukupi.

---

## 3. Sanitasi Masukan & Proteksi Ingesti Log

Untuk mencegah serangan injeksi kode dan penolakan layanan:
1. **Batas Ukuran Berkas**: File unggahan dibatasi maksimal 10 MB.
2. **Batas Baris Batch**: Ingesti dibatasi maksimal 1.000 record per pemanggilan API.
3. **Pembersihan Karakter Kontrol**: Karakter null byte (`\0`), escape sequences berbahaya, dan tag script disanitasi dari payload teks.
4. **Eksekusi Aman**: Parsing log CSV dan JSON dilakukan secara ketat dengan skema Pydantic tanpa memanggil fungsi `eval()` atau `exec()`.

---

## 4. Jejak Audit yang Tidak Dapat Diubah (Immutable Audit Trail)

- Seluruh tindakan keamanan sensitif (login berhasil, login gagal, penambahan aset, ingesti log, eskalasi insiden, penugasan analis, transisi status, penambahan catatan investigasi, resolusi insiden) dicatat secara otomatis ke dalam tabel `audit_logs`.
- **Perlindungan Immutability**:
  - API hanya menyediakan rute `GET /api/v1/audit-logs`.
  - Tidak ada rute `POST`, `PUT`, `PATCH`, atau `DELETE` yang diekspos untuk tabel audit.
  - Nilai rahasia (seperti kata sandi, token, atau private key) otomatis disaring dan di-redact sebelum ditulis ke audit log.
