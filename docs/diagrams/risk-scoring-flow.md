# Diagram Alur Penilaian Risiko (Risk Scoring Flow)

Diagram alur ini mendeskripsikan formula penilaian risiko matematis 5 faktor ($0 \text{ hingga } 100$) sesuai implementasi aktual pada [`backend/app/services/risk_engine.py`](file:///home/firza-ilmi/.gemini/antigravity/scratch/satria-sentinel/backend/app/services/risk_engine.py):

```mermaid
flowchart LR
    subgraph Inputs["Komponen Parameter Input 5-Faktor"]
        Sev["1. Event Severity<br/>(Info: 5, Low: 12, Med: 20, High: 28, Crit: 35)"]
        Crit["2. Asset Criticality<br/>(Unlinked: 8, Low: 6, Med: 12, High: 19, Crit: 25)"]
        Conf["3. Rule Confidence<br/>(round(max_confidence * 20) -> maks 20)"]
        Vol["4. Correlated Volume<br/>(1x: 0, 2x: 4, 3-4x: 7, >=5x: 10)"]
        Ctx["5. Operational Context<br/>(Prod: +4, Recent <=24h: +3, Multi-rule: +3 -> maks 10)"]
    end

    subgraph Formula["Kalkulasi Agregasi 5-Faktor"]
        SumCalc["Skor Mentah =<br/>Severity (maks 35) +<br/>Asset Criticality (maks 25) +<br/>Rule Confidence (maks 20) +<br/>Correlated Volume (maks 10) +<br/>Context (maks 10)"]
        ClampCalc["Normalisasi Skor Akhir:<br/>Risk Score = min(100, max(0, Skor Mentah))"]
    end

    subgraph LevelTiers["Klasifikasi Kategori Risiko"]
        L_Low["LOW RISK<br/>(0 - 29)<br/>Monitor telemetri rutin"]
        L_Med["MEDIUM RISK<br/>(30 - 54)<br/>Triage dalam antrean kerja"]
        L_High["HIGH RISK<br/>(55 - 79)<br/>Investigasi prioritas <= 30 menit"]
        L_Crit["CRITICAL RISK<br/>(80 - 100)<br/>Aktivasi kontainmen darurat"]
    end

    Sev --> SumCalc
    Crit --> SumCalc
    Conf --> SumCalc
    Vol --> SumCalc
    Ctx --> SumCalc

    SumCalc --> ClampCalc

    ClampCalc -->|Score 0-29| L_Low
    ClampCalc -->|Score 30-54| L_Med
    ClampCalc -->|Score 55-79| L_High
    ClampCalc -->|Score 80-100| L_Crit
```
