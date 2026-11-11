# SATRIA SENTINEL — Video Thumbnail Specification
**Kompetisi**: Kartika Cyber Hackathon 2026 — Kategori Penangkalan  
**Produk**: SATRIA SENTINEL (Security Asset & Threat Response Intelligence Assistant)  
**Dimensi Kanvas**: 1200 × 630 px (Standar YouTube / OpenGraph Landscape 1.91:1)  
**Batas Ukuran Berkas**: Maksimal 500 KB (Format PNG atau WebP teroptimasi)

---

## 1. Identitas Visual & Palet Warna (*Color Palette*)

Sesuai identitas antarmuka SATRIA SENTINEL, desain thumbnail mengusung tema **Cybersecurity Defensive Command Center**:

| Peran Warna | Nama / Kode HEX | Penggunaan dalam Thumbnail |
| :--- | :--- | :--- |
| **Latar Belakang Primer** | Dark Navy Deep (`#020617` / `#0B0F19`) | Background dasar kanvas dengan gradien radial halus di tengah |
| **Warna Aksen Pertahanan** | Emerald Green Glow (`#10B981` / `#059669`) | Garis tepi perisai, aksen teks kunci, dan kisi-kisi radar defensif |
| **Warna Kontras Teks** | Pure White (`#FFFFFF`) / Slate Light (`#F8FAFC`) | Judul utama dan tipografi informasi utama agar terbaca jelas pada layar ponsel |
| **Warna Sekunder** | Cyan Tech Accent (`#06B6D4`) | Garis grid telemetri dan bayangan hologram sekunder |
| **Warna Peringatan Ancaman** | Amber Alert (`#F59E0B`) | Aksen kecil pada titik indikator deteksi ancaman (opsional) |

---

## 2. Struktur Tata Letak (*Layout Grid & Composition*)

Komposisi dirancang seimbang dengan prinsip keterbacaan tinggi (*high legibility on mobile screens*):

```
+---------------------------------------------------------------------------------------+
|  [Logo & Badge Hackathon]                                                             |
|  KARTIKA CYBER HACKATHON 2026 • PENANGKALAN                                           |
|                                                                                       |
|   +--------------------------+          +-----------------------------------------+   |
|   |                          |          |                                         |   |
|   |      SATRIA SENTINEL     |          |       [MOCKUP / SCREENSHOT KONSOL]      |   |
|   |                          |          |                                         |   |
|   |  Security Asset & Threat |          |     Command Center Dashboard UI         |   |
|   |   Response Intelligence  |          |     - Priority Attention Queue          |   |
|   |         Assistant        |          |     - Risk Score: 98/100 (Critical)     |   |
|   |                          |          |     - Radar Grid & MITRE Telemetry      |   |
|   |  [TAG: DEFENSIVE SOC]    |          |                                         |   |
|   +--------------------------+          +-----------------------------------------+   |
|                                                                                       |
|  [Indikator Fitur Kunci: DETERMINISTIC DETECTION • MULTI-FACTOR CORRELATION • PLAYBOOKS]
+---------------------------------------------------------------------------------------+
```

### Zona Kiri: Tipografi & Penjenamaan (Lebar 50%)
1. **Lencana Kategori (Top Left)**:
   - Teks: `KARTIKA CYBER HACKATHON 2026`
   - Gaya: Huruf kapital, font mono/sans-serif tegas, warna Emerald Green (`#10B981`) di dalam pill container semi-transparan dengan border tipis.
   - Sub-teks: `KATEGORI PENANGKALAN (DEFENSIVE CYBERSECURITY)`
2. **Judul Utama (Primary Title)**:
   - Teks: `SATRIA SENTINEL`
   - Tipografi: Bold, sans-serif futuristik (Inter / Montserrat / Orbitron), ukuran font 64–72 pt, warna Putih Bersih (`#FFFFFF`) dengan drop-shadow lembut warna Emerald (`rgba(16, 185, 129, 0.4)`).
3. **Sub-Judul & Deskripsi Singkat**:
   - Teks: `Defensive Security Command Center & Incident Investigation Assistant`
   - Tipografi: Medium, sans-serif (Inter), ukuran font 22–26 pt, warna Slate Light (`#CBD5E1`).
4. **Pill Tagline Defensif**:
   - Badge bertuliskan: `DETERMINISTIC DETECTIONS • EXPLAINABLE RISK SCORING`

### Zona Kanan: Elemen Visual Pusat Komando (Lebar 50%)
1. **Konsol UI Miring 3D Halus (Isometric Tilt 5°)**:
   - Menampilkan cuplikan antarmuka nyata dari Dashboard SATRIA SENTINEL:
     - Kartu KPI: Total Aset, Security Events `[SYNTHETIC SIM]`, Active Incidents.
     - Kartu **Risk Score: 98/100 (CRITICAL)** dengan badge merah/kuning berpendar.
     - Cuplikan grafik Recharts distribusi risiko dan grafik garis tren.
2. **Lambang Ikon Pertahanan (Watermark Hologram)**:
   - Lambang perisai dengan siluet elang/sentinel bergaris neon emerald di latar belakang visual konsol.
3. **Pola Latar Belakang (Subtle Cyber Grid)**:
   - Garis-garis grid geometris heksagonal atau garis radar defensif dengan opasitas 15% agar tidak mendominasi konten utama.

---

## 3. Ketentuan Integritas & Kepatuhan Etika (*Integrity & Compliance*)

- **Nihil Klaim Militer Tidak Sah**: Thumbnail tidak boleh memuat logo resmi institusi militer/TNI yang tidak terotorisasi, foto prajurit berseragam nyata, atau klaim validasi operasional militer palsu.
- **Transparansi Produk Riset**: Desain mencerminkan murni karya teknologi siber defensif yang dikembangkan peserta untuk kompetisi Kartika Cyber Hackathon 2026.
- **Keterbacaan pada Resolusi Rendah**: Teks judul `SATRIA SENTINEL` dan lencana `KARTIKA CYBER HACKATHON` harus tetap terbaca jelas saat thumbnail mengecil menjadi 320 × 180 px di aplikasi YouTube seluler.

---

## 4. Panduan Ekspor Berkas (*Export Settings*)

| Parameter | Nilai / Konfigurasi |
| :--- | :--- |
| **Dimensi Kanvas** | Lebar `1200 px`, Tinggi `630 px` |
| **Color Profile** | sRGB |
| **Format Berkas** | `.png` (24-bit with alpha) atau `.webp` (lossless / high quality) |
| **Target Ukuran Berkas** | < 450 KB (aman di bawah batas 500 KB) |
| **Status Produksi** | Spesifikasi desain telah selesai dirancang; aset grafis final siap diekspor menggunakan perangkat lunak desain grafis (Figma / Canva / GIMP) sesuai panduan dimensi dan warna di atas. |
