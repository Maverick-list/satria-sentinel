# SATRIA SENTINEL — Video Demonstration Script (10-Minute Walkthrough)
**Kompetisi**: Kartika Cyber Hackathon 2026 — Kategori Penangkalan  
**Format**: Video Presentasi & Live Walkthrough Aplikasi  
**Target Durasi Maksimal**: 10 Menit (600 Detik)

---

## Ringkasan Struktur Waktu (*Time Allocation*)

| Segmen | Menit | Topik / Fokus Utama | Halaman / Elemen Antarmuka yang Ditampilkan |
| :--- | :--- | :--- | :--- |
| **1** | `0:00 – 0:45` | Pembukaan, Identitas Proyek & Latar Belakang Masalah | Slide Pembuka / Title Card |
| **2** | `0:45 – 1:45` | Solusi SATRIA SENTINEL & Arsitektur Teknis Defensif | Diagram Arsitektur & Prinsip Penangkalan |
| **3** | `1:45 – 3:00` | Command Center Dashboard & Manajemen Inventaris Aset | `http://localhost:3000/` & `/assets` |
| **4** | `3:00 – 5:00` | Ingesti Log Aman, Data Sintetis & Aturan Deteksi Deterministik | `/security-events` (Generator & Ingesti) |
| **5** | `5:00 – 7:30` | Korelasi Multi-Faktor, Skor Risiko Terjelaskan & Workspace Insiden | `/security-events` (Korelasi) & `/incidents` |
| **6** | `7:30 – 8:45` | SOP Response Playbook (Advisory Guardrail) & Jejak Audit | `/playbooks` & `/audit-logs` |
| **7** | `8:45 – 9:30` | Inovasi Teknis, Keamanan RBAC & Batasan Sistem Saat Ini | `/settings` & Matriks RBAC |
| **8** | `9:30 – 10:00` | Kesimpulan, Kesiapan Kompetisi & Penutup | Konsol Dashboard & Slide Penutup |

---

## Naskah Lengkap (*Full Narration & Visual Cues*)

### Segmen 1: Pembukaan & Latar Belakang Masalah (`0:00 – 0:45`)
- **Visual**: Slide Pembuka dengan judul **SATRIA SENTINEL: Security Asset & Threat Response Intelligence Assistant**, identitas Kartika Cyber Hackathon 2026, Kategori Penangkalan.
- **Audio / Narasi**:
  > "Halo dewan juri dan pemerhati pertahanan siber Indonesia. Saya [Nama Presenter], mempersembahkan **SATRIA SENTINEL** — *Security Asset & Threat Response Intelligence Assistant*, sebuah platform komando operasi pertahanan siber yang kami rancang untuk kategori **Penangkalan** pada Kartika Cyber Hackathon 2026.
  >
  > Dalam menjaga kedaulatan digital dan infrastruktur penting, tim pertahanan siber sering mengalami *alert fatigue* akibat ribuan log mentah yang terisolasi tanpa konteks kritikalitas aset. Lebih buruk lagi, banyak alat analisis bersifat *black-box* tanpa kejelasan alasan deteksi. SATRIA SENTINEL hadir menjawab tantangan ini: mengubah telemetri mentah menjadi intelijen penangkalan yang deterministik, kontekstual, dan dapat dijelaskan secara transparan."

---

### Segmen 2: Solusi & Arsitektur Sistem (`0:45 – 1:45`)
- **Visual**: Menampilkan diagram arsitektur tiga lapis SATRIA SENTINEL (Next.js 15, FastAPI, PostgreSQL 16) dan bagan alur kerja data dari sensor hingga respon.
- **Audio / Narasi**:
  > "SATRIA SENTINEL dibangun dengan arsitektur modular tiga lapis yang kokoh:
  > Pertama, antarmuka modern menggunakan Next.js 15 App Router dan Tailwind CSS dengan desain *Command Center* bertema Dark Navy dan Emerald Green yang ergonomis bagi mata analis SOC.
  > Kedua, mesin backend berbasis Python FastAPI dengan pemisahan domain yang bersih antara rute API, validasi skema Pydantic, mesin deteksi deterministik, korelasi multi-faktor, dan mesin skor risiko.
  > Ketiga, basis data relasional PostgreSQL 16 dengan 7 entitas inti yang terkelola melalui migrasi Alembic.
  >
  > Seluruh komunikasi diamankan dengan token JWT HS256, hashing password memory-hard scrypt, pembatasan CORS ketat, dan kontrol akses berbasis peran (RBAC) tiga tingkat: Admin, Security Analyst, dan Viewer. Mari kita lihat langsung bagaimana platform ini bekerja."

---

### Segmen 3: Command Center Dashboard & Manajemen Aset (`1:45 – 3:00`)
- **Visual**: Masuk ke browser di `http://localhost:3000/`. Perlihatkan status kesehatan sistem di kartu atas, indikator KPI, kartu *Analyst Priority Attention Queue*, grafik distribusi risiko Recharts, dan tabel *Asset Risk Overview*. Kemudian klik menu **Assets** (`/assets`).
- **Audio / Narasi**:
  > "Inilah **Command Center Dashboard SATRIA SENTINEL**. Di bagian atas, panel kesehatan sistem mengonfirmasi integritas koneksi PostgreSQL dan ketujuh tabel inti yang terverifikasi secara real-time.
  >
  > Perhatikan kartu metrik utama: kami memantau 4 aset digital krusial, di mana 2 di antaranya adalah *Critical Assets*. Total log keamanan yang tercatat secara transparan memisahkan jumlah kejadian simulasi pelatihan bertanda *SYNTHETIC SIM* dari log operasional, sehingga tidak ada kerancuan antara simulasi dan data nyata.
  >
  > Fitur unggulan kami adalah **Analyst Priority Attention Queue**: algoritma cerdas yang menempatkan insiden dengan skor risiko tertinggi dan klaster korelasi multi-tahap langsung di bagian atas untuk ditindaklanjuti lebih dulu oleh analis.
  >
  > Sekarang kita berpindah ke halaman **Assets Inventory** (`/assets`). Di sini tercatat aset strategis seperti `AST-IAM-001` (Central Identity Gateway) dan `AST-DB-002` (Core Vault Database). Saat kita memilih salah satu aset, panel kanan langsung menguraikan *Why Asset Criticality Matters*: bagaimana status Tier-0 memberikan bobot risiko tambahan hingga +25 poin karena dampaknya yang melumpuhkan jika tereksploitasi."

---

### Segmen 4: Ingesti Log Aman, Data Sintetis & Aturan Deteksi (`3:00 – 5:00`)
- **Visual**: Buka halaman **Security Events** (`/security-events`). Tunjukkan form **Synthetic Security Log Generator**, pilih skenario `privilege_escalation` atau `all_scenarios`, klik **Generate**. Tunjukkan juga form impor CSV/JSON dan klik **Import & Analyze Logs**. Klik salah satu event di tabel untuk membuka panel **Detection & Risk Explanation**.
- **Audio / Narasi**:
  > "Sekarang kita masuk ke modul **Security Events & Log Ingestion** (`/security-events`). Platform ini dilengkapi dua saluran ingesti data defensif:
  > Pertama, **Synthetic Security Log Generator** yang menyediakan 6 skenario serangan terstruktur, seperti brute-force beruntun, login pasca-brute-force, port scanning, hingga eksfiltrasi data keluar. Seluruh data sintetis ini diberi penanda eksplisit `[SYNTHETIC SIMULATION]` untuk menjamin integritas riset.
  > Kedua, mesin impor log CSV dan JSON yang dilengkapi validasi skema ketat, batas ukuran payload aman, sanitasi karakter berbahaya, dan deduplikasi berbasis hash SHA-256 tanpa pernah mengeksekusi muatan log sebagai kode.
  >
  > Ketika log masuk, **Deterministic Threat Detection Engine** kami mengevaluasi kejadian menggunakan 6 aturan deteksi yang dipetakan ke taktik dan teknik MITRE ATT&CK.
  >
  > Lihat apa yang terjadi ketika saya mengklik salah satu event `auth_failure`: pada panel kanan **Detection & Risk Explanation**, sistem menampilkan secara transparan:
  > 1. Konteks aset yang diserang,
  > 2. Bukti telemetri pendukung seperti IP sumber, IP target, dan sensor origin,
  > 3. Alasan persis mengapa aturan tersebut terpicu (*Why flagged*), dan
  > 4. Rekomendasi tindakan defensif awal. Tidak ada klaim AI ajaib yang tidak berdasar; semua berbasis bukti kausal yang dapat diverifikasi."

---

### Segmen 5: Korelasi Multi-Faktor, Skor Risiko & Investigasi Insiden (`5:00 – 7:30`)
- **Visual**: Di halaman `/security-events`, gulir ke bawah ke panel **Correlated Event Clusters**. Tunjukkan ID klaster `CORR-*` dan klik **Escalate Cluster to Incident**. Lalu navigasi ke halaman **Incidents** (`/incidents`), pilih insiden baru, tunjukkan rincian skor risiko, dropdown **Assigned Analyst**, daftar **Affected Assets**, panel **Detection Findings**, tambahkan catatan pada **Add Investigation Note**, lalu ubah status ke `CONTAINMENT`.
- **Audio / Narasi**:
  > "Satu log serangan yang terisolasi mungkin terlihat sepele, tetapi rangkaian kejadian adalah tanda intrusi terencana. Di bagian bawah, **Multi-Factor Correlation Engine** kami mengelompokkan kejadian-kejadian yang memiliki kesamaan IP penyerang, aset target, dalam rentang waktu 60 menit, dan membentuk progresi rantai ancaman. Yang penting digarisbawahi: sistem kami tidak pernah mengorelasikan log hanya berdasarkan kesamaan severitas semata!
  >
  > Setiap klaster dan insiden dihitung tingkat keparahannya menggunakan **Explainable Risk Scoring Engine** dengan rentang nilai deterministik 0 hingga 100 berdasarkan 5 faktor berbobot.
  >
  > Sekarang, saya klik tombol **Escalate Cluster to Incident** untuk membuat kasus insiden baru.
  >
  > Kita dialihkan ke halaman **Incidents & Case Management** (`/incidents`). Di sinilah pusat investigasi analis SOC:
  > Pada panel workspace insiden, kita melihat ringkasan lengkap: tingkat severitas `critical`, skor risiko 98/100 beserta rincian 5 faktornya, waktu deteksi, dan status penanganan.
  > Sebagai analis, saya dapat menugaskan rekan saya `@analyst` melalui pemilih penugasan analis.
  > Sistem secara otomatis merinci seluruh aset yang terdampak dan temuan deteksi terkait.
  >
  > Saya menambahkan catatan investigasi di sini: *'Verifikasi telemetri selesai; aktivitas terisolasi pada gateway autentikasi'*, lalu klik **Append Note**. Catatan ini langsung tercatat secara permanen pada lini masa kronologis.
  > Kemudian saya mengklik status **CONTAINMENT** untuk memindahkan tahapan insiden sesuai standar penanganan insiden siber."

---

### Segmen 6: Response Playbook & Jejak Audit Imutabel (`7:30 – 8:45`)
- **Visual**: Di dalam workspace insiden, perlihatkan panel **Recommended Playbook (`PB-IR-*`)**. Lalu buka halaman **Response Playbooks** (`/playbooks`) dan tunjukkan kartu peringatan **Advisory-Only**. Setelah itu, navigasi ke halaman **Audit Logs** (`/audit-logs`), demonstrasikan filter cepat, dan tunjukkan baris audit penugasan dan status insiden dengan atribusi `@username`.
- **Audio / Narasi**:
  > "Untuk memastikan respon yang cepat dan terstandarisasi, SATRIA SENTINEL secara otomatis mencocokkan tipe ancaman dengan **Defensive Response Playbook**.
  >
  > Di sini kita melihat rekomendasi `PB-IR-001: Account Compromise & Suspicious Authentication Response`.
  > Mari kita buka halaman katalog **Response Playbooks** (`/playbooks`). Setiap prosedur operasional standar (SOP) menyajikan 4 pilar kunci:
  > 1. Skenario ancaman,
  > 2. Tujuan operasional,
  > 3. Otorisasi yang dipersyaratkan, dan
  > 4. Hasil defensif yang diharapkan beserta kriteria verifikasi langkah demi langkah.
  >
  > Penting untuk ditekankan: SATRIA SENTINEL menerapkan prinsip **Advisory-Only (Human-in-the-Loop)**. Kami sengaja tidak melakukan pemblokiran otomatis pada infrastruktur eksternal untuk menghindari *denial of service* yang tidak disengaja. Setiap tindakan mitigasi wajib ditinjau dan dieksekusi oleh operator yang berwenang.
  >
  > Sekarang kita beralih ke halaman **Audit Logs** (`/audit-logs`). Akuntabilitas adalah pilar utama pertahanan siber. Setiap tindakan penting—mulai dari login, pembangkitan data, perubahan status insiden, hingga resolusi kasus—tercatat secara imutabel di backend dengan atribusi nama operator `@analyst`, alamat IP klien, dan detail terstruktur. Seluruh token rahasia dan kata sandi disanitasi secara otomatis sebelum disimpan ke database."

---

### Segmen 7: Inovasi Teknis, RBAC & Batasan Sistem (`8:45 – 9:30`)
- **Visual**: Buka halaman **Settings** (`/settings`), tunjukkan profil operator aktif, tabel **Role-Based Access Control (RBAC) Matrix**, daftar akun, dan katalog 6 aturan deteksi aktif.
- **Audio / Narasi**:
  > "Pada halaman **Settings & Security Baseline** (`/settings`), kita dapat melihat transparansi kontrol akses sistem. Melalui tabel matriks RBAC, platform secara ketat membedakan wewenang antara Admin (manajemen user dan aset), Security Analyst (ingesti log, deteksi, dan investigasi kasus), serta Viewer (akses baca-saja tanpa izin mutasi).
  >
  > Sebagai insinyur perangkat lunak yang berintegritas, kami juga mendokumentasikan batasan sistem kami secara jujur:
  > Pertama, mekanisme *token revocation* saat logout saat ini diimplementasikan secara *process-local* di memori backend, yang untuk lingkungan multi-worker siap ditingkatkan menggunakan Redis.
  > Kedua, sistem audit log saat ini berstatus *append-only* di level API aplikasi.
  > Ketiga, seluruh pengujian divalidasi menggunakan dataset simulasi defensif sintetis, tanpa mengklaim validasi operasional militer dunia nyata yang tidak terverifikasi."

---

### Segmen 8: Kesimpulan & Penutup (`9:30 – 10:00`)
- **Visual**: Kembali ke konsol Dashboard utama (`http://localhost:3000/`) dengan seluruh grafik dan metrik aktif, lalu beralih ke slide penutup.
- **Audio / Narasi**:
  > "Sebagai rangkuman, **SATRIA SENTINEL** telah menyelesaikan seluruh target pengembangan Phase 1 hingga Phase 4 dengan verifikasi otomatis yang solid: 9 pengujian backend Pytest lulus 100%, pengecekan tipe TypeScript bersih tanpa error, build produksi Next.js teroptimasi, dan 4 pengujian end-to-end Playwright yang mencakup 18 langkah alur kerja operasional berhasil dijalankan dengan sempurna.
  >
  > SATRIA SENTINEL siap menjadi fondasi platform pertahanan siber defensif yang terpercaya, transparan, dan tangguh untuk memperkuat kedaulatan digital Indonesia.
  >
  > Terima kasih atas perhatian dewan juri, salam Ksatria Siber Penjaga Nusantara!"
