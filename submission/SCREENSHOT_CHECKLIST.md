# SATRIA SENTINEL — Recommended Screenshot Checklist (Max 5 Screenshots)
**Kompetisi**: Kartika Cyber Hackathon 2026  
**Kategori**: Penangkalan (Defensive Cybersecurity)

Petunjuk: Seluruh tangkapan layar (*screenshots*) harus diambil langsung dari aplikasi yang sedang berjalan pada peramban web (*actual running application*). Jangan menggunakan mock-up grafis fiktif atau rekayasa visual yang tidak mencerminkan antarmuka asli.

---

### Screenshot 1: Security Command Center Dashboard
- **File Name**: `screenshot-01-command-center-dashboard.png`
- **URL**: `http://localhost:3000/`
- **Tujuan**: Menampilkan pos komando pertahanan siber terpadu, status kesehatan database/migrasi, metrik kunci, dan antrean prioritas analis.
- **Elemen Wajib Terlihat**:
  1. Banner status atas: `SATRIA-SOC // PHASE-2-SECURITY-ENGINE` dan lencana pengguna aktif `@admin` (atau `@analyst`).
  2. Kartu **System Health Telemetry**: Indikator *Operational (Healthy)*, *Database Connected*, dan *7 / 7 Tables Verified*.
  3. Empat kartu KPI utama:
     - *Monitored Assets* (menampilkan total aset dan jumlah *Critical Assets*).
     - *Security Events* (menampilkan pemisahan eksplisit *SYNTHETIC SIM* vs. non-sintetis).
     - *Active Incidents* (menampilkan status insiden terbuka).
     - *High-Risk Findings* (menampilkan jumlah temuan berisiko tinggi dan 6 aturan deteksi aktif).
  4. Panel **Analyst Priority Attention Queue** (`data-testid="analyst-priority-section"`).
  5. Grafik Recharts: **By Composite Risk Level** dan **By Event Severity Classification**.
  6. Tabel **Asset Risk Overview** (`data-testid="asset-risk-overview"`).
- **Resolusi Rekomendasi**: Minimal 1920 × 1080 px (Landscape), aspek rasio 16:9.

---

### Screenshot 2: Asset Inventory & Threat Posture
- **File Name**: `screenshot-02-asset-inventory-threat-posture.png`
- **URL**: `http://localhost:3000/assets`
- **Tujuan**: Menunjukkan manajemen inventaris aset strategis digital, filter lingkungan, dan transparansi bobot risiko aset.
- **Elemen Wajib Terlihat**:
  1. Header halaman: *Assets Inventory* dengan deskripsi cakupan Tier-0/Tier-1.
  2. Bilah filter: Pencarian teks, filter *Criticality* (`critical`, `high`, dll.), filter *Environment* (`production`, `staging`, `dr`), dan filter *Status*.
  3. Tabel inventaris aset dengan baris terpilih (misalnya `AST-IAM-001` - Central Identity & SSO Gateway).
  4. Panel kanan **Asset Detail & Threat Posture** (`data-testid="asset-detail-inspector"`):
     - Lencana *CRITICAL TIER*,
     - Kotak edukasi **Why It Matters (+25/25 Risk Weight)** yang menjelaskan dampak kompromi pada gateway identitas,
     - Metadata teknis (Hostname, Alamat IP, OS Ubuntu, Tipe Server),
     - Daftar **Associated Events** dengan skor risiko puncak (*Peak Risk: 88/100*).
- **Resolusi Rekomendasi**: Minimal 1920 × 1080 px (Landscape).

---

### Screenshot 3: Detection Explanation & Supporting Evidence
- **File Name**: `screenshot-03-detection-explanation-evidence.png`
- **URL**: `http://localhost:3000/security-events`
- **Tujuan**: Menampilkan transparansi mesin deteksi deterministik, pemetaan MITRE ATT&CK, alasan spesifik deteksi terpicu, dan bukti telemetri pendukung tanpa halusinasi AI.
- **Elemen Wajib Terlihat**:
  1. Tabel **Security Events Queue** yang menampilkan penanda `SYNTHETIC SIM`, tag aset target (`AST-IAM-001`), tipe event, IP asal, skor risiko `0–100`, dan aturan yang cocok (`SATRIA-RULE-BF-001`).
  2. Panel kanan **Detection & Risk Explanation** (`data-testid="event-explanation-panel"`):
     - Kotak **Related Asset Context** yang terhubung ke aset terkait,
     - Kotak **Supporting Telemetry Evidence** (Source IP, Dest IP, Sensor, MITRE Technique, dan isi `raw_payload`),
     - Rincian **Matched Detection Rules** dengan persentase keyakinan (*Conf: 95%*), judul aturan, alasan deterministik (*Why flagged*), dan tindakan awal,
     - Rincian **Risk Score Calculation** yang memperlihatkan penjumlahan poin dari 5 faktor berbobot.
- **Resolusi Rekomendasi**: Minimal 1920 × 1080 px (Landscape).

---

### Screenshot 4: Incident Investigation & Chronological Timeline
- **File Name**: `screenshot-04-incident-investigation-timeline.png`
- **URL**: `http://localhost:3000/incidents`
- **Tujuan**: Memperlihatkan alur kerja investigasi insiden yang matang: penugasan analis, penautan bukti kejadian, status siklus hidup, dan lini masa investigasi yang terintegrasi.
- **Elemen Wajib Terlihat**:
  1. Kolom kiri **Incident Cases** dengan salah satu kasus terpilih (`INC-2026-*`).
  2. Panel workspace utama **Incident Investigation & Timeline** (`data-testid="incident-workspace-panel"`):
     - Judul kasus, nomor insiden, tingkat severitas, dan skor risiko (misal *Risk 98/100 (CRITICAL)*),
     - Waktu deteksi dan konteks korelasi (*Correlation Evidence*),
     - Kontrol **Assigned Analyst** yang menunjukkan analis yang bertugas (`@analyst` / `@admin`),
     - Tombol transisi siklus hidup insiden (`OPEN`, `INVESTIGATING`, `CONTAINMENT`, dll.),
     - Kartu **Affected Assets** dan kartu **Detection Findings**,
     - Panel **Recommended Playbook (`PB-IR-*`)** yang tersemat langsung di workspace,
     - Bagian **Chronological Investigation Timeline** dengan entri bertahap (`incident_created`, `analyst_assigned`, `events_linked`, `status_changed`, `investigation_note`, `incident_resolved`).
- **Resolusi Rekomendasi**: Minimal 1920 × 1080 px (Landscape).

---

### Screenshot 5: Risk Assessment, Response Playbook & Audit Trail
- **File Name**: `screenshot-05-playbook-and-audit-trail.png`
- **URL**: `http://localhost:3000/playbooks` (atau split view bersama `/audit-logs`)
- **Tujuan**: Menampilkan katalog SOP respon defensif dengan pagar pengaman operasional *Advisory-Only* serta jejak audit terakuntabilitas dengan atribusi operator.
- **Elemen Wajib Terlihat**:
  1. Pada halaman Response Playbooks:
     - Banner keselamatan operasional: **Advisory-Only Operational Guardrail (Human-in-the-Loop)**,
     - 4 kartu dimensi SOP: *1. Threat Scenario*, *2. Operational Purpose*, *3. Required Authorization & Considerations*, dan *4. Expected Defensive Outcome*,
     - Langkah-langkah defensif bertahap (*Checklist*) dengan kriteria verifikasi.
  2. Pada halaman Audit Logs:
     - Tabel **Recorded Audit Trail Entries** (`data-testid="audit-logs-table"`),
     - Kolom **Timestamp**, kolom **Actor** yang merinci `@analyst (security_analyst)` atau `@admin (admin)`,
     - Kolom **Action** bertanda (`auth.login_success`, `incident.created`, `incident.status_changed`, dll.),
     - Rincian detail terstruktur dalam format chip (`key: value`).
- **Resolusi Rekomendasi**: Minimal 1920 × 1080 px (Landscape).
