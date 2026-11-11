# SATRIA SENTINEL — Technology Stack Documentation
**Status**: Verifikasi Kode Nyata (Actual Implementation)

Dokumen ini mencatat seluruh dependensi, pustaka, dan teknologi yang digunakan dalam proyek SATRIA SENTINEL beserta alasan pemilihannya.

---

## 1. Frontend Architecture Stack

| Teknologi | Versi Aktual | Tujuan Penggunaan | Alasan Pemilihan & Manfaat |
| :--- | :---: | :--- | :--- |
| **Next.js** | `15.5.29` | Framework aplikasi web utama dengan App Router | Performa SSR/SSG tinggi, struktur route berbasis folder yang bersih, optimasi aset otomatis, dan standar modern industri. |
| **React** | `19.0.0` | UI Library berbasis komponen reaktif | Manajemen state deklaratif, konkurensi modern, dan ekosistem komponen yang sangat matang. |
| **TypeScript** | `5.8.0` | Bahasa pemrograman frontend dengan sistem tipe statis | Mencegah bug *runtime* (*type safety*), meningkatkan produktivitas refaktor, dan mendefinisikan *domain types* yang konsisten dengan backend. |
| **Tailwind CSS** | `3.4.17` | Utility-first CSS Framework | Memudahkan pembuatan antarmuka gelap (*dark mode*) bertema taktis militer (Dark Slate & Emerald Green) tanpa CSS bloat. |
| **Lucide React** | `0.475.0` | Pustaka ikonografi SVG | Ikon yang konsisten, berbobot ringan, dan representatif untuk elemen keamanan siber. |
| **Recharts** | `2.15.1` | Pustaka visualisasi data & bagan | Rendering grafik tren risiko, distribusi keparahan, dan breakdown metrik berbasis SVG yang fleksibel dan interaktif. |
| **shadcn/ui Pattern** | Custom Radix-style | Pola komponen UI aksesibel | Komponen UI modular (Card, Badge, Button, Input, Select, Dialog) dengan kontrol penuh pada kode sumber lokal. |

---

## 2. Backend & API Stack

| Teknologi | Versi Aktual | Tujuan Penggunaan | Alasan Pemilihan & Manfaat |
| :--- | :---: | :--- | :--- |
| **Python** | `3.14.4` | Bahasa pemrograman backend | Sintaks ekspresif, ekosistem pemrosesan data dan keamanan siber terbaik, serta kecepatan iterasi tinggi. |
| **FastAPI** | `0.115.8` | Kerangka kerja web API asinkron | Kinerja tinggi berbasis Starlette/Pydantic, validasi skema otomatis, dokumentasi OpenAPI/Swagger bawaan, dan *dependency injection*. |
| **Uvicorn** | `0.34.0` | Server ASGI berkecepatan tinggi | Mendukung konkurensi tinggi dan penanganan koneksi HTTP/1.1 stabil. |
| **Pydantic** | `2.10.6` | Validasi data, parsing, dan serialisasi | Penegakan tipe data ketat pada request/response body, sanitasi masukan otomatis, dan pesan error terpusat yang aman. |
| **SQLAlchemy** | `2.0.38` | ORM & toolkit database relasional | Pemetaan objek relasional deklaratif (ORM 2.0 style), dukungan transaksi ACID penuh, dan query builder yang kuat. |
| **Psycopg** | `3.2.4` | PostgreSQL database adapter | Driver native PostgreSQL tercepat untuk Python dengan dukungan type-safe dan connection pooling efisien. |
| **Alembic** | `1.14.1` | Pengelola migrasi skema database | Menjaga versi skema database tetap konsisten dan dapat direproduksi di berbagai lingkungan pengembangan. |

---

## 3. Cryptography & Security Core

| Komponen | Implementasi Teknis | Keamanan & Kepatuhan |
| :--- | :--- | :--- |
| **Password Hashing** | RFC 7914 **`scrypt`** via standard library `hashlib.scrypt` | Parameter: $N=16384, r=8, p=1, dklen=64$ dengan 16-byte random salt unik per pengguna. Tahan terhadap serangan brute-force GPU/ASIC. |
| **Token Autentikasi** | RFC 7519 **JWT (JSON Web Token)** via HMAC-SHA256 (HS256) | Token berumur pendek (default: 60 menit) dengan claim standar (`sub`, `role`, `jti`, `exp`). |
| **Pencabutan Token** | In-memory JTI revocation registry | Menjamin pembatalan token instan saat operator melakukan logout sebelum masa expired habis. |
| **Validasi String Konstan** | `hmac.compare_digest` | Mencegah eksploitasi *timing attack* pada perbandingan kata sandi dan token. |
| **RBAC Layer** | FastAPI Dependency Injection (`require_role`, `require_analyst_or_admin`) | Penegakan kontrol akses 3 tingkat (`admin`, `security_analyst`, `viewer`) pada level rute API. |

---

## 4. Development, Testing & DevOps

| Alat / Tool | Versi | Peran dalam Proyek |
| :--- | :---: | :--- |
| **Docker & Docker Compose** | Engine 27.x / Compose v2 | Orkestrasi lingkungan lokal kontainer terisolasi (PostgreSQL, backend, frontend). |
| **PostgreSQL** | `16-alpine` | RDBMS utama penyimpan aset, event, insiden, playbook, dan audit trail. |
| **Pytest** | `9.2.0` | Kerangka kerja pengujian otomatis backend (Unit & Integration tests). |
| **Playwright** | `1.50.1` | Pengujian End-to-End (E2E) dan otomatisasi verifikasi visual browser. |
| **Git & GitHub** | `2.43+` / gh CLI | Manajemen versi kode sumber dan sinkronisasi repositori publik. |
