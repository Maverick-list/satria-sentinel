# SATRIA SENTINEL — Project Overview
**Sistem Informasi Keamanan Pertahanan Siber & Manajemen Respons Insiden**  
**Kompetisi**: Kartika Cyber Hackathon 2026 — Kategori: Penangkalan (Cyber Defense)  
**Status**: Prototype Siap Uji & Terverifikasi Penuh

---

## 1. Latar Belakang & Urgensi

Di era peperangan asimetris dan ancaman siber hibrida modern, infrastruktur digital militer dan pemerintahan menghadapi eskalasi serangan siber yang terkoordinasi dan persisten. Pusat Operasi Keamanan (Security Operations Center / SOC) militer sering kali terbebani oleh:
- **Volume Log yang Masif**: Jutaan baris log dari firewall, sistem operasi, gateway identitas, dan server komando mengalir setiap hari.
- **Alert Fatigue**: Kebisingan alarm palsu (*false positives*) yang menutupi indikasi ancaman sebenarnya.
- **Ketiadaan Konteks Aset**: Alarm keamanan kerap tidak memperhitungkan tingkat kritikalitas aset yang diserang, menyebabkan keterlambatan penanganan pada aset strategis.
- **Waktu Respons yang Lambat**: Analis keamanan membutuhkan waktu lama untuk menghubungkan kejadian (*correlation*), menghitung dampak risiko, dan memilih prosedur penanganan (SOP).

**SATRIA SENTINEL** (*Security Asset & Threat Response Intelligence Assistant*) hadir sebagai platform pertahanan siber terpadu yang dirancang khusus untuk memecahkan tantangan tersebut dengan pendekatan **deterministik, terukur, transparan (*explainable*), dan siap guna**.

---

## 2. Solusi yang Ditawarkan

SATRIA SENTINEL mentransformasi data telemetri mentah menjadi intelijen pertahanan yang dapat segera ditindaklanjuti (*actionable defense intelligence*) melalui empat pilar utama:

1. **Pemetaan Aset Berbasis Kritikalitas**: Mengelola inventaris aset digital strategis dengan pembobotan risiko berbasis signifikansi operasional.
2. **Mesin Deteksi Deterministik**: Menganalisis log keamanan secara real-time terhadap 6 aturan deteksi berbasis taktik, teknik, dan prosedur (TTP) standar militer dan industri.
3. **Korelasi Multidimensi & Penilaian Risiko 5-Faktor**: Mengelompokkan kejadian terkait dan menghitung skor risiko komprehensif ($0 - 100$) yang transparan tanpa *black-box*.
4. **Siklus Hidup Insiden & Playbook Terpandu**: Menyediakan alur kerja investigasi lengkap ($\text{open} \to \text{investigating} \to \text{contained} \to \text{closed}$) dengan rekomendasi Standard Operating Procedure (SOP) NIST SP 800-61 yang terstandarisasi.

---

## 3. Cakupan Proyek & Pengguna Sasaran

### Pengguna Sasaran (Target Audience)
- **Komandan SOC / CISO Pertahanan**: Memantau postur keamanan global, efektivitas penangkalan ancaman, dan kepatuhan audit.
- **Senior Security Analyst (Tier 2/3)**: Menganalisis klaster anomali, melakukan eskalasi insiden, menetapkan containment, dan menganalisis akar masalah (*root cause*).
- **Junior Operator / SOC Tier 1**: Memantau antrean kejadian prioritas, memverifikasi alarm, dan menjalankan langkah respons awal sesuai playbook.
- **Auditor Keamanan & Kepatuhan**: Memverifikasi rekaman audit yang tidak dapat diubah (*immutable audit trail*) untuk investigasi forensik pasca-kejadian.

### Batasan Ruang Lingkup
- **Kategori**: Penangkalan (Defensif). Platform ini **bukan** alat penyerangan (*offensive tooling*) dan tidak melakukan exploitasi aktif.
- **Integritas Data**: Menggunakan 100% data simulasi sintetis (*synthetic security data*) yang diberi label jelas. Tidak ada data rahasia atau operasional militer nyata yang digunakan.

---

## 4. Perbedaan Fitur Terimplementasi vs Rencana Masa Depan

| Modul / Kemampuan | Status Saat Ini (Implemented Prototype) | Rencana Pengembangan (Roadmap) |
| :--- | :--- | :--- |
| **Autentikasi & RBAC** | JWT HS256, hashing scrypt RFC 7914, role `admin`, `security_analyst`, `viewer`. | Integrasi SSO SAML 2.0 / CAC / PIV militer dan MFA FIDO2. |
| **Pencatatan Audit** | Append-only audit trail di tingkat API dan database relational. | Streaming audit log ke storage WORM (Write Once Read Many) terdistribusi. |
| **Ingestion Log** | Parser CSV & JSON dengan deduplikasi SHA-256 dan sanitasi payload. | Konektor Kafka / Syslog RFC 5424 streaming real-time berkecepatan tinggi. |
| **Mesin Deteksi** | 6 aturan deterministik (Brute Force, Anomali Jam, PrivEsc, dsb.). | Mesin penulisan aturan dinamis via Sigma / YARA-L rule compiler. |
| **Korelasi & Risiko** | Multi-factor correlation window & formula risiko 5-faktor (0-100). | Graph-based correlation engine & korelasi lintas domain berbasis MITRE ATT&CK. |
| **Response Playbook** | 5 playbook advisory terstandarisasi NIST SP 800-61 dengan checklist CLI. | Integrasi orkestrasi otomatis SOAR dengan otorisasi ganda (Dual-Analyst Approval). |
