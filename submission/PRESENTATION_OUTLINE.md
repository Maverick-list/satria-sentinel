# SATRIA SENTINEL — Slide-by-Slide Presentation Outline (10 Slides)
**Kompetisi**: Kartika Cyber Hackathon 2026  
**Kategori**: Penangkalan (Defensive Cybersecurity)  
**Produk**: SATRIA SENTINEL (Security Asset & Threat Response Intelligence Assistant)

---

### Slide 1: Judul & Identitas Proyek
- **Judul Utama**: SATRIA SENTINEL
- **Sub-judul**: Security Asset & Threat Response Intelligence Assistant
- **Kategori**: Penangkalan (Defensive Cybersecurity Platform)
- **Kompetisi**: Kartika Cyber Hackathon 2026
- **Tagline**: *"Ksatria Penjaga Kedaulatan Digital: Mengubah Telemetri Mentah Menjadi Intelijen Penangkalan Terjelaskan"*
- **Elemen Visual**: Logo SATRIA SENTINEL dengan lambang perisai elang bertema Dark Navy (`#020617`) dan Emerald Green (`#10B981`), nama tim dan institusi/afiliasi.

---

### Slide 2: Latar Belakang & Masalah (*Background & Problem*)
- **Poin Masalah Utama**:
  1. **Alert Fatigue & Data Overload**: Ribuan peringatan mentah setiap hari tanpa struktur prioritas yang jelas, memicu kejenuhan analis SOC.
  2. **Ketiadaan Konteks Aset Kritis**: Serangan pada server penting (*Tier-0 Identity & Vault*) seringkali diperlakukan sama dengan anomali pada lingkungan non-kritis.
  3. **Peringatan "Black-Box"**: Banyak modul AI/ML yang menghasilkan alarm tanpa transparansi bukti telemetri atau alasan kausal (*why it was flagged*).
  4. **Fragmentasi Operasi Insiden**: Ketiadaan alur kerja terpadu antara ingesti log, deteksi, korelasi, penugasan personel, panduan SOP respon, dan jejak audit.
- **Kutipan Kunci**: *"Kecepatan penangkalan siber sangat bergantung pada transparansi bukti dan ketepatan prioritas risiko."*

---

### Slide 3: Solusi yang Diajukan (*Proposed Solution*)
- **Deskripsi Solusi**: Platform komando keamanan terpadu yang menggabungkan manajemen inventaris aset, pencernaan log yang aman, deteksi berbasis aturan deterministik, korelasi multi-faktor, kalkulasi risiko terjelaskan (`0–100`), dan alur kerja investigasi terpadu.
- **Pilar Penangkalan**:
  - **Early Reconnaissance Interception**: Menangkal pemindaian port dan *banner grabbing*.
  - **Credential Defense**: Menghadang gelombang *brute-force* dan anomali login pasca-serangan.
  - **Lateral Movement & Privilege Defense**: Mengisolasi eskalasi root dan akses vault tidak sah.
  - **Exfiltration Mitigation**: Menahan kebocoran aliran data outbound mencurigakan.

---

### Slide 4: Arsitektur Teknis Sistem (*System Architecture*)
- **Diagram Tiga Lapisan**:
  - **Presentation Layer**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
  - **Application / Engine Layer**: Python 3.12+ / FastAPI, Pydantic v2, SQLAlchemy 2.0, deteksi deterministik, korelasi multi-faktor, kalkulasi risiko 5-faktor.
  - **Data Persistence Layer**: PostgreSQL 16 dengan 7 model entitas terkelola via migrasi Alembic.
- **Keamanan & Standar (*Security Baseline*)**:
  - Autentikasi JWT HS256 + Memory-hard password hashing `scrypt` (RFC 7914).
  - Tiga peran RBAC ketat: `Admin`, `Security Analyst`, dan `Viewer`.
  - Header keamanan: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
  - Kontainerisasi standar via Docker & Docker Compose.

---

### Slide 5: Mesin Deteksi Deterministik (*Detection Engine*)
- **Prinsip**: *Explainable by Design* — Tanpa *black-box* AI, setiap temuan memiliki alasan deterministik yang jelas dan terpetakan ke **MITRE ATT&CK**.
- **Katalog 6 Aturan Deteksi Aktif**:
  1. `SATRIA-RULE-BF-001` (T1110.001): Multiple Failed Logins / Brute-Force (>= 5 percobaan gagal).
  2. `SATRIA-RULE-AUTH-002` (T1078): Suspicious Post-Brute-Force Login (Login berhasil setelah kegagalan beruntun).
  3. `SATRIA-RULE-ACCESS-003` (T1005): Unusual High-Volume Data/Key Enumeration (Query burst pada vault).
  4. `SATRIA-RULE-RECON-004` (T1046): TCP SYN Port Scanning & Reconnaissance (>= 15 port unik).
  5. `SATRIA-RULE-PRIV-005` (T1548.003): Unauthorized Sudoers Modification / Privilege Escalation.
  6. `SATRIA-RULE-EXFIL-006` (T1048): Anomalous High-Volume Outbound Egress (>= 50 MB data keluar).

---

### Slide 6: Korelasi Multi-Faktor & Skor Risiko Terjelaskan
- **Aturan Korelasi Multi-Faktor**:
  - Konvergensi: Target Aset Bersama + IP Sumber Bersama + Jendela Waktu (<= 60 menit) + Progresi Rantai Indikator (*Attack Progression*).
  - *Golden Rule*: Severitas saja **tidak pernah** dijadikan kriteria pengelompokan korelasi.
- **Formula Skor Risiko Terjelaskan (0–100 Poin)**:
  $$\text{Composite Risk} = \text{Severity (35)} + \text{Criticality (25)} + \text{Confidence (20)} + \text{Correlation (10)} + \text{Context (10)}$$
- **Transparansi**: Setiap insiden dan event menyajikan rincian poin per faktor sehingga analis memahami alasan di balik level prioritas yang dihasilkan.

---

### Slide 7: Alur Kerja Investigasi Insiden (*Incident Investigation Workflow*)
- **Alur Kerja Terpadu 6 Tahap**:
  1. **Triage & Eskalasi**: Eskalasi satu klik dari klaster korelasi ke tiket insiden baru.
  2. **Penugasan Analis (*Analyst Assignment*)**: Penugasan instan ke personel SOC yang bertugas.
  3. **Bukti & Aset Terdampak**: Otomatis merangkum seluruh aset terkait dan temuan deteksi.
  4. **Panduan Playbook Respons**: Menampilkan SOP respons defensif terkait langsung di workspace.
  5. **Lini Masa Kronologis (*Audit Timeline*)**: Dokumentasi catatan investigasi dan transisi status (`open` -> `investigating` -> `containment` -> `eradication` -> `recovered` -> `closed`).
  6. **Resolusi Akar Masalah (*Root Cause Resolution*)**: Penutupan tiket wajib menyertakan ringkasan investigasi akar masalah.

---

### Slide 8: Hasil Demonstrasi & Pengujian (*Demonstration Results*)
- **Verifikasi Kualitas Kode & Otomasi Pengujian**:
  - **Backend Pytest Suite**: 9 dari 9 pengujian lulus (100% pass) dalam 1.23 detik.
  - **Frontend Typecheck**: TypeScript `tsc --noEmit` lolos dengan 0 error.
  - **Frontend Production Build**: 10 dari 10 rute Next.js 15 berhasil di-build dan dioptimasi.
  - **Playwright E2E Suite**: 4 spesifikasi pengujian end-to-end lulus dalam 7.3 detik, mencakup skenario 18 langkah penuh tanpa error konsol/halaman.
- **Keterujian Data**:
  - Memverifikasi skenario simulasi pelatihan defensif berlabel eksplisit `[SYNTHETIC SIMULATION]`.
  - Memvalidasi pembatasan ukuran berkas, sanitasi input, dan penolakan payload berbahaya.

---

### Slide 9: Inovasi & Manfaat Defensif (*Innovation & Defensive Benefits*)
- **Inovasi Utama**:
  1. **Explainable Telemetry & Risk Scoring**: Meniadakan keraguan analis dengan rincian bukti kausal.
  2. **Priority Attention Queue**: Memangkas waktu tanggap (*Mean Time to Respond / MTTR*) dengan menonjolkan insiden paling kritis di pucuk antrean.
  3. **Advisory Safety Guardrail**: Menjaga keselamatan ketersediaan layanan dengan mewajibkan verifikasi manusia sebelum tindakan mitigasi invasif diambil.
  4. **Pemisahan Tegas Simulasi vs Operasional**: Menjaga kredibilitas data dan memudahkan pelatihan tim SOC secara berulang.
- **Manfaat bagi Ketahanan Pertahanan Siber**:
  - Meningkatkan kesiapsiagaan operasional unit pertahanan siber dalam menghadapi serangan multi-tahap terkoordinasi.

---

### Slide 10: Batasan, Rencana Masa Depan & Kesimpulan
- **Batasan Sistem Saat Ini (*Transparent Limitations*)**:
  - *Process-local token revocation* (membutuhkan Redis untuk klaster multi-worker).
  - *Append-only audit trail* ditegakkan pada lapisan aplikasi.
  - *Advisory-only execution* (mitigasi otomatis perimeter belum disambungkan ke firewall nyata).
- **Rencana Pengembangan Masa Depan (*Roadmap*)**:
  - Konektor sensor Syslog/eBPF Linux terdistribusi.
  - SOAR terintegrasi dengan persetujuan *two-man rule*.
- **Kesimpulan**:
  - **SATRIA SENTINEL** adalah prototype yang berfungsi penuh (*fully functional and demonstrable*), teruji, aman, dan siap dievaluasi pada Kartika Cyber Hackathon 2026.
