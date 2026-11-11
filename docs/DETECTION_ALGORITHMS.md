# SATRIA SENTINEL — Detection Algorithms & Rule Specifications
**Modul**: `backend/app/services/detection_service.py`  
**Metodologi**: Deterministik, Aturan Berbasis SOP Militer, Transparan (*Explainable*)

Dokumen ini menjelaskan spesifikasi logika teknis dari 6 aturan deteksi ancaman yang diimplementasikan pada SATRIA SENTINEL.

---

## 1. Ikhtisar 6 Aturan Deteksi Deterministik

| Rule ID | Nama Aturan | Kategori TTP | Ambang Batas (Threshold) | Tingkat Severity | Tingkat Confidence |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `SATRIA-RULE-BF-001` | Brute Force Authentication Detection | Credential Access (T1110) | $\ge 5$ percobaan login gagal dalam jendela $\le 10$ menit | `high` | 0.90 |
| `SATRIA-RULE-ANOM-002` | Off-Hours Anomaly Access Detection | Initial Access (T1078) | Upaya login pada rentang waktu non-operasional (23:00 - 05:00 UTC/WIB) | `medium` | 0.75 |
| `SATRIA-RULE-PRIV-003` | Unauthorized Privilege Escalation Indicator | Privilege Escalation (T1548) | Eksekusi utilitas `sudo`, `setuid`, modifikasi `/etc/sudoers` | `high` | 0.85 |
| `SATRIA-RULE-EXFIL-004` | Anomalous Outbound Data Transfer | Exfiltration (T1048) | Egress payload $> 50\text{ MB}$ atau transfer via non-standard port | `high` | 0.80 |
| `SATRIA-RULE-RECON-005` | Network Port Scanning Pattern | Reconnaissance (T1046) | Koneksi SYN/Connect ke $\ge 10$ port unik dari satu IP sumber | `medium` | 0.85 |
| `SATRIA-RULE-MALW-006` | Malicious Command Execution Indicator | Execution (T1059) | Eksekusi string berbahaya (`curl \| sh`, reverse shell, beaconing payload) | `critical` | 0.95 |

---

## 2. Spesifikasi Rinci Setiap Aturan

### 2.1 `SATRIA-RULE-BF-001` — Brute Force Authentication
- **Tujuan**: Mendeteksi serangan brute force atau credential stuffing yang menargetkan endpoint identitas dan server operasional.
- **Input**: Daftar kejadian dengan `event_type == 'login_failed'`.
- **Logika Pemrosesan**:
  ```python
  def check_brute_force(events: list[SecurityEvent]) -> list[DetectionFinding]:
      # Kelompokkan event gagal login berdasarkan (source_ip, target_username)
      # Urutkan berdasarkan timestamp
      # Gunakan sliding window 10 menit (600 detik)
      # Jika count >= 5 dalam window:
      #   Bangkitkan temuan Brute Force dengan bukti riwayat kegagalan
  ```
- **Kondisi False-Positive**: Pengguna lupa kata sandi yang mencoba berulang kali dalam interval normal (dimitigasi dengan mewajibkan ambang batas $\ge 5$ dalam waktu singkat $\le 10$ menit).

### 2.2 `SATRIA-RULE-ANOM-002` — Off-Hours Anomaly Access
- **Tujuan**: Mengidentifikasi akses ke aset kritis di luar jam kerja operasional standar militer/pemerintahan.
- **Input**: Waktu stempel event (`timestamp`) dan tingkat kritikalitas aset (`asset.criticality`).
- **Logika Pemrosesan**:
  ```python
  def check_off_hours(event: SecurityEvent, asset: Asset) -> bool:
      hour = event.timestamp.hour
      is_off_hours = (hour >= 23 or hour < 5)
      # Hanya dievaluasi jika aset berstatus High atau Critical
      return is_off_hours and (asset.criticality in {"high", "critical"})
  ```
- **Kondisi False-Positive**: Jadwal pemeliharaan resmi malam hari (dimitigasi dengan memeriksa catatan pemeliharaan terencana).

### 2.3 `SATRIA-RULE-PRIV-003` — Unauthorized Privilege Escalation
- **Tujuan**: Mendeteksi upaya peningkatan hak akses ilegal oleh pengguna tak berwenang ke level administrator atau root.
- **Input**: Payload log audit sistem (`raw_payload`, command executed, `username`).
- **Pola Deteksi**: Regex pencocokan kata kunci:
  `r"(sudo\s+su|chmod\s+\+s|/etc/sudoers|pkexec|gpasswd\s+-a.*sudo)"`
- **Kondisi False-Positive**: Aktivitas resmi administrator sistem (dapat dibedakan berdasarkan akun pengguna terdaftar sebagai `admin`).

### 2.4 `SATRIA-RULE-EXFIL-004` — Anomalous Outbound Data Transfer
- **Tujuan**: Mendeteksi indikasi eksfiltrasi data intelijen keluar dari batas jaringan perimeter (*perimeter boundary*).
- **Input**: Log firewall/flow telemetri: `bytes_sent`, `destination_ip`, `destination_port`.
- **Kondisi Deteksi**:
  - `bytes_sent > 52428800` (lebih dari 50 MB dalam satu sesi tunggal), ATAU
  - Koneksi keluar ke port tidak standar (di luar 80, 443, 53, 22) dengan volume di atas 10 MB.

### 2.5 `SATRIA-RULE-RECON-005` — Network Port Scanning Pattern
- **Tujuan**: Mendeteksi fase pengintaian (*reconnaissance*) pemetaan celah jaringan oleh penyerang.
- **Input**: Log koneksi firewall TCP/UDP dengan status `REJECT` atau `DROP`.
- **Logika Pemrosesan**: Menghitung jumlah port target unik (`destination_port`) yang diakses dari alamat IP sumber (`source_ip`) yang sama dalam jendela waktu $\le 5$ menit. Jika port unik $\ge 10$, picu alarm Port Scanning.

### 2.6 `SATRIA-RULE-MALW-006` — Malicious Command Execution
- **Tujuan**: Mendeteksi eksekusi perintah berbahaya atau *interactive reverse shell* yang umum digunakan dalam eksploitasi zero-day atau post-exploitation.
- **Pola Deteksi**:
  - `bash -i >& /dev/tcp/...` (Reverse Shell)
  - `curl ... | sh` atau `wget ... | bash` (Fileless Dropper)
  - `powershell -enc ...` (Encoded Payload)
  - Interaksi dengan alamat IP C2 berbahaya yang terdaftar dalam daftar hitam internal.
