BEGIN;

-- Fitur Keuangan Daerah dan Layanan Publik dihapus (keputusan pemilik, 17 Nov 2026).
-- role_menu_items ikut terhapus lewat ON DELETE CASCADE.
DELETE FROM sababuka.menu_items WHERE code IN ('finance', 'public-services');

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('074', 'Remove Keuangan Daerah and Layanan Publik menus')
ON CONFLICT (version) DO NOTHING;

COMMIT;
