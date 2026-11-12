# SATRIA SENTINEL — Detection & Correlation Methodology

## 1. Prinsip Transparansi & Kejujuran Metodologi

SATRIA SENTINEL menggunakan **mesin deteksi berbasis aturan deterministik (*deterministic rule-based detection engine*)** dan **mesin korelasi multi-faktor yang dapat dijelaskan (*explainable event correlation engine*)**.

- **Bukan AI / Machine Learning**: Seluruh aturan deteksi pada Phase 2 menggunakan pencocokan predikat eksplisit (jenis kejadian, atribut *payload*, nilai ambang batas, dan korelasi waktu). Sistem **tidak** mengklaim penggunaan *deep learning*, *anomaly detection* berbasis model statistik terlatih, maupun heuristik kotak hitam (*black-box*).
- **Explainable Findings**: Setiap temuan deteksi (*DetectionFinding*) selalu menyimpan alasan spesifik (`reason`) mengapa sebuah *security event* ditandai oleh aturan tertentu, lengkap dengan *confidence score* aturan dan rekomendasi tindakan defensif.

---

## 2. Katalog Aturan Deteksi (*Detection Rules Catalog*)

Implementasi kode sumber: [`backend/app/services/detection_engine.py`](../backend/app/services/detection_engine.py).

| Rule ID | Rule Name | Version | Severity | Confidence | MITRE ATT&CK Mapping | Kondisi Deteksi (*Detection Condition*) | Rekomendasi Respons Defensif |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SATRIA-RULE-BF-001` | Brute-Force Authentication Indicator | `1.2.0` | `HIGH` | `0.88` | `TA0006 / T1110` (Credential Access — Brute Force) | `event_type IN ('auth_failure', 'brute_force_attempt', 'ssh_failed_login') AND (failed_attempts >= 5 OR >= 3 failed events within 15m)` | Tinjau log autentikasi, verifikasi rate-limiting/lockout pada auth gateway, dan periksa login sukses berikutnya dari IP yang sama (`PB-IR-002`). |
| `SATRIA-RULE-AUTH-002` | Suspicious Login Activity | `1.1.0` | `HIGH` | `0.85` | `TA0001 / T1078` (Initial Access — Valid Accounts) | `event_type IN ('suspicious_login', 'auth_success', 'impossible_travel_login') AND (suspicious_login OR post_bruteforce OR anomalous_geo OR off_hours OR prior failure within 30m)` | Konfirmasi legitimasi login dengan pemilik akun, tinjau aktivitas sesi, dan rotasi kredensial / cabut token aktif (`PB-IR-001`). |
| `SATRIA-RULE-ACC-003` | Unusual Access Frequency / Bulk Resource Access | `1.0.0` | `MEDIUM` | `0.80` | `TA0009 / T1213` (Collection — Data from Information Repositories) | `event_type IN ('unusual_access_pattern', 'high_frequency_access', 'api_rate_anomaly') OR requests_per_minute >= 120 OR records_accessed >= 500` | Periksa identitas klien API dan parameter query, verifikasi kesesuaian jadwal batch job resmi, dan terapkan pembatasan laju (*throttling*) (`PB-IR-001`). |
| `SATRIA-RULE-PRIV-004` | Suspicious Privilege Escalation or Role Change | `1.1.0` | `CRITICAL` | `0.92` | `TA0004 / T1548` (Privilege Escalation — Abuse Elevation Control Mechanism) | `event_type IN ('privilege_escalation', 'sudo_abuse', 'iam_role_escalation', 'suid_execution') OR (target_privilege IN ('root', 'admin', 'SYSTEM') AND NOT authorized_change_ticket)` | Cocokkan event eskalasi dengan tiket perubahan resmi, audit perintah yang dieksekusi dan file sistem, serta cabut hak akses yang tidak sah (`PB-IR-004`). |
| `SATRIA-RULE-EXFIL-005` | Suspicious Outbound Traffic / Exfiltration Indicator | `1.2.0` | `CRITICAL` | `0.90` | `TA0010 / T1041` (Exfiltration — Exfiltration Over C2 Channel) | `event_type IN ('suspicious_outbound_traffic', 'data_exfiltration_indicator', 'c2_beaconing') OR bytes_out >= 50,000,000 OR destination_port IN (4444, 1337, 8443, 9001)` | Investigasi proses yang memprakarsai koneksi keluar, periksa reputasi IP tujuan, dan evaluasi aturan egress firewall perimeter (`PB-IR-003`). |
| `SATRIA-RULE-RECON-006` | Port Scanning & Service Reconnaissance Indicator | `1.0.0` | `MEDIUM` | `0.82` | `TA0007 / T1046` (Discovery — Network Service Discovery) | `event_type IN ('port_scan_indicator', 'network_scan', 'service_enumeration') OR distinct_ports_probed >= 15` | Tentukan apakah IP sumber merupakan pemindai kerentanan resmi; jika tidak sah, tinjau segmentasi jaringan dan port layanan yang terekspos (`PB-IR-005`). |

---

## 3. Metodologi Korelasi Kejadian (*Event Correlation Engine*)

Implementasi kode sumber: [`backend/app/services/correlation_engine.py`](../backend/app/services/correlation_engine.py).

Mesin korelasi mengelompokkan beberapa *security events* dalam jendela waktu terukur (`window_minutes`, default `120` menit) berdasarkan hubungan objektif berikut:

1. **Kesamaan Aset Target (`shared_target_asset`)**: Beberapa kejadian keamanan yang menyasar aset kritikal yang sama dalam rentang waktu berdekatan.
2. **Kesamaan IP Sumber (`shared_source_ip`)**: Aktivitas beruntun yang berasal dari alamat IP penyerang/sumber yang sama.
3. **Kedekatan Waktu (`temporal_proximity`)**: Kejadian berlangsung dalam jendela waktu analisis yang ditentukan (`<= window_minutes`).
4. **Progresi Rantai Serangan / Hubungan Antar-Indikator (`multi_stage_attack_progression`)**: Beberapa aturan deteksi berbeda (`>= 2` aturan MITRE ATT&CK berbeda) aktif dalam satu klaster, misalnya *reconnaissance / brute-force* diikuti oleh *suspicious login*, *privilege escalation*, atau *suspicious outbound traffic*.

### Prinsip Anti-False-Grouping
- **Dilarang menggabungkan kejadian hanya karena memiliki tingkat *severity* yang sama**: Kejadian dengan *severity* yang sama pada aset berbeda dan dari sumber IP berbeda **tidak** akan dikelompokkan bersama.
- Sebuah grup korelasi hanya dibentuk apabila terdapat minimal `>= 2` kejadian yang berbagi `asset_id` atau `source_ip` dalam jendela waktu analisis, serta menghasilkan `correlation_explanation` yang menjelaskan alasan pengelompokan secara eksplisit kepada analis.
