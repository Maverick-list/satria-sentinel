# SATRIA SENTINEL — Phase 3 UX Polish, Command Center Intelligence & Operational Workflow

**Project**: SATRIA SENTINEL (Security Asset & Threat Response Intelligence Assistant)  
**Competition**: Kartika Cyber Hackathon 2026 — Kategori Penangkalan  
**Phase**: Phase 3 (UX Polish, Dashboard Intelligence & End-to-End Operational Workflow)  
**Date**: 2026-11-11

---

## 1. Tujuan Phase 3

Phase 3 menyempurnakan kualitas antarmuka komando (*Security Command Center*), keterbacaan bukti telemetri (*explainability*), dan alur kerja operasional analis dari hulu ke hilir (*end-to-end investigation workflow*) tanpa merombak arsitektur atau memodifikasi formula mesin deteksi dan skor risiko yang telah lulus audit Phase 2.

---

## 2. Penyempurnaan 7 Halaman Operasional

### 2.1. Command Center Dashboard (`frontend/src/app/page.tsx`)
- **Indikator KPI Operasional Nyata**:
  - **Monitored Assets**: Total aset terdaftar dan jumlah **Critical Assets**.
  - **Security Events**: Total log keamanan yang dianalisis disertai pemisahan eksplisit antara `[SYNTHETIC SIM]` (`synthetic_events_count`) dan event standar (`non_synthetic_events_count`).
  - **Active Incidents**: Jumlah insiden aktif disertai status jelas ketika `open_incidents == 0` (*No active incident cases — nominal*).
  - **High-Risk Findings**: Jumlah temuan berisiko tinggi/kritis dan jumlah aturan deteksi deterministik aktif (`6 rules`).
- **Analyst Priority Attention Queue**: Panel prioritas yang mengurutkan insiden terbuka, klaster korelasi multi-tahap, dan temuan berisiko tertinggi agar analis mengetahui isu mana yang harus ditangani terlebih dahulu.
- **Distribusi Risiko & Severitas**: Grafik Recharts untuk distribusi **Composite Risk Level** (`critical`, `high`, `medium`, `low`) dan **Event Severity Classification**.
- **Asset Risk Overview & Recent Activity**: Ringkasan postur risiko per aset (`AST-IAM-001`, `AST-DB-002`, `AST-WEB-003`, `AST-SIEM-004`) serta panel **Recent Threat Detections** dan **Recent Incident Activity**.

### 2.2. Assets Inventory & Risk Context (`frontend/src/app/assets/page.tsx`)
- Filter pencarian berdasarkan nama/tag/IP, tingkat kritikalitas (`critical`, `high`, `medium`, `low`), lingkungan (`production`, `staging`, `dr`), dan status operasional.
- **Asset Risk Context & Telemetry Inspector**: Menampilkan bobot kritikalitas aset dalam perhitungan skor risiko (*Why Asset Criticality Matters: +7 hingga +25 poin*) serta daftar **Associated Security Events** secara *real-time* untuk aset yang dipilih.

### 2.3. Security Events & Explainable Detection (`frontend/src/app/security-events/page.tsx`)
- Tabel antrean event menampilkan penanda `SYNTHETIC SIM`, aset target (`AST-*`), tipe event, IP sumber, skor risiko `0–100`, dan ID aturan deteksi yang cocok.
- Filter berdasarkan severitas, status deteksi (`All Detection States`, `Flagged by Rules Only`, `Unflagged Only`), dan status triase.
- **Detection & Risk Explanation Inspector**: Menampilkan konteks aset terkait, **Supporting Telemetry Evidence** (`source_ip`, `destination_ip`, `source` sensor, `mitre_technique`, dan isi `raw_payload`), alasan kecocokan aturan deteksi (`reason`), serta rincian 5 faktor skor risiko (`0–100`).

### 2.4. Incident Investigation Workflow (`frontend/src/app/incidents/page.tsx`) — *Prioritas Utama*
Workspace investigasi insiden menampilkan secara terpadu:
1. **Ringkasan Insiden & Skor Risiko**: Nomor insiden (`INC-2026-*`), judul, ringkasan eksekutif, severitas, status siklus hidup, waktu deteksi/resolusi, dan rincian faktor skor risiko (`0–100`).
2. **Penugasan Analis (*Assigned Analyst*)**: Menampilkan analis yang bertugas (`@username`) beserta pemilih interaktif (`assignIncidentApi`) untuk menugaskan insiden ke analis SOC.
3. **Aset Terdampak (*Affected Assets*)**: Daftar aset (`AST-*`) yang terkait dengan kejadian dalam insiden tersebut.
4. **Temuan Deteksi & Bukti Korelasi (*Detection Findings & Correlation Evidence*)**: Penjelasan aturan deteksi yang terpicu, teknik MITRE ATT&CK, alasan korelasi multi-event, serta fitur penautan event tambahan (`linkIncidentEventsApi`).
5. **Rekomendasi Response Playbook (*Advisory Playbook Guidance*)**: Menampilkan prosedur respons defensif (`PB-IR-*`) yang relevan langsung di dalam halaman investigasi insiden.
6. **Catatan Investigasi, Resolusi Akar Masalah & Lini Masa Kronologis**: Form penambahan catatan analis, form resolusi insiden (*root-cause summary*), dan lini masa kronologis (`timeline_json`).

### 2.5. Advisory Response Playbooks (`frontend/src/app/playbooks/page.tsx`)
- Menampilkan **Advisory-Only Operational Guardrail** secara eksplisit: seluruh rekomendasi bersifat *human-in-the-loop* dan tidak mengeksekusi perubahan otomatis pada infrastruktur eksternal.
- Menyajikan 4 dimensi operasional untuk setiap playbook (`PB-IR-001` s/d `PB-IR-005`):
  1. **Threat Scenario**
  2. **Operational Purpose**
  3. **Required Authorization & Considerations**
  4. **Expected Defensive Outcome**
- Dilengkapi daftar langkah respons bertahap (*Preparation*, *Detection & Analysis*, *Containment*, *Eradication*, *Recovery*).

### 2.6. Audit Logs & Platform Settings (`frontend/src/app/audit-logs/page.tsx`, `frontend/src/app/settings/page.tsx`)
- **Audit Logs**: Resolusi identitas pelaku (`@username` beserta peran RBAC), tombol filter cepat (*Logins*, *Assets*, *Log Imports*, *Synthetic Sim*, *Incidents Created*, *Incidents Resolved*), dan format *chip* `key: value` yang mudah dibaca.
- **Settings**: Menampilkan profil operator aktif, tabel **RBAC Role Permissions Matrix** (`ADMIN`, `SECURITY_ANALYST`, `VIEWER`), daftar akun terdaftar tanpa membocorkan hash/token/secret, serta katalog lengkap 6 aturan deteksi deterministik.

---

## 3. Skenario Demonstrasi End-to-End 14 Langkah

Protokol demonstrasi kompetisi yang dapat diulang secara deterministik:

1. **Login**: Masuk sebagai `admin` atau `security_analyst` melalui tombol **Switch Role / Login** di *topbar*.
2. **Command Center Dashboard**: Tinjau KPI kesehatan sistem (`7 / 7 Tables Verified`), **Analyst Priority Attention Queue**, dan **Asset Risk Overview**.
3. **Assets Inventory**: Buka `/assets`, pilih `AST-IAM-001` atau `AST-DB-002`, dan periksa panel **Why Asset Criticality Matters** serta event terkait.
4. **Import / Generate Synthetic Security Events**: Buka `/security-events`, pilih skenario simulasi pada **Synthetic Security Log Generator** atau unggah CSV/JSON, lalu klik **Generate** / **Import & Analyze Logs**.
5. **Review Triggered Detections**: Klik salah satu event yang memiliki badge `SATRIA-RULE-*` pada tabel untuk melihat aturan deteksi yang terpicu.
6. **Inspect Detection Explanation**: Tinjau bagian **Supporting Telemetry Evidence** dan alasan deterministik (`Why flagged`) pada panel kanan.
7. **Review Correlated Events & Risk Score**: Periksa bagian **Risk Score Calculation** (`0–100`) dan gulir ke panel **Correlated Event Clusters** (`CORR-*`).
8. **Escalate / Open Incident**: Klik **Escalate Cluster to Incident** atau buka `/incidents` untuk memilih kasus insiden (`INC-2026-*`).
9. **Inspect Incident Evidence & Timeline**: Di `/incidents`, periksa **Affected Assets**, **Detection Findings**, **Correlated Security Events**, dan **Correlation Evidence**.
10. **Assign Analyst & Add Investigation Note**: Pilih analis pada dropdown **Assigned Analyst** lalu klik **Assign**, kemudian tambahkan catatan investigasi pada form **Add Investigation Note**.
11. **Consult Response Playbook**: Tinjau panel **Recommended Playbook (`PB-IR-*`)** langsung di dalam workspace insiden atau buka `/playbooks` untuk membaca rincian otorisasi dan hasil yang diharapkan.
12. **Transition Incident Status & Resolve**: Ubah status insiden ke `CONTAINMENT`, lalu isi ringkasan akar masalah pada **Resolve Incident (Root Cause)** dan klik **Mark Recovered**.
13. **Verify Timeline Update**: Pastikan seluruh perubahan status, penugasan analis, catatan investigasi, dan resolusi tercatat secara kronologis pada **Chronological Investigation Timeline**.
14. **Verify Audit Trail**: Buka `/audit-logs` dan gunakan filter cepat untuk memverifikasi bahwa seluruh tindakan (`auth.login_success`, `events.synthetic_generated`, `incident.assigned`, `incident.note_added`, `incident.resolved`) tercatat lengkap dengan identitas `@username`.
