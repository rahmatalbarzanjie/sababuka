BEGIN;

-- Navigasi sistem disusun per peran. Pengelola Sistem memakai pratinjau peran
-- untuk alur substansi, sehingga sidebar utamanya tetap fokus pada administrasi.
DELETE FROM sababuka.role_menu_items rmi
USING sababuka.roles r
WHERE rmi.role_id = r.id
  AND r.code IN ('superadmin', 'bapperida', 'kominfo', 'pembina_statistik', 'opd', 'pimpinan');

WITH desired(role_code, menu_code, display_order) AS (
  VALUES
    ('superadmin', 'connectors', 10),
    ('superadmin', 'audit', 20),
    ('superadmin', 'administration', 30),
    ('superadmin', 'organizations', 31),
    ('superadmin', 'users', 32),
    ('superadmin', 'roles', 33),
    ('superadmin', 'menus', 34),
    ('superadmin', 'metadata-profiles', 35),
    ('superadmin', 'system-settings', 36),

    ('bapperida', 'operations', 10),
    ('bapperida', 'reviews', 20),
    ('bapperida', 'publications', 30),
    ('bapperida', 'governance', 40),
    ('bapperida', 'focuses', 41),
    ('bapperida', 'categories', 42),
    ('bapperida', 'indicators', 43),
    ('bapperida', 'datasets', 44),
    ('bapperida', 'analysis', 50),
    ('bapperida', 'finance', 51),
    ('bapperida', 'public-services', 52),
    ('bapperida', 'connectors', 60),
    ('bapperida', 'audit', 70),

    ('kominfo', 'connectors', 10),
    ('kominfo', 'dashboard', 20),
    ('kominfo', 'audit', 30),

    ('pembina_statistik', 'statistical-guidance', 10),
    ('pembina_statistik', 'governance', 20),
    ('pembina_statistik', 'indicators', 21),
    ('pembina_statistik', 'datasets', 22),
    ('pembina_statistik', 'submissions', 30),

    ('opd', 'operations', 10),
    ('opd', 'opd-profile', 20),
    ('opd', 'submissions', 30),
    ('opd', 'governance', 40),
    ('opd', 'indicators', 41),
    ('opd', 'datasets', 42),

    ('pimpinan', 'dashboard', 10),
    ('pimpinan', 'publications', 20),
    ('pimpinan', 'analysis', 30),
    ('pimpinan', 'finance', 31),
    ('pimpinan', 'public-services', 32)
)
INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, desired.display_order
FROM desired
JOIN sababuka.roles r ON r.code = desired.role_code AND r.is_active = true
JOIN sababuka.menu_items m ON m.code = desired.menu_code AND m.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = EXCLUDED.is_visible,
    display_order = EXCLUDED.display_order;

-- Asisten AI hanya tersedia bagi Pimpinan dan masuk melalui tombol melayang,
-- bukan melalui menu sidebar.
DELETE FROM sababuka.role_permissions rp
USING sababuka.roles r, sababuka.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND p.code = 'assistant.use'
  AND r.code <> 'pimpinan';

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'assistant.use'
WHERE r.code = 'pimpinan' AND r.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('047', 'role-specific menu order and floating assistant entry')
ON CONFLICT (version) DO NOTHING;

COMMIT;
