# SATRIA SENTINEL — Project Description
## Security Asset & Threat Response Intelligence Assistant
**Kategori**: Penangkalan (Defensive Cybersecurity)  
**Kompetisi**: Kartika Cyber Hackathon 2026  
**Target Submission Deadline**: 15 November 2026, 23:59 WIB

---

## 1. Identitas & Arti Nama Produk

**SATRIA SENTINEL** (*Security Asset & Threat Response Intelligence Assistant*) adalah platform komando operasi keamanan siber defensif (*Defensive Security Operations Command Platform*) yang dirancang khusus untuk memperkuat kapabilitas **Penangkalan** terhadap serangan siber pada infrastruktur digital penting dan operasional pertahanan.

- **SATRIA** (*Ksatria* / Pejuang Tangguh): Menggambarkan ketangguhan, integritas, dan kesiapsiagaan operator pertahanan siber dalam menjaga kedaulatan domain digital secara proaktif.
- **SENTINEL** (*Penjaga Garis Depan*): Melambangkan fungsi pos penjagaan defensif yang senantiasa memantau aset berharga, mendeteksi sinyal intrusi sejak tahap pengintaian awal (*reconnaissance*), dan memandu mitigasi sebelum ancaman berkembang menjadi insiden fatal.

---

## 2. Latar Belakang Masalah (*Problem Statement*)

Dalam operasi pertahanan siber modern, tim *Security Operations Center* (SOC) dan analis keamanan menghadapi sejumlah tantangan kritis:
1. **Ledakan Telemetri & Kelelahan Peringatan (*Alert Fatigue*)**: Ribuan log mentah dari berbagai sensor perimeter, firewall, host, dan gateway autentikasi masuk setiap jam tanpa struktur korelasi yang jelas, memicu alarm palsu (*false positives*).
2. **Ketiadaan Hubungan Aset & Konteks Kritikalitas**: Sebagian besar alat pemantau memperlakukan semua log secara seragam, mengabaikan bahwa serangan terhadap *Tier-0 Crown-Jewel Asset* (misalnya direktori identitas atau server vault) membawa dampak jauh lebih katastropik dibandingkan insiden pada lingkungan *staging*.
3. **Peringatan *Black-Box* Tanpa Penjelasan Deterministik**: Penggunaan algoritma AI/ML yang tidak transparan kerap membingungkan analis karena tidak menyajikan bukti telemetri atau alasan kausal (*why it was flagged*), sehingga memperlambat pengambilan keputusan defensif.
4. **Alur Kerja Triase & Tanggap Insiden yang Terfragmentasi**: Seringkali investigasi bukti kejadian, penetapan analis, konsultasi panduan respon (*playbook*), dan pencatatan jejak audit tersebar di berbagai sistem terpisah tanpa lini masa kronologis yang terpadu.

---

## 3. Solusi yang Diajukan (*Proposed Solution*)

**SATRIA SENTINEL** hadir sebagai asisten intelijen defensif terintegrasi yang menjembatani pemantauan inventaris aset, pencernaan log yang aman, deteksi ancaman berbasis aturan deterministik transparan, korelasi multi-faktor, kalkulasi skor prioritas risiko terjelaskan (*explainable risk scoring* `0–100`), serta alur kerja investigasi insiden dan panduan *response playbook* dalam satu konsol komando terpusat.

Platform ini fokus pada pilar **Penangkalan**, yaitu menghentikan, melokalisir, dan memitigasi manuver musuh pada tahap awal rantai serangan (*Cyber Kill Chain* dan taktik **MITRE ATT&CK** seperti *Reconnaissance*, *Initial Access*, *Credential Access*, *Privilege Escalation*, dan *Exfiltration*).

---

## 4. Pengguna Sasaran (*Target Users*)

1. **Security Analyst (SOC L1/L2)**: Menginvestigasi temuan deteksi harian, meninjau bukti telemetri pendukung, menautkan kejadian terkait, mendokumentasikan catatan triase, dan mengeksekusi rekomendasi SOP respon.
2. **SOC Lead / Incident Commander**: Memantau antrean prioritas perhatian analis (*Analyst Priority Attention Queue*), menugaskan personel penanggung jawab kasus, memverifikasi langkah pengurungan (*containment*), dan mengesahkan resolusi insiden.
3. **Platform Administrator & CISO**: Mengelola inventaris aset digital dan klasifikasi kritikalitasnya, memantau matriks perizinan RBAC, memastikan kepatuhan standar keamanan (*security baseline*), dan meninjau jejak audit operasional.
4. **Auditor Kepatuhan & Tamu (Viewer)**: Memiliki akses baca-saja (*read-only*) untuk mengaudit riwayat kejadian, memeriksa transparansi skor risiko, dan memvalidasi keabsahan jejak log audit tanpa risiko mengubah konfigurasi sistem.

---

## 5. Fitur Utama Platform

1. **Command Center Dashboard Intelligence**:
   - Indikator KPI terpadu: Total aset, aset berkategori *critical*, total kejadian keamanan (membedakan secara eksplisit log simulasi sintetis vs. log operasional), status kasus insiden aktif, dan temuan berisiko tinggi.
   - **Analyst Priority Attention Queue**: Membantu analis menentukan isu darurat mana yang membutuhkan perhatian segera.
   - Grafik distribusi tingkat risiko gabungan (*Composite Risk Level*) dan klasifikasi severitas event.
   - **Asset Risk Overview**: Postur risiko dan kejadian terkait per aset penting.
2. **Manajemen Inventaris Aset & Konteks Risiko**:
   - Pencatatan aset digital lengkap dengan tipe, lingkungan (*production*, *staging*, *dr*), alamat IP/hostname, dan klasifikasi kritikalitas (*low*, *medium*, *high*, *critical*).
   - Penjelasan transparan kontribusi bobot kritikalitas aset terhadap kalkulasi risiko (*Why Asset Criticality Matters: +7 hingga +25 poin*).
3. **Log Ingestion Engine & Synthetic Telemetry Generator**:
   - Impor log format CSV dan JSON dengan validasi skema ketat (*Pydantic*), deteksi duplikat SHA-256 (*event_fingerprint*), batas ukuran payload aman, sanitasi karakter berbahaya, dan nihil eksekusi kode.
   - Generator 6 skenario pelatihan defensif bersandi jelas `[SYNTHETIC SIMULATION]` (*Brute-force*, *Suspicious login*, *Vault enumeration*, *Port scanning*, *Privilege escalation*, dan *Outbound traffic*).
4. **Deterministic Threat Detection Engine (MITRE ATT&CK Mapped)**:
   - 6 aturan deteksi deterministik (`SATRIA-RULE-BF-001` hingga `SATRIA-RULE-RECON-006`) dengan ambang batas transparan dan alasan deteksi (*reason*) yang dapat dibaca manusia tanpa klaim AI palsu.
5. **Multi-Factor Event Correlation Engine**:
   - Pengelompokan kejadian berdasarkan kesamaan aset target, IP sumber penyerang, jendela waktu operasional (<= 60 menit), dan progresi rantai ancaman (*severity alone is never used as grouping criterion*).
6. **Explainable Risk Scoring Engine (`0–100`)**:
   - Formula prioritas berbasis 5 faktor berbobot transparan: Severitas kejadian (maks 35 poin), Kritikalitas aset (maks 25 poin), Keyakinan aturan deteksi (maks 20 poin), Volume korelasi (maks 10 poin), dan Konteks temporal/operasional (maks 10 poin).
7. **Incident Investigation Workspace & Defensive Response Playbooks**:
   - Ruang kerja investigasi menyeluruh: penugasan analis, penautan bukti kejadian, daftar aset terdampak, panduan playbook terintegrasi (`PB-IR-001` s/d `PB-IR-005`), form catatan investigasi, form resolusi akar masalah, dan lini masa kronologis (*timeline*).
   - Pagar pengaman operasional **Advisory-Only (Human-in-the-Loop)** yang mewajibkan otorisasi manusia sebelum tindakan mitigasi diterapkan pada infrastruktur nyata.
8. **Jejak Audit Terpantau (*Audit Trail*) & Keamanan RBAC**:
   - Pencatatan seluruh aksi login, modifikasi aset, impor data, dan siklus hidup insiden dengan atribusi `@username` dan peran RBAC. Sanitasi otomatis untuk mencegah kebocoran token/kredensial ke dalam log audit.

---

## 6. Inovasi Teknis & Keunggulan Komparatif

1. **Penjelasan Transparan Tanpa Halusinasi (*Explainable by Design*)**:
   Setiap temuan menyajikan alasan spesifik mengapa log tersebut ditandai, parameter apa yang terlewati, dan rincian penjumlahan poin risiko `0–100`.
2. **Korelasi Kontekstual Berbasis Multi-Faktor**:
   Mencegah pengelompokan sembarangan hanya karena level *severity* yang sama; korelasi mensyaratkan konvergensi aset, IP sumber, jendela waktu, dan keterkaitan indikator serangan.
3. **Pemisahan Tegas Data Sintetis vs. Operasional**:
   Seluruh data simulasi diberi penanda eksplisit `is_synthetic=true` dan label antarmuka `SYNTHETIC SIM`, mencegah kesalahan interpretasi data pengujian sebagai serangan dunia nyata.
4. **Pagar Pengaman Respon Defensif (*Safety Guardrail*)**:
   Menghindari bahaya *unintended service outage* akibat pemblokiran otomatis; playbook menyajikan rekomendasi terstruktur, prasyarat otorisasi personel, dan kriteria verifikasi hasil.

---

## 7. Arsitektur Teknis Sistem

```
+-------------------------------------------------------------------+
|               SATRIA SENTINEL DEFENSIVE PLATFORM                  |
+-------------------------------------------------------------------+
| 1. PRESENTATION LAYER (Next.js 15, TypeScript, Tailwind, Recharts)|
|    - Security Command Center Dashboard                            |
|    - Asset Inventory & Risk Context Inspector                     |
|    - Security Events Queue & Telemetry Inspector                  |
|    - Incident Investigation Workspace & Chronological Timeline    |
|    - Advisory Playbooks Catalog & Interactive Matcher             |
|    - Audit Logs (Append-Only) & Platform Settings (RBAC Matrix)   |
+---------------------------------+---------------------------------+
                                  | REST API (/api/v1) + JWT HS256
+---------------------------------v---------------------------------+
| 2. BACKEND ENGINE LAYER (FastAPI, Python 3.12+, Pydantic v2)      |
|    - Security & Auth Engine: scrypt (RFC 7914) & RBAC Dependencies|
|    - Log Ingestion Engine: CSV/JSON Sanitizer & SHA-256 Dedupe    |
|    - Threat Detection Engine: 6 MITRE ATT&CK Deterministic Rules  |
|    - Correlation Engine: Graph-like Multi-Factor Progression      |
|    - Risk Scoring Engine: 5-Factor Weighted Score (0-100)         |
|    - Incident Service & Advisory Response Playbook Dispatcher     |
|    - Audit Service: Structured, Sanitized Event Logging           |
+---------------------------------+---------------------------------+
                                  | SQLAlchemy 2.0 ORM / Alembic
+---------------------------------v---------------------------------+
| 3. PERSISTENCE LAYER (PostgreSQL 16 Engine)                       |
|    - users, assets, security_events, incidents, incident_events,  |
|      response_playbooks, audit_logs                               |
+-------------------------------------------------------------------+
```

---

## 8. Batasan Sistem Saat Ini & Rencana Pengembangan Masa Depan

### Batasan Sistem Saat Ini (*Current Limitations*)
1. **Pencabutan Token Bersifat Process-Local**: Mekanisme pembatalan JWT (*revocation registry*) saat logout disimpan pada memori proses backend (`set[str]`), sehingga dalam arsitektur multi-worker membutuhkan integrasi shared cache (misal Redis) untuk sinkronisasi lintas proses.
2. **Jejak Audit Append-Only Tingkat Aplikasi**: Keutuhan jejak audit dijamin pada tingkat aplikasi/API (ketiadaan rute API `UPDATE` atau `DELETE`); modifikasi langsung pada tingkat database PostgreSQL tidak dicegah secara teknis. Pada sistem produksi, hal ini memerlukan penguncian media WORM atau trigger database.
3. **Penyajian Rekomendasi Bersifat Penasihat (*Advisory*)**: SATRIA SENTINEL sengaja tidak mengeksekusi script isolasi host otomatis demi keamanan operasional pada prototype kompetisi ini.

### Rencana Pengembangan Masa Depan (*Roadmap*)
- Integrasi konektor Syslog/CEF/OpenTelemetry langsung dari agen Linux/Windows secara *real-time*.
- Penyediaan distributed token blacklist menggunakan Redis Cluster.
- Integrasi SOAR terikat otorisasi *two-man rule* untuk orkestrasi pemblokiran perimeter otomatis.
- Pengembangan modul simulasi skenario ancaman siber berbasis C2 framework sintetis terisolasi.
