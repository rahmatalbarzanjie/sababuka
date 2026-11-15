BEGIN;

-- Pemetaan indikator Bank Data ke OPD penanggung jawab. Sengaja TIDAK memakai indicator_organizations:
-- tabel itu menentukan indikator mana yang muncul pada formulir pelaporan OPD, sedangkan Bank Data
-- hanya dibaca dan dianalisis (tidak diisi OPD).
CREATE TABLE IF NOT EXISTS sababuka.indicator_responsible_opd (
    indicator_id    uuid NOT NULL REFERENCES sababuka.indicators(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES sababuka.organizations(id),
    is_primary      boolean NOT NULL DEFAULT false,
    basis           varchar(24) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (indicator_id, organization_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS indicator_responsible_opd_one_primary_idx
    ON sababuka.indicator_responsible_opd (indicator_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS indicator_responsible_opd_org_idx ON sababuka.indicator_responsible_opd (organization_id);

-- Menetapkan OPD penanggung jawab bagi indikator Bank Data yang belum punya (idempoten).
-- Urutan: pemilik tabel Satu Data > kata kunci nama indikator > subjek/kategori > BAPPERIDA.
CREATE OR REPLACE FUNCTION sababuka.assign_responsible_opd() RETURNS integer
LANGUAGE plpgsql AS $fn$
DECLARE
    inserted integer;
BEGIN
    WITH keyword_rules(priority, pattern, org_code) AS (VALUES
        (10, 'ikan|perikanan|budidaya|tangkap|nelayan|keramba|kolam|tambak', 'DKPP'),
        (11, 'hutan|kehutanan|pencemaran|sampah|limbah|lingkungan', 'DLHK'),
        (12, 'padi|jagung|palawija|sawah|ladang|perkebunan|kelapa sawit|karet|hortikultura|sayur|buah|ternak|sapi|kerbau|kambing|ayam|itik|tanaman|panen|pupuk|lahan pertanian', 'DISTAN'),
        (13, 'pangan|beras|ketahanan pangan', 'DKPP'),
        (20, 'sekolah|murid|siswa|guru|pendidikan|madrasah|paud|kuliah|putus sekolah|melek huruf|angka partisipasi', 'DISDIK'),
        (21, 'puskesmas|rumah sakit|dokter|bidan|perawat|penyakit|imunisasi|gizi|balita|stunting|kesehatan|posyandu|persalinan|ibu hamil|kasus|angka harapan hidup|kematian bayi|kematian ibu', 'DINKES'),
        (22, 'penduduk|kelahiran|kematian|migrasi|rasio jenis kelamin|kepadatan|akta|kartu keluarga|agama', 'DUKCAPIL'),
        (23, 'angkatan kerja|pengangguran|upah|tenaga kerja|pencari kerja|pekerja|ketenagakerjaan|transmigrasi', 'DISNAKERTRANS'),
        (24, 'miskin|kemiskinan|garis kemiskinan|kerentanan|bantuan sosial|disabilitas|penyandang|panti|lansia terlantar|kesejahteraan sosial', 'DINSOS'),
        (25, 'jalan|jembatan|irigasi|air minum|air bersih|drainase|tata ruang|listrik|energi|bbm|bahan bakar', 'DPUPR'),
        (26, 'perumahan|rumah tidak layak|rumah layak|permukiman|pertanahan|sanitasi', 'DISPERKIMTAN'),
        (27, 'kendaraan|angkutan|transportasi|kapal|dermaga|terminal|lalu lintas|armada|pelayaran|penerbangan', 'DISHUB'),
        (28, 'wisata|wisatawan|hotel|akomodasi|pariwisata|kebudayaan|budaya|olahraga|pemuda|restoran|rumah makan', 'DISBUDPARPORA'),
        (29, 'perdagangan|industri|ukm|umkm|koperasi|pasar|harga|inflasi|usaha mikro|usaha kecil', 'DISPERINDAGKOPUKM'),
        (30, 'investasi|perizinan|penanaman modal', 'DPMPTSP'),
        (31, 'pdrb|produk domestik|pertumbuhan ekonomi|struktur ekonomi|pendapatan per kapita', 'BAPPERIDA'),
        (32, 'apbd|belanja daerah|pendapatan daerah|pajak|retribusi|anggaran|keuangan daerah|aset daerah', 'BKAD'),
        (33, 'bencana|banjir|longsor|angin puting|korban', 'BPBD'),
        (34, 'kebakaran|damkar|pemadam', 'DAMKAR'),
        (35, 'desa|kelurahan|kepala desa|perangkat desa|lembaga masyarakat', 'DPMD'),
        (36, 'perempuan|anak |keluarga berencana|akseptor|kb |gender|perlindungan anak', 'DP3APPKB'),
        (37, 'internet|telepon|seluler|sinyal|pos |komunikasi|informasi|statistik|wifi|website', 'DISKOMINFOSANTIK'),
        (38, 'perpustakaan|arsip|kearsipan', 'DISARPUS'),
        (39, 'politik|pemilu|partai|ormas|organisasi kemasyarakatan|kerukunan', 'BAKESBANGPOL'),
        (40, 'kriminal|pidana|perdata|ketertiban|linmas|poskamling|pelanggaran|satpol', 'SATPOLPP'),
        (41, 'pegawai|asn|pns|kepegawaian|aparatur', 'BKPSDM')
    ),
    category_rules(priority, prefix, org_code) AS (VALUES
        (60, 'BANK_DATA_PERTANIAN%', 'DISTAN'),
        (60, 'BANK_DATA_PENDIDIKAN%', 'DISDIK'),
        (60, 'BANK_DATA_TENAGA_KERJA%', 'DISNAKERTRANS'),
        (60, 'BANK_DATA_BIAYA_TENAGA_KERJA%', 'DISNAKERTRANS'),
        (60, 'BANK_DATA_KEPENDUDUKAN%', 'DUKCAPIL'),
        (60, 'BANK_DATA_KEUANGAN%', 'BKAD'),
        (60, 'BANK_DATA_KONDISI_TEMPAT_TINGGAL%', 'DINSOS'),
        (60, 'BANK_DATA_ENERGI%', 'DPUPR'),
        (60, 'BANK_DATA_HUKUM%', 'SATPOLPP'),
        (60, 'BANK_DATA_LINGKUNGAN%', 'DLHK'),
        (60, 'BANK_DATA_TRANSPORTASI%', 'DISHUB'),
        (60, 'BANK_DATA_KESEHATAN%', 'DINKES'),
        (60, 'BANK_DATA_GENDER%', 'DP3APPKB'),
        (60, 'BANK_DATA_MASYARAKAT_INFORMASI%', 'DISKOMINFOSANTIK'),
        (60, 'BANK_DATA_AKTIVITAS_POLITIK%', 'BAKESBANGPOL'),
        (60, 'BANK_DATA_PERTAMBANGAN%', 'DISPERINDAGKOPUKM'),
        (60, 'BANK_DATA_STATISTIK_BISNIS%', 'DISPERINDAGKOPUKM'),
        (60, 'BANK_DATA_KONSUMSI%', 'BAPPERIDA'),
        (60, 'BANK_DATA_PERBANKAN%', 'BAPPERIDA'),
        (60, 'BANK_DATA_STATISTIK_REGIONAL%', 'BAPPERIDA')
    ),
    targets AS (
        SELECT i.id, i.name, c.code AS category_code, i.owner_organization_id
        FROM sababuka.indicators i
        JOIN sababuka.categories c ON c.id = i.category_id
        WHERE i.origin_type = 'bank_data'
          AND NOT EXISTS (SELECT 1 FROM sababuka.indicator_responsible_opd r WHERE r.indicator_id = i.id)
    ),
    matches AS (
        SELECT t.id, o.code AS org_code, 1 AS priority, 'pemilik_data'::text AS basis
        FROM targets t JOIN sababuka.organizations o ON o.id = t.owner_organization_id
        WHERE t.category_code LIKE 'BANK_DATA_SD_%' AND o.code NOT IN ('KAPUAS', 'BPS_KAPUAS')
        UNION ALL
        SELECT t.id, k.org_code, k.priority, 'kata_kunci' FROM targets t JOIN keyword_rules k ON lower(t.name) ~ k.pattern
        UNION ALL
        SELECT t.id, c.org_code, c.priority, 'subjek' FROM targets t JOIN category_rules c ON t.category_code LIKE c.prefix
        UNION ALL
        SELECT t.id, 'BAPPERIDA', 999, 'bawaan' FROM targets t
    ),
    best AS (
        SELECT DISTINCT ON (id, org_code) id, org_code, priority, basis
        FROM matches ORDER BY id, org_code, priority
    ),
    ranked AS (
        SELECT id, org_code, basis, row_number() OVER (PARTITION BY id ORDER BY priority, org_code) AS rn FROM best
        WHERE basis <> 'bawaan' OR NOT EXISTS (SELECT 1 FROM best other WHERE other.id = best.id AND other.basis <> 'bawaan')
    )
    INSERT INTO sababuka.indicator_responsible_opd (indicator_id, organization_id, is_primary, basis)
    SELECT r.id, o.id, r.rn = 1, r.basis
    FROM ranked r JOIN sababuka.organizations o ON o.code = r.org_code
    WHERE r.rn <= 2
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    RETURN inserted;
END
$fn$;

SELECT sababuka.assign_responsible_opd();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('066', 'indicator responsible OPD mapping for Bank Data')
ON CONFLICT (version) DO NOTHING;

COMMIT;
