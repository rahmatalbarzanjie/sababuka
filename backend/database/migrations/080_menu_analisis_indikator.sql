BEGIN;

-- Peta kecamatan kini hanya ada di Dashboard Eksekutif (bagian Peta kecamatan); menu analisis difokuskan pada tren,
-- konsistensi sumber, dan rekomendasi per indikator (keputusan pemilik, 17 Nov 2026).
UPDATE sababuka.menu_items SET label = 'Analisis Indikator' WHERE code = 'analysis';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('080', 'Rename analysis menu to indicator analysis')
ON CONFLICT (version) DO NOTHING;

COMMIT;
