# SATRIA SENTINEL — Operator & Analyst User Guide
**Panduan Pengguna & Alur Kerja Operasional SOC**

Panduan ini ditujukan bagi analis keamanan, operator, dan juri kompetisi untuk mengeksplorasi dan mengoperasikan platform SATRIA SENTINEL.

---

## 1. Masuk ke Sistem & Pengalihan Peran (Login & Role Switcher)

1. Buka browser dan arahkan ke alamat [http://localhost:3000](http://localhost:3000).
2. Sistem secara otomatis menyiapkan sesi peninjauan awal (*auto-bootstrap*).
3. Untuk beralih peran atau menguji kontrol akses (RBAC), klik tombol **"Operator Login"** atau **"Switch Role"** pada bagian kanan atas bilah navigasi.
4. Tersedia tombol preset instan untuk kemudahan evaluasi:
   - **Admin**: Akses penuh termasuk registrasi pengguna dan audit sistem.
   - **Analyst**: Akses operasional penuh untuk aset, log, deteksi, korelasi, dan penanganan insiden.
   - **Viewer**: Akses hanya-baca (Read-Only) untuk pengawasan kepatuhan dan audit.

---

## 2. Dasbor Pusat Komando (Command Center Dashboard)

Navigasi: Klik menu **"Dashboard"** pada sidebar kiri.

Elemen Utama:
- **Kartu KPI Utama**:
  - *Monitored Assets*: Jumlah aset yang terpantau aktif.
  - *Critical Infrastructure*: Jumlah aset dengan label tingkat kritikalitas kritis.
  - *Active Incidents*: Jumlah tiket insiden yang sedang dalam investigasi aktif.
  - *High-Risk Findings*: Jumlah temuan keamanan dengan skor risiko $\ge 70$.
- **Analyst Priority Attention Queue**: Daftar klaster ancaman paling mendesak yang membutuhkan perhatian analis segera, diurutkan berdasarkan skor risiko tertinggi.
- **Asset Risk Overview**: Visualisasi distribusi aset berdasarkan tingkat risikonya.
- **Recent Threat Incidents**: Tabel insiden terkini lengkap dengan badge status dan keparahan.

---

## 3. Inventaris Aset Digital (Assets Inventory)

Navigasi: Klik menu **"Assets"** pada sidebar kiri.

Fitur & Alur Kerja:
1. **Pencarian Aset**: Gunakan kolom pencarian untuk mencari berdasarkan nama host, IP, atau kode aset tag (misal: `AST-KRI-001`).
2. **Filter Kritikalitas**: Gunakan filter chip untuk memfilter aset: `All`, `Critical Only`, `High`, `Medium`, `Low`.
3. **Mendaftarkan Aset Baru** (Khusus Analyst / Admin):
   - Klik tombol **"Register New Asset"**.
   - Isi Asset Tag, Nama Sistem, Hostname, Alamat IP, Tipe Aset, dan Tingkat Kritikalitas.
   - Klik **"Save Asset"**.

---

## 4. Ingesti Log & Telemetri Keamanan (Security Events)

Navigasi: Klik menu **"Security Events"** pada sidebar kiri.

Fitur & Alur Kerja:
1. **Menggunakan Generator Data Sintetis**:
   - Pilih skenario dari dropdown (misal: *Privilege Escalation Scenario*, *Brute Force Attack*, *Port Reconnaissance*).
   - Klik **"Generate Scenario"**.
   - Sistem akan menyuntikkan batch telemetri log simulasi dan menampilkan ringkasan jumlah data yang diimpor.
2. **Unggah File Log (CSV / JSON)**:
   - Pilih format CSV atau JSON.
   - Tempelkan atau unggah konten log.
   - Klik **"Ingest Log Data"**. Sistem akan memvalidasi skema dan menyaring data duplikat secara otomatis via SHA-256.
3. **Menjalankan Deteksi & Korelasi**:
   - Klik tombol **"Run Detection & Correlation"**.
   - Periksa panel **"Detection Explanations & Risk Calculation"** di sebelah kanan untuk melihat aturan mana yang terpicu beserta rincian 5 faktor risiko matematisnya.

---

## 5. Investigasi & Siklus Hidup Insiden (Incidents Workspace)

Navigasi: Klik menu **"Incidents"** pada sidebar kiri.

Siklus Hidup Lengkap:
1. **Memilih Insiden**: Klik salah satu kartu insiden pada daftar sebelah kiri untuk membuka ruang kerja investigasi.
2. **Penugasan Analis**: Klik tombol **"Assign to Self"** untuk menetapkan tanggung jawab penanganan.
3. **Menambahkan Catatan Investigasi**:
   - Ketik temuan teknis pada kolom *Investigation Note*.
   - Klik **"Append Note"** untuk mencatat temuan ke dalam timeline kronologis.
4. **Transisi Status**:
   - Klik tombol status: `INVESTIGATING` $\to$ `CONTAINMENT` $\to$ `CLOSED`.
5. **Menyelesaikan Insiden (Resolution with Root Cause)**:
   - Isi kolom *Root Cause Summary* (wajib diisi, minimal 5 karakter).
   - Klik **"Mark Recovered"** atau transisikan ke status `CLOSED`.
   - Tindakan resolusi akan tercatat permanen di timeline dan audit log.

---

## 6. Standar Operasional Prosedur (Defensive Playbooks)

Navigasi: Klik menu **"Playbooks"** pada sidebar kiri.

Fitur:
- Telusuri katalog playbook standar (misal: `PB-IR-001: Host Network Isolation SOP`, `PB-IR-002: Brute Force Mitigation SOP`).
- Periksa langkah mitigasi terstruktur dan salin (*copy*) perintah CLI yang direkomendasikan (misal: perintah `iptables` atau pembatalan sesi IAM).
- Tinjau peringatan keselamatan *advisory* yang mewajibkan otorisasi analis sebelum eksekusi.

---

## 7. Jejak Audit & Kepatuhan (Audit Logs)

Navigasi: Klik menu **"Audit Logs"** pada sidebar kiri.

Fitur:
- Memeriksa rekaman kronologis setiap aksi penting yang terjadi di sistem.
- Menampilkan stempel waktu akurat, identitas operator (`actor`), aksi (`action`), tipe entitas, dan alamat IP klien.
- Klik ikon *inspect* untuk melihat payload detail perubahan status.
