# SATRIA SENTINEL — Project Overview

## 1. Latar Belakang & Tujuan

**SATRIA SENTINEL** (*Security Asset & Threat Response Intelligence Assistant*) adalah prototipe platform operasi keamanan siber defensif (*defensive cybersecurity platform*) yang dikembangkan untuk kompetisi **Kartika Cyber Hackathon 2026**.

Platform ini dirancang untuk membantu tim operasi keamanan (*Security Operations Center / SOC*) dan pengelola infrastruktur digital dalam:
1. **Monitoring Aset Digital**: Menginventarisasi aset teknologi informasi beserta tingkat kritikalitas (`low`, `medium`, `high`, `critical`) dan lingkungannya (`production`, `staging`, `development`, `corporate`).
2. **Ingesti & Validasi Log Keamanan**: Mengimpor log keamanan berformat CSV maupun JSON dengan sanitasi input, deteksi duplikat otomatis berbasis sidik jari SHA-256 (`event_hash`), serta generator skenario simulasi bertanda `[SYNTHETIC SIMULATION]`.
3. **Deteksi Indikasi Ancaman Deterministik**: Mengevaluasi *security events* terhadap 6 aturan deteksi deterministik (`SATRIA-RULE-BF-001` s/d `SATRIA-RULE-RECON-006`) yang transparan, terpetakan ke kerangka **MITRE ATT&CK**, dan menyimpan penjelasan alasan (`reason`) pada setiap temuan.
4. **Korelasi Kejadian Multi-Faktor**: Mengelompokkan kejadian keamanan yang berkaitan berdasarkan kesamaan aset, kesamaan IP sumber, kedekatan waktu, dan progresi rantai serangan (*multi-stage indicator progression*).
5. **Analisis & Prioritas Risiko (`0–100`)**: Menghitung skor risiko komposit berbasis 5 faktor yang dapat dijelaskan (*explainable risk breakdown*) untuk menentukan prioritas penanganan.
6. **Manajemen Insiden & Rekomendasi Respons Defensif**: Mengelola siklus hidup insiden dari *Open* hingga *Closed*, mencatat lini masa investigasi (*incident timeline*), merekomendasikan *Response Playbooks* yang bersifat *advisory-only*, serta merekam seluruh tindakan penting ke dalam **Audit Trail**.

---

## 2. Status Pengembangan Saat Ini (Phase 1 & Phase 2 Selesai)

### Phase 1 — Foundation & Environment Setup (Selesai)
- Struktur repositori monorepo modular (`frontend/`, `backend/`, `docs/`, `infrastructure/`, `scripts/`).
- Fondasi database PostgreSQL 16 + SQLAlchemy 2.0 + migrasi Alembic (`0001`).
- Kerangka aplikasi FastAPI (`/api/v1/health`), penanganan *exception* terpusat, dan *structured JSON logging*.
- Antarmuka *Command Center* Next.js 15 App Router dengan tema *Emerald Green & Dark Navy*.

### Phase 2 — Core Security Engine & Operational Workflows (Selesai)
- **Authentication & RBAC**: Login/logout menggunakan *password hashing* `scrypt` (RFC 7914), *access token* JWT HS256 dengan mekanisme pencabutan token (`jti` revocation), dan proteksi *endpoint* berbasis 3 peran (`admin`, `security_analyst`, `viewer`).
- **Synthetic Security Log Generator**: Generator 6 skenario ancaman simulasi (`brute_force`, `suspicious_login`, `unusual_access`, `port_scanning`, `privilege_escalation`, `suspicious_outbound`) dengan penanda `[SYNTHETIC SIMULATION]`.
- **Log Ingestion Engine**: Impor CSV & JSON dengan validasi skema, sanitasi karakter berbahaya, deteksi duplikat SHA-256, dan pelaporan baris gagal.
- **Rule-Based Threat Detection Engine**: 6 aturan deterministik transparan dengan pemetaan MITRE ATT&CK tanpa klaim AI/ML palsu.
- **Event Correlation Engine**: Pengelompokan kejadian berbasis IP sumber, aset target, rentang waktu, dan progresi indikator disertai `correlation_explanation`.
- **Risk Scoring Engine**: Perhitungan skor prioritas `0–100` dengan rincian 5 faktor dan 4 kategori risiko (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Incident Management, Playbooks & Audit Trail**: Alur kerja operasional lengkap di *backend* dan *frontend* yang teruji melalui **Pytest** dan **Playwright E2E**.

---

## 3. Prinsip Etika & Keamanan Kompetisi

- **100% Defensive Architecture**: SATRIA SENTINEL murni berfokus pada pemantauan, deteksi, analisis risiko, dan rekomendasi respons defensif. Tidak ada modul pemindaian ofensif atau eksploitasi.
- **Transparansi Metodologi**: Aturan deteksi deterministik tidak diklaim sebagai AI/ML, dan skor risiko `0–100` tidak diklaim sebagai probabilitas statistik serangan.
- **Advisory-Only Playbooks**: *Response Playbooks* memberikan panduan prosedur operasi standar untuk analis manusia dan tidak mengeksekusi tindakan otomatis ke sistem eksternal.
