# SATRIA SENTINEL — Future Development Roadmap & Evolution
**Rencana Pengembangan Lanjutan Pasca-Hackathon**

Dokumen ini memetakan visi arsitektur dan evolusi produk SATRIA SENTINEL dari fase prototype kompetisi menuju platform pertahanan tingkat enterprise dan militer penuh (*Defense-Grade Production*).

---

## 1. Fase Pengembangan

```
Phase 1-4 (Selesai) ────► Phase 5 (Enterprise Core) ────► Phase 6 (Tactical Edge) ────► Phase 7 (Unified Defense)
- Fondasi & Lingkungan    - SSO SAML 2.0 / CAC/PIV      - Agent Koleksi Endpoint      - Federasi Multi-SOC
- Mesin Deteksi & Core    - Redis Token Blacklist       - Integrasi Syslog RFC 5424   - Graph Correlation
- UI Command Center       - Database WORM Audit         - Zero-Trust Policy Engine    - Otorisasi SOAR Ganda
- Uji & Audit Selesai     - Multi-Tenant Partisi        - Edge Ingestion Gateway      - Sertifikasi Kepatuhan
```

---

## 2. Rincian Milestone Masa Depan

### Milestone 1: Penguatan Inti Enterprise & Otentikasi Militer (Fase 5)
- **Integrasi Kartu Pintar Militer (CAC / PIV / Red-Hat PKI)**: Otentikasi berbasis sertifikat digital X.509 dan kartu pintar militer selain kata sandi.
- **Pencabutan Token Terdistribusi**: Menggantikan in-memory JTI revocation dengan klaster Redis Sentinel terenkripsi TLS untuk mendukung deployment multi-kontainer backend berskala besar.
- **Audit Storage WORM (Write Once Read Many)**: Replikasi otomatis audit log ke penyimpanan cloud yang terkunci (*Object Lock*) untuk kepatuhan investigasi yudisial.

### Milestone 2: Pengumpulan Telemetri Taktis & Edge Ingestion (Fase 6)
- **Agent Koleksi Endpoint Ringan (SATRIA Node Collector)**: Agent daemon berbasis Rust atau Go berbobot memori rendah (< 20 MB RAM) untuk mengumpulkan telemetri kernel Linux (`eBPF`) dan Windows Event Logs.
- **Konektor Syslog Streaming**: Dukungan native untuk protokol Syslog RFC 5424 dan penyerapan aliran data berkecepatan tinggi via Apache Kafka atau Redpanda.

### Milestone 3: Analisis Graf Hubungan & Rekomendasi SOAR Otonom (Fase 7)
- **Graph-Based Threat Correlation**: Menggunakan database graf untuk memetakan hubungan antara IP penyerang, akun pengguna yang terkompromi, dan rantai pergerakan lateral (*lateral movement*).
- **Dual-Analyst SOAR Execution**: Fitur orkestrasi otomatis yang memungkinkan eksekusi isolasi jaringan atau pencabutan sesi secara aman melalui persetujuan dua analis (*four-eyes principle*).
- **Penyelarasan MITRE ATT&CK Enterprise**: Pemetaan visual matriks taktik dan teknik secara real-time pada setiap insiden yang aktif.
