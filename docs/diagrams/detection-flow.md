# Diagram Alur Deteksi Ancaman (Detection Flow)

Diagram alur ini merinci evaluasi 6 aturan deteksi deterministik sesuai kode implementasi aktual di [`backend/app/services/detection_engine.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/services/detection_engine.py):

```mermaid
flowchart TD
    StartEvent(["Input Security Event Mentah"]) --> Sanitization["Sanitasi Input & Normalisasi Format"]
    Sanitization --> Deduplication{"Cek Fingerprint SHA-256 di DB"}
    Deduplication -- "Sudah Ada (Duplikat)" --> SkipEvent["Abaikan & Catat Statistik Duplikat"]
    Deduplication -- "Baru" --> InsertDB["Simpan ke Tabel security_events"]
    
    InsertDB --> RuleEngine["Evaluasi Mesin Deteksi Deterministik"]
    
    RuleEngine --> R1{"SATRIA-RULE-BF-001<br/>Brute-Force Indicator?<br/>(failed_attempts >= 5 / window <= 15m)"}
    RuleEngine --> R2{"SATRIA-RULE-AUTH-002<br/>Suspicious Login Activity?<br/>(post_bruteforce / geo / off-hours)"}
    RuleEngine --> R3{"SATRIA-RULE-ACC-003<br/>Unusual Access Frequency?<br/>(req/min >= 120 OR records >= 500)"}
    RuleEngine --> R4{"SATRIA-RULE-PRIV-004<br/>Privilege Escalation?<br/>(root/admin/SYSTEM tanpa change ticket)"}
    RuleEngine --> R5{"SATRIA-RULE-EXFIL-005<br/>Suspicious Outbound / Exfiltration?<br/>(bytes_out >= 50MB OR port 4444/1337/8443)"}
    RuleEngine --> R6{"SATRIA-RULE-RECON-006<br/>Port Scanning & Reconnaissance?<br/>(distinct_ports_probed >= 15)"}

    R1 -- Ya --> TagFinding["Beri Label Rule ID, Severity, Confidence, & Bukti Telemetri"]
    R2 -- Ya --> TagFinding
    R3 -- Ya --> TagFinding
    R4 -- Ya --> TagFinding
    R5 -- Ya --> TagFinding
    R6 -- Ya --> TagFinding

    R1 -- Tidak --> NextStep["Lanjut Evaluasi"]
    R2 -- Tidak --> NextStep
    R3 -- Tidak --> NextStep
    R4 -- Tidak --> NextStep
    R5 -- Tidak --> NextStep
    R6 -- Tidak --> NextStep

    TagFinding --> Correlate["Kirim ke Multi-Factor Correlation Engine"]
```
