# SATRIA SENTINEL — Stack Flow & Data Pipelines
**Dokumentasi Aliran Proses & Eksekusi Pipeline Data**

Dokumen ini menjelaskan alur eksekusi data dari tahap awal input pengguna hingga visualisasi dasbor operasional secara rinci.

---

## 1. Aliran Eksekusi Pipeline Lengkap

```
[1. User Input / Log Upload / Generator]
                    │
                    ▼
[2. API Gateway & RBAC Token Validation]
                    │
                    ▼
[3. Sanitasi Karakter & Deduplikasi SHA-256] ───► Simpan ke `security_events`
                    │
                    ▼
[4. Mesin Evaluasi Aturan Deterministik (6 Rules)]
                    │
                    ▼
[5. Multi-Factor Correlation Engine] ───────────► Bentuk Klaster Kejadian Terkait
                    │
                    ▼
[6. Mesin Penilaian Risiko 5-Faktor (0-100)] ───► Tetapkan Tingkat Risiko Klaster
                    │
                    ▼
[7. Eskalasi Insiden & Penugasan Analis] ───────► Simpan ke `incidents` & `incident_events`
                    │
                    ▼
[8. Rekomendasi Playbook Pertahanan (SOP)] ─────► Rekomendasikan PB-IR-001..005
                    │
                    ▼
[9. Eksekusi Respons & Resolusi Akar Masalah] ──► Status: Investigating ➔ Contained ➔ Closed
                    │
                    ▼
[10. Pencatatan Audit Trail Otomatis] ──────────► Simpan ke `audit_logs`
                    │
                    ▼
[11. Agregasi Dashboard & Telemetri Real-Time] ──► Refresh Indikator & KPI Cards
```

---

## 2. Rincian Setiap Tahapan Pipeline

### Tahap 1: Ingesti & Validasi Input
- Pengguna dapat mengunggah file log berformat **CSV** atau **JSON**, atau menggunakan **Synthetic Generator**.
- File dibatasi maksimal **10 MB** dan maksimal **1.000 record** per batch unggahan untuk mencegah serangan penolakan layanan (*Resource Exhaustion / Denial of Service*).
- Setiap record divalidasi skemanya: `event_type`, `severity`, `source`, `timestamp`, dan `raw_payload`.

### Tahap 2: Sanitasi & Deduplikasi SHA-256
- Karakter kontrol berbahaya seperti byte null (`\0`), carriage return ganda, dan injeksi script disanitasi sebelum diproses.
- Sistem membentuk string kanonikal dari kombinasi nilai: `timestamp + source + event_type + source_ip + destination_ip + raw_payload`.
- String kanonikal ini di-hash menggunakan algoritma **SHA-256** untuk menghasilkan `fingerprint` unik 64 karakter heksadesimal.
- Jika fingerprint sudah ada di database, baris tersebut diabaikan (*deduplicated*) dan dilaporkan dalam ringkasan ingesti.

### Tahap 3: Mesin Deteksi Deterministik
- Event yang lolos validasi dievaluasi terhadap 6 aturan deteksi deterministik (`SATRIA-RULE-BF-001` hingga `SATRIA-RULE-RECON-006`).
- Setiap event yang memicu aturan akan diberi anotasi `matched_rule_id`, `rule_name`, `confidence`, serta bukti telemetri spesifik (misal: "5 kali kegagalan login berturut-turut dari IP 192.168.1.105").

### Tahap 4: Korelasi Multidimensi & Penilaian Risiko
- Mesin korelasi memindai kumpulan event dalam jendela waktu yang dapat dikonfigurasi (default: 60 menit).
- Event dikelompokkan ke dalam klaster berdasarkan kesamaan aset target (`asset_id`), alamat IP sumber (`source_ip`), dan kategori ancaman.
- Mesin kalkulasi risiko menghitung skor risiko komprehensif ($0 - 100$) berdasarkan formula 5 faktor (Severity, Asset Criticality, Confidence, Volume, dan Correlation).

### Tahap 5: Manajemen Insiden & Investigasi
- Klaster dengan skor risiko tinggi dapat dieskalasi menjadi sebuah Insiden Keamanan.
- Insiden memiliki nomor tiket unik (`INC-YYYYMMDD-XXXX`), status awal `open`, dan tingkat keparahan yang diwarisi dari klaster.
- Analis dapat menugaskan diri sendiri, menambahkan catatan investigasi, menghubungkan event tambahan, dan memicu SOP.

### Tahap 6: Eksekusi Playbook & Siklus Hidup
- Sistem mencocokkan tipe ancaman insiden dengan katalog playbook pertahanan (`PB-IR-001` s.d. `PB-IR-005`).
- Analis mengeksekusi tindakan isolasi (misalnya perintah firewall atau isolasi jaringan host).
- Status insiden bergerak dari `open` $\to$ `investigating` $\to$ `contained` $\to$ `closed`.
- Penutupan insiden (*closed*) mewajibkan pengisian catatan akar masalah (*root cause notes*) minimal 5 karakter.

### Tahap 7: Audit Trail & Pembaruan Dashboard
- Seluruh tindakan eskalasi, perubahan status, penugasan, dan penutupan dicatat secara otomatis dalam tabel `audit_logs`.
- Metrik dasbor (Total Aset, Aset Kritis, Total Event, Insiden Aktif, Antrean Prioritas) secara otomatis diperbarui.
