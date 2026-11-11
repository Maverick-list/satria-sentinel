# SATRIA SENTINEL — Database Design & Schema Specification
**Status**: PostgreSQL 16 Alpine / SQLAlchemy 2.0 / Alembic

Dokumen ini mendokumentasikan spesifikasi teknis lengkap dari 7 entitas database relasional yang digunakan oleh platform SATRIA SENTINEL.

---

## 1. Ringkasan Entitas & Relasi

| Nama Tabel | Entitas ORM | Peran & Deskripsi Fungsional | Kunci Primer | Kunci Asing (FK) |
| :--- | :--- | :--- | :---: | :--- |
| `users` | `User` | Pengguna sistem, operator SOC, dan kredensial ter-hash | `id` (UUID) | Tidak ada |
| `assets` | `Asset` | Inventaris aset digital strategis yang dipantau | `id` (UUID) | Tidak ada |
| `security_events` | `SecurityEvent` | Log kejadian keamanan mentah & hasil deteksi | `id` (UUID) | `asset_id` $\to$ `assets.id` |
| `incidents` | `Incident` | Tiket insiden keamanan hasil eskalasi atau korelasi | `id` (UUID) | `assigned_to_id` $\to$ `users.id`, `playbook_id` $\to$ `response_playbooks.id` |
| `incident_events` | `IncidentEvent` | Tabel asosiasi Many-to-Many antara Insiden dan Event | `id` (UUID) | `incident_id` $\to$ `incidents.id`, `security_event_id` $\to$ `security_events.id` |
| `response_playbooks`| `ResponsePlaybook`| Standar Operasional Prosedur (SOP) respons terpandu | `id` (UUID) | Tidak ada |
| `audit_logs` | `AuditLog` | Catatan jejak audit yang tidak dapat diubah (append-only) | `id` (UUID) | `actor_user_id` $\to$ `users.id` |

---

## 2. Rincian Skema Tabel

### 2.1 Tabel `users`
Menyimpan akun operator sistem dengan kontrol akses berbasis peran (RBAC).

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik pengguna |
| `username` | `VARCHAR(64)` | No | Unique, Indexed | Nama pengguna untuk login |
| `email` | `VARCHAR(255)`| No | Unique, Indexed | Alamat email resmi pengguna |
| `full_name` | `VARCHAR(255)`| Yes | `None` | Nama lengkap dan gelar operator |
| `role` | `VARCHAR(32)` | No | `'viewer'`, Indexed | Peran RBAC: `admin`, `security_analyst`, `viewer` |
| `password_hash` | `VARCHAR(255)`| No | - | Hash kata sandi memory-hard RFC 7914 scrypt |
| `is_active` | `BOOLEAN` | No | `True` | Status keaktifan akun pengguna |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Waktu pembuatan akun |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Waktu pembaruan profil terakhir |

### 2.2 Tabel `assets`
Menyimpan inventaris aset digital strategis yang dilindungi.

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik aset |
| `asset_tag` | `VARCHAR(64)` | No | Unique, Indexed | Kode inventaris unik (misal: `AST-KRI-001`) |
| `name` | `VARCHAR(255)`| No | Indexed | Nama sistem/perangkat (misal: `Command C2 Server`) |
| `hostname` | `VARCHAR(255)`| Yes | Indexed | Fully Qualified Domain Name (FQDN) |
| `ip_address` | `VARCHAR(64)` | Yes | Indexed | Alamat IPv4 atau IPv6 internal/eksternal |
| `asset_type` | `VARCHAR(32)` | No | Indexed | Tipe aset: `server`, `network`, `database`, dll. |
| `criticality` | `VARCHAR(32)` | No | `'medium'`, Indexed | Bobot kritikalitas: `critical`, `high`, `medium`, `low` |
| `environment` | `VARCHAR(32)` | No | `'production'` | Lingkungan: `production`, `staging`, `isolated` |
| `location` | `VARCHAR(128)`| Yes | `None` | Lokasi fisik atau zona pertahanan |
| `owner` | `VARCHAR(128)`| Yes | `None` | Unit penanggung jawab teknis |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Waktu registrasi aset |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Waktu pembaruan data aset |

### 2.3 Tabel `security_events`
Menampung catatan telemetri kejadian keamanan yang masuk melalui pipeline ingesti.

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik record kejadian |
| `event_id` | `VARCHAR(64)` | No | Unique, Indexed | SHA-256 fingerprint event untuk deduplikasi |
| `source` | `VARCHAR(64)` | No | Indexed | Sumber log (misal: `auth.log`, `syslog`, `suricata`) |
| `event_type` | `VARCHAR(64)` | No | Indexed | Tipe kejadian: `login_failed`, `port_scan`, dll. |
| `severity` | `VARCHAR(32)` | No | `'info'`, Indexed | Tingkat keparahan: `low`, `medium`, `high`, `critical` |
| `risk_score` | `INTEGER` | No | `0`, Indexed | Skor risiko terhitung ($0 - 100$) |
| `asset_id` | `UUID` | Yes | FK `assets.id` | Referensi aset digital yang terdampak |
| `source_ip` | `VARCHAR(64)` | Yes | Indexed | Alamat IP pemrakarsa kejadian |
| `destination_ip`| `VARCHAR(64)`| Yes | Indexed | Alamat IP target |
| `username` | `VARCHAR(64)` | Yes | Indexed | Identitas akun yang terlibat |
| `raw_payload` | `TEXT` | Yes | `None` | Baris log mentah yang telah disanitasi |
| `metadata_json`| `JSONB` | No | `'{}'::jsonb` | Metadata tambahan terstruktur |
| `status` | `VARCHAR(32)` | No | `'new'`, Indexed | Status: `new`, `triaged`, `linked`, `archived` |
| `is_synthetic` | `BOOLEAN` | No | `True`, Indexed | Label identifikasi data simulasi sintetis |
| `timestamp` | `TIMESTAMPTZ` | No | Indexed | Waktu aktual kejadian terjadi |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Waktu penyimpanan record ke database |

### 2.4 Tabel `incidents`
Menyimpan insiden keamanan yang dieskalasi dan dikelola sepanjang siklus hidup penanganan.

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik tiket insiden |
| `incident_number`| `VARCHAR(64)`| No | Unique, Indexed | Nomor tiket formal (misal: `INC-20261112-AB12`) |
| `title` | `VARCHAR(255)`| No | Indexed | Judul ringkas deskripsi insiden |
| `summary` | `TEXT` | Yes | `None` | Narasi komprehensif indikasi ancaman |
| `severity` | `VARCHAR(32)` | No | `'high'`, Indexed | Tingkat keparahan gabungan insiden |
| `status` | `VARCHAR(32)` | No | `'open'`, Indexed | Status siklus: `open`, `investigating`, `contained`, `closed` |
| `risk_score` | `INTEGER` | No | `0` | Skor risiko gabungan insiden ($0 - 100$) |
| `risk_level` | `VARCHAR(32)` | No | `'medium'`, Indexed | Level risiko: `low`, `medium`, `high`, `critical` |
| `risk_breakdown`| `JSONB` | No | `'{}'::jsonb` | Rincian matematis kontribusi 5 faktor risiko |
| `correlation_explanation`| `TEXT`| Yes | `None` | Narasi penjelasan alasan pembentukan klaster |
| `timeline_json`| `JSONB` | No | `'[]'::jsonb` | Riwayat kronologis kronologis investigasi insiden |
| `assigned_to_id`| `UUID` | Yes | FK `users.id` | Analis penanggung jawab investigasi |
| `playbook_id` | `UUID` | Yes | FK `response_playbooks.id` | Rekomendasi SOP respon pertahanan terpilih |
| `root_cause_notes`| `TEXT` | Yes | `None` | Analisis akar masalah (wajib diisi sebelum insiden closed) |
| `detected_at` | `TIMESTAMPTZ` | No | `now()` | Waktu insiden pertama kali terdeteksi |
| `resolved_at` | `TIMESTAMPTZ` | Yes | `None` | Waktu insiden dinyatakan contained / recovered |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Waktu pembuatan tiket |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Waktu pembaruan status tiket |

### 2.5 Tabel `incident_events`
Tabel asosiasi relasi Many-to-Many antara `incidents` dan `security_events`.

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik asosiasi |
| `incident_id` | `UUID` | No | FK `incidents.id` (ON DELETE CASCADE) | Referensi ke insiden terkait |
| `security_event_id`| `UUID`| No | FK `security_events.id` (ON DELETE CASCADE) | Referensi ke security event terkait |
| `correlation_role`| `VARCHAR(64)`| No | `'primary_indicator'` | Peran event: `primary_indicator`, `secondary_evidence` |
| `analyst_notes`| `TEXT` | Yes | `None` | Catatan relevansi event dari analis |
| `linked_at` | `TIMESTAMPTZ` | No | `now()` | Waktu penautan event ke insiden |

### 2.6 Tabel `response_playbooks`
Katalog Standard Operating Procedure (SOP) penanganan insiden yang selaras dengan NIST SP 800-61.

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik playbook |
| `code` | `VARCHAR(32)` | No | Unique, Indexed | Kode SOP resmi (misal: `PB-IR-001`, `PB-IR-002`) |
| `name` | `VARCHAR(255)`| No | Indexed | Judul playbook penanganan |
| `description` | `TEXT` | Yes | `None` | Ruang lingkup dan petunjuk penggunaan |
| `category` | `VARCHAR(64)` | No | Indexed | Kategori ancaman yang ditangani |
| `target_severity`| `VARCHAR(32)`| No | `'high'` | Target keparahan minimum aktivasi playbook |
| `steps_json` | `JSONB` | No | `'[]'::jsonb` | Daftar langkah terstruktur beserta perintah CLI copyable |
| `is_active` | `BOOLEAN` | No | `True` | Status keaktifan SOP |
| `version` | `INTEGER` | No | `1` | Nomor versi SOP |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Waktu pembuatan dokumen SOP |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Waktu revisi SOP |

### 2.7 Tabel `audit_logs`
Tabel jejak audit yang bersifat append-only tanpa endpoint modifikasi atau penghapusan data.

| Kolom | Tipe Data | Nullable | Default / Atribut | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid.uuid4` (PK) | Identifikasi unik rekaman audit |
| `actor_user_id`| `UUID` | Yes | FK `users.id` (ON DELETE SET NULL) | Pengguna yang mengeksekusi aksi |
| `action` | `VARCHAR(64)` | No | Indexed | Kode aksi (misal: `auth.login_success`, `incident.resolved`) |
| `entity_type` | `VARCHAR(64)` | Yes | Indexed | Tipe objek yang dimanipulasi (`Incident`, `Asset`, dll.) |
| `entity_id` | `VARCHAR(64)` | Yes | Indexed | ID objek yang dimanipulasi |
| `details` | `JSONB` | No | `'{}'::jsonb` | Detail perubahan state (tanpa token/password) |
| `ip_address` | `VARCHAR(64)` | Yes | `None` | Alamat IP pemrakarsa permintaan HTTP |
| `user_agent` | `TEXT` | Yes | `None` | Client User-Agent string |
| `created_at` | `TIMESTAMPTZ` | No | `now()`, Indexed | Waktu pencatatan audit yang akurat |
