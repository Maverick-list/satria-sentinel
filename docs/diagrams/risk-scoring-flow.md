# Diagram Alur Penilaian Risiko (Risk Scoring Flow)

Diagram alur ini mendeskripsikan formula penilaian risiko matematis 5 faktor ($0 \text{ hingga } 100$) yang transparan dan dapat dijelaskan (*explainable*):

```mermaid
flowchart LR
    subgraph Inputs["Komponen Parameter Input"]
        Sev["Tingkat Severity Event<br/>(Low: 10, Med: 20, High: 30, Crit: 40)"]
        Crit["Kritikalitas Aset Terkait<br/>(Low: 5, Med: 10, High: 18, Crit: 25)"]
        Conf["Tingkat Confidence Deteksi<br/>(0.1 - 1.0 -> Skala 0 - 15)"]
        Vol["Volume & Frekuensi Kejadian<br/>(1x: 2, 2-4x: 5, 5-9x: 8, >=10x: 10)"]
        Corr["Tingkat Korelasi Multidimensi<br/>(Single: 0, Cluster 2+: 5, Cross-asset: 10)"]
    end

    subgraph Formula["Kalkulasi Agregasi 5-Faktor"]
        SumCalc["Skor Mentah =<br/>Severity (maks 40) +<br/>Asset Criticality (maks 25) +<br/>Confidence (maks 15) +<br/>Volume (maks 10) +<br/>Correlation (maks 10)"]
        ClampCalc["Normalisasi Skor Akhir:<br/>Risk Score = Clamp(Skor Mentah, 0, 100)"]
    end

    subgraph LevelTiers["Klasifikasi Kategori Risiko"]
        L_Low["LOW RISK<br/>(0 - 39)<br/>Monitor rutin"]
        L_Med["MEDIUM RISK<br/>(40 - 69)<br/>Triage terjadwal"]
        L_High["HIGH RISK<br/>(70 - 84)<br/>Eskalasi prioritas"]
        L_Crit["CRITICAL RISK<br/>(85 - 100)<br/>Respons darurat instan"]
    end

    Sev --> SumCalc
    Crit --> SumCalc
    Conf --> SumCalc
    Vol --> SumCalc
    Corr --> SumCalc

    SumCalc --> ClampCalc

    ClampCalc -->|Score < 40| L_Low
    ClampCalc -->|Score 40-69| L_Med
    ClampCalc -->|Score 70-84| L_High
    ClampCalc -->|Score 85-100| L_Crit
```
