BEGIN;

-- Walidata harus dapat membuka Pusat Sinkronisasi untuk memantau aliran data.
-- Kembalikan hanya izin baca yang dicabut migration 043; kewenangan kelola
-- konektor dan kredensial rahasia tetap khusus Superadmin.
INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'connector.view'
WHERE r.code = 'kominfo' AND r.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, 10
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'connectors' AND m.is_active = true
WHERE r.code = 'kominfo' AND r.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = EXCLUDED.is_visible,
    display_order = EXCLUDED.display_order;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('050', 'restore read-only connector access for walidata')
ON CONFLICT (version) DO NOTHING;

COMMIT;
