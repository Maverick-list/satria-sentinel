# SATRIA SENTINEL — Detection Algorithms & Rule Specifications
**Modul Sumber**: [`backend/app/services/detection_engine.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/services/detection_engine.py)  
**Katalog**: `DETECTION_RULES_CATALOG`  
**Karakteristik**: Deterministik, Aturan Terbuka (*Open Rules*), Transparan (*Explainable*)

Dokumen ini mendokumentasikan spesifikasi logika teknis persis dari 6 aturan deteksi ancaman yang diimplementasikan pada SATRIA SENTINEL.

---

## 1. Katalog 6 Aturan Deteksi Deterministik

| Rule ID | Nama Aturan | Versi | Severity | Confidence | Taktik & Teknik MITRE ATT&CK | Kode Playbook |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **`SATRIA-RULE-BF-001`** | Brute-Force Authentication Indicator | 1.2.0 | `high` | 0.88 | Credential Access (TA0006) / T1110 - Brute Force | `PB-IR-002` |
| **`SATRIA-RULE-AUTH-002`**| Suspicious Login Activity | 1.1.0 | `high` | 0.85 | Initial Access (TA0001) / T1078 - Valid Accounts | `PB-IR-001` |
| **`SATRIA-RULE-ACC-003`** | Unusual Access Frequency / Bulk Resource Access | 1.0.0 | `medium` | 0.80 | Collection (TA0009) / T1213 - Data from Repositories | `PB-IR-001` |
| **`SATRIA-RULE-PRIV-004`**| Suspicious Privilege Escalation or Role Change | 1.1.0 | `critical`| 0.92 | Privilege Escalation (TA0004) / T1548 - Abuse Elevation | `PB-IR-004` |
| **`SATRIA-RULE-EXFIL-005`**| Suspicious Outbound Traffic / Exfiltration Indicator | 1.2.0 | `critical`| 0.90 | Exfiltration (TA0010) / T1041 - Exfiltration Over C2 | `PB-IR-003` |
| **`SATRIA-RULE-RECON-006`**| Port Scanning & Service Reconnaissance Indicator | 1.0.0 | `medium` | 0.82 | Discovery (TA0007) / T1046 - Network Discovery | `PB-IR-005` |

---

## 2. Spesifikasi Rinci Setiap Aturan

### 2.1 `SATRIA-RULE-BF-001` — Brute-Force Authentication Indicator
- **Deskripsi**: Mendeteksi kegagalan autentikasi berulang atau percobaan login berkecepatan tinggi dari satu IP sumber.
- **Kondisi Deteksi**:
  ```sql
  event_type IN ('auth_failure', 'brute_force_attempt', 'ssh_failed_login')
  AND (raw_payload.failed_attempts >= 5 OR >= 3 failed login events from same source_ip within 15 minutes)
  ```
- **Rekomendasi Tindakan**: Tinjau log autentikasi, verifikasi rate-limiting/lockout pada auth gateway, dan periksa apakah ada login sukses setelahnya dari IP yang sama (Playbook `PB-IR-002`).

### 2.2 `SATRIA-RULE-AUTH-002` — Suspicious Login Activity
- **Deskripsi**: Mendeteksi login sukses yang anomali, termasuk login pasca-burst brute force, login dari jaringan tidak tepercaya, atau akses administratif di luar jam kerja.
- **Kondisi Deteksi**:
  ```sql
  event_type IN ('suspicious_login', 'auth_success', 'impossible_travel_login')
  AND (event_type == 'suspicious_login' OR raw_payload.post_bruteforce == true OR raw_payload.anomalous_geo == true
  OR raw_payload.off_hours == true OR prior auth_failure from same source_ip within 30 minutes)
  ```
- **Rekomendasi Tindakan**: Konfirmasi legitimasi login dengan pemilik akun, tinjau aktivitas sesi, dan rotasi kredensial/cabut token aktif (Playbook `PB-IR-001`).

### 2.3 `SATRIA-RULE-ACC-003` — Unusual Access Frequency / Bulk Resource Access
- **Deskripsi**: Mendeteksi laju request yang sangat tinggi atau penarikan data massal yang melampaui baseline operasional normal.
- **Kondisi Deteksi**:
  ```sql
  event_type IN ('unusual_access_pattern', 'high_frequency_access', 'api_rate_anomaly')
  OR raw_payload.requests_per_minute >= 120 OR raw_payload.records_accessed >= 500
  ```
- **Rekomendasi Tindakan**: Periksa identitas klien API dan parameter query, verifikasi apakah aktivitas sesuai jadwal batch job yang disetujui, dan terapkan pembatasan laju (*throttling*) atau batasan scope token.

### 2.4 `SATRIA-RULE-PRIV-004` — Suspicious Privilege Escalation or Role Change
- **Deskripsi**: Mendeteksi peningkatan hak akses tidak sah (sudo/root/SYSTEM), eskalasi peran IAM, atau penyalahgunaan biner SUID tanpa tiket perubahan resmi.
- **Kondisi Deteksi**:
  ```sql
  event_type IN ('privilege_escalation', 'sudo_abuse', 'iam_role_escalation', 'suid_execution')
  OR (raw_payload.target_privilege IN ('root', 'admin', 'SYSTEM') AND NOT raw_payload.authorized_change_ticket)
  ```
- **Rekomendasi Tindakan**: Cocokkan event eskalasi dengan tiket perubahan resmi, audit perintah yang dieksekusi dan file sistem yang dimodifikasi, dan pulihkan hak akses yang tidak sah via Playbook `PB-IR-004`.

### 2.5 `SATRIA-RULE-EXFIL-005` — Suspicious Outbound Traffic / Exfiltration Indicator
- **Deskripsi**: Mendeteksi transfer data keluar dalam jumlah besar ($\ge 50\text{ MB}$) atau koneksi keluar ke port non-standar yang mengindikasikan C2 atau eksfiltrasi data.
- **Kondisi Deteksi**:
  ```sql
  event_type IN ('suspicious_outbound_traffic', 'data_exfiltration_indicator', 'c2_beaconing')
  OR raw_payload.bytes_out >= 50000000 OR raw_payload.destination_port IN (4444, 1337, 8443, 9001)
  ```
- **Rekomendasi Tindakan**: Investigasi proses yang memprakarsai koneksi pada aset sumber, periksa reputasi IP tujuan, dan evaluasi aturan egress firewall perimeter sesuai Playbook `PB-IR-003`.

### 2.6 `SATRIA-RULE-RECON-006` — Port Scanning & Service Reconnaissance Indicator
- **Deskripsi**: Mendeteksi probing port berurutan atau aktivitas pemetaan celah layanan jaringan internal/eksternal.
- **Kondisi Deteksi**:
  ```sql
  event_type IN ('port_scan_indicator', 'network_scan', 'service_enumeration')
  OR raw_payload.distinct_ports_probed >= 15
  ```
- **Rekomendasi Tindakan**: Tentukan apakah IP sumber merupakan pemindai kerentanan resmi; jika tidak sah, tinjau segmentasi jaringan dan port layanan yang terekspos sesuai Playbook `PB-IR-005`.
