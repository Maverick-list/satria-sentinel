# SATRIA SENTINEL — Project Overview
**Sistem Informasi Keamanan Pertahanan Siber & Manajemen Respons Insiden**  
**Kompetisi**: Kartika Cyber Hackathon 2026 — Kategori: Penangkalan (Cyber Defense)  
**Status**: Prototype Siap Uji & Terverifikasi Penuh

---

## 1. Latar Belakang & Urgensi

Dalam menghadapi lanskap ancaman siber modern yang semakin kompleks, tim pertahanan siber dan pusat komando operasi keamanan (Security Operations Center) menghadapi tantangan operasional yang signifikan:
- **Volume Log yang Masif**: Jutaan baris log dari firewall, sistem operasi, gateway identitas, dan server mengalir setiap hari.
- **Alert Fatigue**: Kebisingan alarm palsu (*false positives*) yang menutupi indikasi ancaman sebenarnya.
- **Ketiadaan Konteks Aset**: Alarm keamanan kerap tidak memperhitungkan tingkat kritikalitas aset yang diserang, menyebabkan keterlambatan penanganan pada aset strategis.
- **Waktu Respons yang Lambat**: Analis keamanan membutuhkan waktu lama untuk menghubungkan kejadian (*correlation*), menghitung dampak risiko, dan memilih prosedur penanganan terstruktur.

**SATRIA SENTINEL** (*Security Asset & Threat Response Intelligence Assistant*) hadir sebagai platform pertahanan siber defensif terpadu yang dirancang khusus untuk memecahkan tantangan tersebut dengan pendekatan **deterministik, terukur, transparan (*explainable*), dan siap guna**.

---

## 2. Solusi yang Ditawarkan

SATRIA SENTINEL mentransformasi data telemetri mentah menjadi intelijen pertahanan yang dapat segera ditindaklanjuti (*actionable defense intelligence*) melalui empat pilar utama:

1. **Pemetaan Aset Berbasis Kritikalitas**: Mengelola inventaris aset digital strategis dengan pembobotan risiko berbasis signifikansi operasional.
2. **Mesin Deteksi Deterministik**: Menganalisis log keamanan secara real-time terhadap 6 aturan deteksi berbasis taktik dan teknik kerangka kerja MITRE ATT&CK.
3. **Korelasi Multidimensi & Penilaian Risiko 5-Faktor**: Mengelompokkan kejadian terkait dan menghitung skor risiko komprehensif ($0 - 100$) yang transparan tanpa *black-box*.
4. **Siklus Hidup Insiden & Playbook Terpandu**: Menyediakan alur kerja investigasi lengkap ($\text{open} \to \text{investigating} \to \text{contained} \to \text{closed}$) dengan rekomendasi panduan respons defensif NIST SP 800-61 yang terstandarisasi.

---

## 3. Cakupan Proyek & Pengguna Sasaran

### Pengguna Sasaran (Target Audience)
- **Komandan SOC / Evaluator Keamanan**: Memantau postur keamanan global, efektivitas penangkalan ancaman, dan kepatuhan audit.
- **Senior Security Analyst (Tier 2/3)**: Menganalisis klaster anomali, melakukan eskalasi insiden, menetapkan containment, dan menganalisis akar masalah (*root cause*).
- **Junior Operator / SOC Tier 1**: Memantau antrean kejadian prioritas, memverifikasi alarm, dan menjalankan langkah respons awal sesuai playbook.
- **Auditor Keamanan & Kepatuhan**: Memverifikasi rekaman audit append-only tingkat aplikasi untuk penelusuran kronologis kejadian.

### Batasan Ruang Lingkup & Posisioning Prototipe
- **Posisioning**: SATRIA SENTINEL adalah **prototipe sistem pertahanan siber defensif untuk keperluan evaluasi kompetisi, simulasi, dan riset**.
- **Tanpa Klaim Militer Resmi**: Platform ini **tidak mengklaim** sertifikasi keamanan militer resmi, penyebaran operasional militer nyata (*real-world deployment*), maupun adopsi SOP militer resmi.
- **Kategori Defensif**: Penangkalan (Defensif). Platform ini **bukan** alat penyerangan (*offensive tooling*) dan tidak melakukan eksploitasi aktif.
- **Integritas Data**: Menggunakan 100% data simulasi sintetis (*synthetic security data*) yang diberi label jelas. Tidak ada data rahasia atau operasional militer nyata yang digunakan.

---

## 4. Perbedaan Fitur Terimplementasi vs Rencana Masa Depan

| Modul / Kemampuan | Status Saat Ini (Implemented Prototype) | Rencana Pengembangan (Roadmap) |
| :--- | :--- | :--- |
| **Autentikasi & RBAC** | JWT HS256, hashing scrypt RFC 7914, role `admin`, `security_analyst`, `viewer`. | Integrasi SSO SAML 2.0 / CAC / PIV dan MFA FIDO2. |
| **Pencatatan Audit** | Application-level append-only audit logging; modifikasi langsung DB tidak dicegah teknis. | Replikasi audit log ke storage WORM (Write Once Read Many) terdistribusi. |
| **Ingestion Log** | Parser CSV & JSON dengan deduplikasi SHA-256 dan sanitasi payload. | Konektor Kafka / Syslog RFC 5424 streaming real-time berkecepatan tinggi. |
| **Mesin Deteksi** | 6 aturan deterministik (Brute Force, Suspicious Login, Unusual Access, PrivEsc, Exfil, Recon). | Mesin penulisan aturan dinamis via Sigma / YARA-L rule compiler. |
| **Korelasi & Risiko** | Multi-factor correlation window & formula risiko 5-faktor (0-100: Sev, Asset, Conf, Vol, Context). | Graph-based correlation engine & korelasi lintas domain berbasis MITRE ATT&CK. |
| **Response Playbook** | 5 playbook advisory terstandarisasi NIST SP 800-61 dengan checklist CLI (Human-in-the-Loop). | Integrasi orkestrasi otomatis SOAR dengan otorisasi ganda (Dual-Analyst Approval). |
