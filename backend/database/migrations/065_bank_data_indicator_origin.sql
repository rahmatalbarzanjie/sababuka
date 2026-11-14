BEGIN;

-- Indikator Bank Data dibuat dari impor massal sumber resmi (BPS/Satu Data) dan diberi label
-- "belum diverifikasi" sampai OPD dan BAPPERIDA merevisinya (keputusan pemilik, 14 Nov 2026).
ALTER TABLE sababuka.indicators DROP CONSTRAINT IF EXISTS indicators_origin_type_check;
ALTER TABLE sababuka.indicators
  ADD CONSTRAINT indicators_origin_type_check CHECK (origin_type IN ('rpjmd_master', 'opd_manual', 'bank_data'));

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('065', 'allow bank_data indicator origin')
ON CONFLICT (version) DO NOTHING;

COMMIT;
