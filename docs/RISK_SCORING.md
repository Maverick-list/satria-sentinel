# SATRIA SENTINEL — Risk Scoring Methodology

## 1. Tujuan & Batasan Klaim

**Risk Scoring Engine** pada SATRIA SENTINEL dirancang untuk menghasilkan **indeks prioritas operasional terukur dalam skala `0–100`** guna membantu analis SOC mengurutkan fokus investigasi.

> **Catatan Metodologis Penting**: Skor risiko (`risk_score`) adalah **indeks komposit deterministik berbobot**, **bukan** probabilitas statistik terjadinya serangan siber dan **bukan** prediksi berbasis model stokastik/aktuaria.

Implementasi kode sumber: [`backend/app/services/risk_engine.py`](../backend/app/services/risk_engine.py).

---

## 2. Formula Perhitungan Skor Risiko (`0–100`)

Skor total dihitung menggunakan penjumlahan 5 komponen faktor yang dibatasi pada rentang `[0.0, 100.0]`:

$$\text{Risk Score} = \min\left(100,\ \max\left(0,\ S_{\text{severity}} + S_{\text{criticality}} + S_{\text{confidence}} + S_{\text{correlation}} + S_{\text{context}}\right)\right)$$

### Rincian Bobot Faktor

| Komponen Faktor | Bobot Maksimum | Nilai Input & Aturan Perhitungan |
| :--- | :--- | :--- |
| **1. Event Severity (`event_severity`)** | **35 poin** | `low = 8.0`, `medium = 18.0`, `high = 28.0`, `critical = 35.0` |
| **2. Asset Criticality (`asset_criticality`)** | **25 poin** | `low = 5.0`, `medium = 12.0`, `high = 19.0`, `critical = 25.0` (jika kejadian belum terhubung ke aset terdaftar, digunakan nilai dasar konservatif `8.0`) |
| **3. Detection Rule Confidence (`rule_confidence`)** | **20 poin** | $\text{Confidence} \in [0.0, 1.0] \times 20.0$. Mengukur tingkat kepastian kondisi aturan deterministik yang cocok. |
| **4. Correlated Event Volume (`correlated_event_volume`)** | **10 poin** | $\min(10.0,\ (\text{correlated\_count} - 1) \times 2.5)$. Memberikan bobot tambahan apabila kejadian merupakan bagian dari rangkaian kejadian berkorelasi. |
| **5. Operational & Temporal Context (`operational_context`)** | **10 poin** | Penjumlahan indikator kontekstual hingga maksimum `10.0` poin:<br>- Lingkungan aset `production`: `+4.0`<br>- Indikator aktivitas di luar jam kerja (`off_hours`): `+3.0`<br>- Keterlibatan hak akses istimewa (`privilege_indicator`): `+3.0`<br>- Aset `staging`: `+2.0` |

---

## 3. Kategori Tingkat Risiko (*Risk Level Thresholds*)

| Risk Level | Rentang Skor (`0–100`) | Panduan Prioritas Operasional SOC |
| :--- | :--- | :--- |
| **`LOW`** | `0.00 – 29.99` | Kejadian informasi atau anomali minor pada aset berisiko rendah; ditinjau pada pemantauan rutin. |
| **`MEDIUM`** | `30.00 – 54.99` | Indikasi aktivitas mencurigakan tunggal atau pada aset non-kritis; memerlukan verifikasi analis. |
| **`HIGH`** | `55.00 – 79.99` | Indikasi ancaman signifikan atau melibatkan aset penting/korelasional; prioritaskan investigasi dan penerapan *playbook* defensif. |
| **`CRITICAL`** | `80.00 – 100.00` | Indikasi ancaman berkepercayaan tinggi pada aset kritikal/produksi atau eskalasi multi-tahap; memerlukan pembuatan insiden segera dan tindakan *containment* terarah. |

---

## 4. Transparansi Penjelasan (*Explainable Risk Breakdown*)

Setiap respons dari perhitungan risiko (`RiskBreakdown` dan `SecurityEventOut.risk_explanation`) menyertakan:
1. Nilai numerik setiap faktor (`factors.event_severity`, `factors.asset_criticality`, `factors.rule_confidence`, `factors.correlated_event_volume`, `factors.operational_context`).
2. Kalimat penjelasan terstruktur yang merinci kontribusi masing-masing faktor sehingga analis dapat memverifikasi perhitungan secara manual.
