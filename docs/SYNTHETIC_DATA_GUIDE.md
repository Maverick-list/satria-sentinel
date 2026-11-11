# SATRIA SENTINEL — Synthetic Security Data & Log Ingestion Guide

## 1. Etika & Penandaan Data Simulasi

Sesuai aturan pengembangan **Kartika Cyber Hackathon 2026**, seluruh skenario pengujian dan demonstrasi pada SATRIA SENTINEL menggunakan **data keamanan sintetis (*synthetic security logs*)**.

1. Setiap kejadian hasil generator menyertakan penanda eksplisit `[SYNTHETIC SIMULATION]` pada kolom `description`.
2. Kolom database `is_synthetic` disetel ke `TRUE`, dan `raw_payload` menyertakan metadata `"synthetic_simulation": true` serta `"disclaimer": "SYNTHETIC SIMULATION DATA — Generated for Kartika Cyber Hackathon 2026 defensive testing. Not real attack telemetry."`.
3. Sistem **tidak** melakukan pemindaian ofensif terhadap target eksternal dan **tidak** mengeksekusi isi log sebagai kode atau perintah sistem (*no `eval`/`exec`/`subprocess`*).

Implementasi generator: [`backend/app/services/synthetic_generator.py`](../backend/app/services/synthetic_generator.py).

---

## 2. Daftar Skenario Simulasi (`POST /api/v1/log-ingestion/generate-synthetic`)

| Scenario Key | Nama Skenario | Target Asset Default | Aturan Deteksi yang Terpicu | Deskripsi Kejadian Simulasi |
| :--- | :--- | :--- | :--- | :--- |
| `brute_force` | Multiple Failed Login Attempts | `AST-IAM-001` (`satria-sso-idp-01`) | `SATRIA-RULE-BF-001` | Simulasi serangan *password spraying / brute-force* SSH & SSO (`14` dan `8` kegagalan autentikasi beruntun dari IP simulasi `198.51.100.44`). |
| `suspicious_login` | Suspicious Login Activity | `AST-IAM-001` (`satria-sso-idp-01`) | `SATRIA-RULE-AUTH-002` | Simulasi keberhasilan login di luar jam operasional (`02:30 UTC`) dari ASN baru dengan *device fingerprint* tidak dikenal setelah percobaan gagal. |
| `unusual_access` | Unusual Access Patterns | `AST-API-002` (`satria-core-api-gw`) | `SATRIA-RULE-ACC-003` | Simulasi lonjakan permintaan (`215 req/menit`) dan enumerasi *endpoint* terproteksi (`42` respons `403/404`). |
| `port_scanning` | Port Scanning Indicators | `AST-NET-005` (`satria-edge-fw-01`) | `SATRIA-RULE-RECON-006` | Simulasi pemindaian *TCP SYN probe* terhadap `38` *port* layanan berbeda pada *perimeter gateway*. |
| `privilege_escalation` | Privilege Escalation Indicators | `AST-K8S-004` (`satria-k8s-worker-01`) | `SATRIA-RULE-PRIV-004` | Simulasi eskalasi hak akses ke `root` / `cluster-admin` tanpa tiket perubahan resmi (`change_ticket: null`). |
| `suspicious_outbound` | Suspicious Outbound Traffic | `AST-DB-003` (`satria-pg-primary-01`) | `SATRIA-RULE-EXFIL-005` | Simulasi transfer data keluar berukuran besar (`84.5 MB`) menuju alamat IP eksternal yang tidak terdaftar dalam kebijakan *egress*. |
| `all_scenarios` | Full Multi-Stage Simulation Suite | Seluruh 5 aset | Seluruh 6 aturan (`BF-001` s/d `RECON-006`) | Menghasilkan `10` kejadian simulasi terhubung yang mendemonstrasikan korelasi multi-tahap dari *reconnaissance* hingga *exfiltration indicator*. |

---

## 3. Format Impor Log (`POST /api/v1/log-ingestion/import`)

Mesin *Log Ingestion* ([`backend/app/services/ingestion_service.py`](../backend/app/services/ingestion_service.py)) mendukung format **JSON** dan **CSV** dengan deteksi duplikat otomatis berbasis sidik jari SHA-256 (`event_hash`).

### 3.1 Contoh Format JSON

```json
[
  {
    "occurred_at": "2026-11-11T10:15:00Z",
    "source": "pam-sshd",
    "event_type": "auth_login_failed",
    "severity": "high",
    "asset_identifier": "AST-IAM-001",
    "source_ip": "198.51.100.77",
    "destination_ip": "10.20.1.10",
    "username": "admin_ops",
    "description": "[SYNTHETIC SIMULATION] Repeated SSH authentication failures",
    "failed_attempts": 9,
    "is_synthetic": true
  }
]
```

### 3.2 Contoh Format CSV

```csv
occurred_at,source,event_type,severity,asset_identifier,source_ip,username,description,failed_attempts
2026-11-11T10:20:00Z,pam-sshd,auth_login_failed,high,AST-IAM-001,198.51.100.88,root,[SYNTHETIC SIMULATION] CSV imported brute-force indicator,11
```

### 3.3 Validasi, Sanitasi, dan Error Reporting
- Setiap baris diperiksa terhadap keberadaan atribut wajib (`source`, `event_type`, `severity`, `description`), validitas nilai enumerasi `severity` (`low`, `medium`, `high`, `critical`), dan format waktu ISO-8601 (`occurred_at`).
- Karakter kontrol berbahaya (termasuk *null byte* `\x00` dan rangkaian karakter kendali ASCII) dibersihkan sebelum disimpan.
- Baris yang gagal divalidasi tidak menghentikan impor baris lain yang valid; respons API mengembalikan rincian `errors` berisi `row_index`, `reason`, dan cuplikan data (`raw_preview`).
