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
| `SATRIA-RULE-BF-001` | Repeated Authentication Brute-Force Indicator | `2.0.0` | `HIGH` | `0.88` | `TA0006 / T1110` (Credential Access — Brute Force) | `event_type in {'auth_login_failed', 'ssh_auth_failure', 'BruteForceIndicator'}` dengan `failed_attempts >= 5`, **atau** `>= 3` kegagalan autentikasi dari `source_ip` yang sama dalam jendela waktu berdekatan. | Tinjau log autentikasi sumber, verifikasi apakah IP berasal dari jaringan resmi, dan terapkan *rate-limiting* atau pemblokiran sementara sesuai prosedur operasi standar. |
| `SATRIA-RULE-AUTH-002` | Suspicious Login Context or Off-Hours Authentication | `2.0.0` | `MEDIUM` | `0.80` | `TA0001 / T1078` (Initial Access — Valid Accounts) | `event_type == 'suspicious_login'` atau `auth_login_success` yang disertai indikator anomali (`impossible_travel`, `new_asn`, `off_hours_login`, atau `unrecognized_device_fingerprint`). | Verifikasi sesi pengguna dengan pemilik akun melalui kanal komunikasi resmi dan minta *re-authentication* MFA bila tidak terkonfirmasi. |
| `SATRIA-RULE-ACC-003` | Unusual Resource Access Frequency / Enumeration Burst | `2.0.0` | `MEDIUM` | `0.78` | `TA0007 / T1087` (Discovery — Account/Resource Discovery) | `event_type in {'unusual_access_frequency', 'api_rate_anomaly', 'directory_enumeration'}` atau `request_count_1m >= 120` atau `status_403_404_count >= 25`. | Periksa *endpoint* yang diakses secara berulang, evaluasi konfigurasi kuota API/WAF, dan pastikan kontrol otorisasi objek berfungsi. |
| `SATRIA-RULE-PRIV-004` | Unauthorized or Suspicious Privilege Escalation | `2.0.0` | `CRITICAL` | `0.94` | `TA0004 / T1068, T1548` (Privilege Escalation — Abuse Elevation Control Mechanism) | `event_type in {'privilege_escalation', 'iam_role_elevation', 'sudo_policy_bypass'}` atau adanya atribut `target_privilege in {'root', 'admin', 'domain_admin', 'cluster-admin'}` tanpa referensi tiket perubahan (`change_ticket`). | Isolasi sesi yang mengalami eskalasi hak akses, cabut *token* sementara, audit riwayat perubahan IAM/sudo, dan eskalasi ke insiden prioritas tinggi. |
| `SATRIA-RULE-EXFIL-005` | Suspicious Outbound Data Transfer or C2 Beacon Indicator | `2.0.0` | `HIGH` | `0.86` | `TA0010 / T1041` (Exfiltration Over C2 Channel) | `event_type in {'suspicious_outbound_traffic', 'c2_beacon_indicator', 'large_egress_transfer'}` atau `bytes_out >= 50,000,000` (50 MB) menuju destinasi eksternal yang tidak masuk daftar izin (*unapproved destination*). | Investigasi *process* yang menginisiasi koneksi keluar, tinjau *firewall egress policy*, dan amankan *snapshot* log koneksi jaringan untuk forensik. |
| `SATRIA-RULE-RECON-006` | Network Port Scanning & Service Reconnaissance Indicator | `2.0.0` | `MEDIUM` | `0.82` | `TA0043 / T1046` (Reconnaissance / Network Service Discovery) | `event_type in {'port_scan_indicator', 'syn_scan_detected', 'service_enumeration'}` atau `distinct_ports_probed >= 15`. | Tinjau eksposur *port* pada aset target, pastikan hanya layanan yang dibutuhkan yang terbuka di *perimeter/internal firewall*, dan pantau aktivitas lanjutan dari IP sumber. |

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
