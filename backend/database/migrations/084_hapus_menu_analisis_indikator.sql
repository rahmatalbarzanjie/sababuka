BEGIN;

-- Menu Analisis Indikator dihapus: tren, tabulasi, spasial, sumber, dan rekomendasi per indikator kini ada di Lembar indikator
-- Dashboard Eksekutif; rekonsiliasi sumber ada di Konsolidasi Sumber (keputusan pemilik, 18 Nov 2026).
-- role_menu_items ikut terhapus lewat ON DELETE CASCADE.
DELETE FROM sababuka.menu_items WHERE code = 'analysis';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('084', 'Remove Analisis Indikator menu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
