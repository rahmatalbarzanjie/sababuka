BEGIN;

-- Migration 047 menyusun ulang navigasi per peran. Pertahankan kemampuan
-- baseline yang sudah diuji: Superadmin tetap dapat membuka dashboard dan
-- BAPPERIDA dapat membaca pusat sinkronisasi tanpa memperoleh kewenangan
-- pengelolaan konektor atau rahasia Walidata.
INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, 5
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'dashboard' AND m.is_active = true
WHERE r.code = 'superadmin' AND r.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = EXCLUDED.is_visible,
    display_order = EXCLUDED.display_order;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'connector.view'
WHERE r.code = 'bapperida' AND r.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, 60
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'connectors' AND m.is_active = true
WHERE r.code = 'bapperida' AND r.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = EXCLUDED.is_visible,
    display_order = EXCLUDED.display_order;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('049', 'restore tested dashboard and connector menu capabilities')
ON CONFLICT (version) DO NOTHING;

COMMIT;
