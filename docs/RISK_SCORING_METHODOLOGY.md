# SATRIA SENTINEL — Explainable 5-Factor Risk Scoring Methodology
**Modul Sumber**: [`backend/app/services/risk_engine.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/services/risk_engine.py)  
**Rentang Skor**: $0 \text{ hingga } 100$ (Integer)  
**Karakteristik**: Deterministik, Transparan (*Explainable*), Prioritisasi Operasional SOC (Bukan probabilitas statistik)

---

## 1. Filosofi & Batasan Rekayasa

Mesin kalkulasi risiko SATRIA SENTINEL menghitung indeks prioritas triage operasional pada skala 0–100 untuk memandu analis SOC menentukan urutan penanganan ancaman. 

> [!NOTE]
> Skor ini dirancang sebagai indeks prioritas deterministik berbasis aturan dan konteks aset, **bukan** estimasi probabilitas statistik kompromi sistem dan **bukan** algoritma kecerdasan buatan *black-box*.

---

## 2. Formula Matematis Penilaian Risiko (5 Faktor)

Formula kalkulasi skor risiko dihitung secara aditif dari 5 komponen faktor berbobot:

$$ \text{Raw Score} = W_{\text{severity}} + W_{\text{asset}} + W_{\text{confidence}} + W_{\text{volume}} + W_{\text{context}} $$
$$ \text{Final Risk Score} = \min(100, \max(0, \text{Raw Score})) $$

### Faktor 1: Event Severity ($W_{\text{severity}} \in [5, 35]$)
Mencerminkan tingkat bahaya intrinsik dari tipe event keamanan yang terdeteksi:
- **`critical`**: $35 \text{ poin}$
- **`high`**: $28 \text{ poin}$
- **`medium`**: $20 \text{ poin}$
- **`low`**: $12 \text{ poin}$
- **`informational`**: $5 \text{ poin}$

### Faktor 2: Asset Criticality ($W_{\text{asset}} \in [6, 25]$)
Mencerminkan dampak terhadap kelangsungan operasional sistem jika aset terkait terkompromi:
- **`critical`** (misal: Server Komando KRI-01): $25 \text{ poin}$
- **`high`** (misal: Identity Gateway / SSO Gateway): $19 \text{ poin}$
- **`medium`** (misal: Server aplikasi dan database internal): $12 \text{ poin}$
- **`low`** (misal: Workstation pengujian): $6 \text{ poin}$
- **`unlinked`** (Event tanpa aset terasosiasi / fallback): $8 \text{ poin}$

### Faktor 3: Detection Rule Confidence ($W_{\text{confidence}} \in [0, 20]$)
Mencerminkan derajat kepastian aturan deteksi deterministik:
$$ W_{\text{confidence}} = \min(20, \text{round}(\text{max\_confidence} \times 20.0)) $$
- Contoh confidence $0.92$ (Privilege Escalation): $\text{round}(0.92 \times 20) = 18 \text{ poin}$
- Contoh confidence $0.88$ (Brute Force): $\text{round}(0.88 \times 20) = 18 \text{ poin}$
- Contoh confidence $0.80$ (Unusual Access): $\text{round}(0.80 \times 20) = 16 \text{ poin}$
- Jika belum ada aturan yang terpicu: $0 \text{ poin}$

### Faktor 4: Correlated Event Volume ($W_{\text{volume}} \in [0, 10]$)
Mengukur kuantitas event keamanan yang teragregasi dalam klaster korelasi:
- $\ge 5 \text{ event}$ terkait: $10 \text{ poin}$
- $\ge 3 \text{ event}$ terkait: $7 \text{ poin}$
- $2 \text{ event}$ terkait: $4 \text{ poin}$
- $1 \text{ event}$ (tunggal): $0 \text{ poin}$

### Faktor 5: Operational & Temporal Context ($W_{\text{context}} \in [0, 10]$)
Mengakomodasi faktor kontekstual tambahan yang memperberat risiko:
- **Lingkungan Produksi** (`is_production == True`): $+4 \text{ poin}$
- **Aktivitas Terkini** (Stempel waktu $\le 24 \text{ jam}$ dari sekarang): $+3 \text{ poin}$
- **Multi-Rule / Multi-Tactic** ($\ge 2$ aturan atau taktik berbeda dalam klaster): $+3 \text{ poin}$
- Batas atas faktor konteks: $\min(10, \text{total context points})$

---

## 3. Klasifikasi Level Risiko (*Canonical Risk Levels*)

Hasil skor akhir ($0 - 100$) diklasifikasikan ke dalam 4 kategori kanonikal:

| Rentang Skor | Level Risiko | Rekomendasi Tindakan Operasional SOC |
| :---: | :---: | :--- |
| **$80 - 100$** | **CRITICAL** | Ancaman mendesak pada aset kritis produksi; aktivasi kontainmen darurat. |
| **$55 - 79$** | **HIGH** | Aktivitas ancaman terkonfirmasi berprioritas tinggi; investigasi dalam 30 menit. |
| **$30 - 54$** | **MEDIUM** | Anomali terindikasi; evaluasi terencana oleh analis dalam antrean kerja. |
| **$0 - 29$** | **LOW** | Anomali minor / informational; pemantauan telemetri rutin. |

---

## 4. Contoh Perhitungan Nyata Berdasarkan Kode Sumber

### Skenario: Eksfiltrasi Egress Egress pada Server Komando KRI-01
- **Severity**: `critical` $\implies W_{\text{severity}} = 35$
- **Asset**: KRI-01 (`critical`, `production`) $\implies W_{\text{asset}} = 25$
- **Rule**: `SATRIA-RULE-EXFIL-005` (Confidence $0.90$) $\implies W_{\text{confidence}} = \text{round}(0.90 \times 20) = 18$
- **Volume**: 6 event egress berkorelasi $\implies W_{\text{volume}} = 10$
- **Context**: Produksi (+4), terjadi dalam 24 jam (+3) $\implies W_{\text{context}} = 7$

$$ \text{Total Skor} = 35 + 25 + 18 + 10 + 7 = 95 $$
$$ \text{Skor Akhir} = 95 \implies \textbf{CRITICAL RISK} $$

Setiap komponen angka ini diekspos dalam objek `risk_breakdown` sehingga analis dapat memverifikasi rasionalitas penilaian secara transparan di antarmuka sistem.
