# SATRIA SENTINEL — Explainable 5-Factor Risk Scoring Methodology
**Modul**: `backend/app/services/risk_service.py`  
**Rentang Skor**: $0 \text{ hingga } 100$ (Integer)  
**Karakteristik**: Deterministik, Transparan (*Explainable*), Bebas Halusinasi

---

## 1. Filosofi & Kebutuhan Penilaian Risiko

Dalam operasi pertahanan siber pertahanan militer, skor risiko tidak boleh berupa angka acak atau hasil *black-box* AI yang tidak dapat dipertanggungjawabkan dalam pengadilan militer atau sidang evaluasi komando. 

SATRIA SENTINEL mengimplementasikan **Formula Penilaian Risiko 5-Faktor** yang terbukti secara matematis, dapat diaudit, dan memberikan transparansi penuh mengenai kontribusi masing-masing faktor bobot.

---

## 2. Rincian 5 Faktor Pembobotan

$$ \text{Raw Score} = W_{\text{severity}} + W_{\text{asset}} + W_{\text{confidence}} + W_{\text{volume}} + W_{\text{correlation}} $$
$$ \text{Final Risk Score} = \min(100, \max(0, \text{Raw Score})) $$

### Faktor 1: Event Severity Weight ($W_{\text{severity}} \in [10, 40]$)
Mengukur potensi bahaya intrinsik dari tipe ancaman yang terdeteksi:
- **Low Severity**: $10 \text{ poin}$
- **Medium Severity**: $20 \text{ poin}$
- **High Severity**: $30 \text{ poin}$
- **Critical Severity**: $40 \text{ poin}$

### Faktor 2: Asset Criticality Weight ($W_{\text{asset}} \in [5, 25]$)
Mengukur signifikansi operasional aset yang menjadi sasaran serangan:
- **Low Criticality** (misal: Workstation pengujian non-operasional): $5 \text{ poin}$
- **Medium Criticality** (misal: Server internal berkas non-kritis): $10 \text{ poin}$
- **High Criticality** (misal: Identity Gateway / SSO Server): $18 \text{ poin}$
- **Critical Asset** (misal: Server Komando & Pengendali KRI-01): $25 \text{ poin}$

### Faktor 3: Detection Confidence Weight ($W_{\text{confidence}} \in [0, 15]$)
Mengukur tingkat kepastian algoritma deteksi terhadap indikasi ancaman:
$$ W_{\text{confidence}} = \text{round}(\text{confidence\_float} \times 15) $$
- Deteksi heuristik anomali jam (Confidence 0.75): $11 \text{ poin}$
- Deteksi pola brute force deterministik (Confidence 0.90): $14 \text{ poin}$
- Deteksi perintah berbahaya persis (Confidence 0.95): $14 - 15 \text{ poin}$

### Faktor 4: Event Frequency & Volume Weight ($W_{\text{volume}} \in [2, 10]$)
Mengukur frekuensi kejadian dalam jendela analisis untuk membedakan anomali insidental dari serangan persisten:
- Kejadian tunggal ($1\times$): $2 \text{ poin}$
- Kejadian minor ($2 - 4\times$): $5 \text{ poin}$
- Kejadian berulang ($5 - 9\times$): $8 \text{ poin}$
- Serangan masif ($\ge 10\times$): $10 \text{ poin}$

### Faktor 5: Correlation Scope Weight ($W_{\text{correlation}} \in [0, 10]$)
Mengukur apakah kejadian tersebut berdiri sendiri atau merupakan bagian dari serangan terkoordinasi lintas vektor:
- Kejadian terisolasi tunggal: $0 \text{ poin}$
- Klaster 2 hingga 4 event terkait: $5 \text{ poin}$
- Klaster multivariat lintas aset ($\ge 5$ event atau multi-taktik): $10 \text{ poin}$

---

## 3. Klasifikasi Level Risiko

| Rentang Skor ($0-100$) | Level Risiko | Deskripsi Operasional | Kebijakan Tindakan SOC |
| :---: | :---: | :--- | :--- |
| **$0 - 39$** | **LOW** | Anomali kecil tanpa indikasi bahaya langsung. | Pemantauan rutin; tidak memerlukan eskalasi darurat. |
| **$40 - 69$** | **MEDIUM** | Aktivitas mencurigakan pada aset biasa. | Peninjauan terencana oleh analis Tier 1 dalam 4 jam kerja. |
| **$70 - 84$** | **HIGH** | Serangan terkonfirmasi pada aset bernilai tinggi. | Eskalasi segera ke Analis Senior; isolasi dalam 30 menit. |
| **$85 - 100$** | **CRITICAL** | Ancaman eksfiltrasi atau pengambilalihan aset strategis komando. | Respons darurat instan; eksekusi SOP kontainmen dan notifikasi komando. |

---

## 4. Contoh Perhitungan Nyata

### Skenario: Serangan Brute Force pada Server Komando KRI-01
- **Severity**: `high` $\implies W_{\text{severity}} = 30$
- **Asset**: KRI-01 Command Server (`critical`) $\implies W_{\text{asset}} = 25$
- **Confidence**: Deterministic rule match ($0.90$) $\implies W_{\text{confidence}} = \text{round}(0.90 \times 15) = 14$
- **Volume**: 12 kali gagal login $\implies W_{\text{volume}} = 10$
- **Correlation**: Terkait dengan percobaan port scanning sebelumnya $\implies W_{\text{correlation}} = 5$

$$ \text{Total Skor Mentah} = 30 + 25 + 14 + 10 + 5 = 84 $$
$$ \text{Hasil Akhir} = 84 \implies \textbf{HIGH RISK (Level 3 / Prioritas Tinggi)} $$

Penjelasan ini disajikan secara transparan di panel antarmuka dasbor sehingga analis dapat memvalidasi setiap komponen angka risiko.
