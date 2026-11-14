BEGIN;

-- Bank Data Kapuas: tahun konektor tidak lagi dikunci pada 2024-2029 (keputusan pemilik, 14 Nov 2026).
ALTER TABLE sababuka.connector_staging_values DROP CONSTRAINT IF EXISTS connector_staging_year_check;
ALTER TABLE sababuka.connector_staging_values
  ADD CONSTRAINT connector_staging_year_check CHECK (year BETWEEN 1990 AND 2035);

INSERT INTO sababuka.periods (period_type, code, label, starts_on, ends_on)
SELECT 'annual', y::text, 'Tahun ' || y, make_date(y, 1, 1), make_date(y, 12, 31)
FROM generate_series(1990, 2035) AS y
ON CONFLICT DO NOTHING;

-- Asisten AI kembali menjadi menu sidebar (selain tombol melayang Pimpinan).
INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'assistant.use'
WHERE r.code IN ('pimpinan', 'bapperida', 'kominfo', 'superadmin') AND r.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, 33
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'assistant' AND m.is_active = true
WHERE r.code IN ('pimpinan', 'bapperida', 'kominfo', 'superadmin') AND r.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET is_visible = true;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('064', 'open connector year range and restore assistant menu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
