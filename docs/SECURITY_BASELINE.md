# SATRIA SENTINEL — Security Baseline (Phase 1)

Dokumen ini mencatat kontrol keamanan dasar yang telah diimplementasikan secara nyata pada **Phase 1**.

---

## 1. Secret & Configuration Management

- **Zero Hardcoded Secrets**: Tidak ada password produksi, API key, atau token rahasia yang disimpan di dalam kode sumber.
- **Environment Variable Validation**: Seluruh konfigurasi dibaca melalui `app/core/config.py` menggunakan `pydantic-settings`.
- **Git Ignore Protection**: File `.env`, `.env.local`, dan direktori volume database telah didaftarkan di `.gitignore`.
- **Template `.env.example`**: Disediakan dengan nilai *placeholder* yang jelas (`CHANGE_ME_LOCAL_DEV_PASSWORD`).

---

## 2. API & Backend Security Controls

1. **Strict Input Validation**:
   - Setiap query parameter dan payload divalidasi oleh Pydantic v2 (`ConfigDict(extra="forbid")`).
   - Input yang tidak valid langsung ditolak dengan status HTTP `422 Unprocessable Entity` dan kode `VALIDATION_ERROR`.
2. **Centralized Exception Handling (No Stack-Trace Leakage)**:
   - Diimplementasikan pada `backend/app/core/exceptions.py`.
   - Error internal (`Exception`) dicatat secara lengkap ke log server terstruktur namun hanya mengembalikan pesan aman beserta `request_id` ke klien.
   - Endpoint `GET /api/v1/health` tidak pernah membocorkan `DATABASE_URL`, username, atau password database meskipun koneksi database terputus.
3. **Environment-Driven CORS Policy**:
   - Origin yang diizinkan dibaca dari variabel `CORS_ORIGINS` (bukan wildcard `*` bebas).
   - Metode HTTP dan header dibatasi secara eksplisit (`Authorization`, `Content-Type`, `X-Request-ID`).
4. **Defensive HTTP Response Headers**:
   - Middleware pada `backend/app/main.py` menyematkan header berikut pada setiap respons:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `X-Request-ID: <uuid>`
   - Di sisi frontend (`next.config.mjs`), header `X-Powered-By` dinonaktifkan (`poweredByHeader: false`).

---

## 3. Data Privacy & Ethical Guardrails

- **No Real User/Organization Data**: Tidak ada data pribadi (PII) atau data organisasi nyata yang digunakan.
- **Defensive-Only Scope**: Platform tidak memiliki modul serangan balik, eksploitasi, atau pemindaian intrusif terhadap sistem eksternal.
