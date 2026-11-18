BEGIN;

-- Bank Data mendapat menu sendiri agar tidak tersembunyi (permintaan pemilik, 18 Nov 2026).
-- Tampil untuk BAPPERIDA, Walidata Diskominfosantik, dan Developer; Bupati tetap hanya Dashboard Eksekutif dan Tanya Sababuka.
INSERT INTO sababuka.menu_items (code, label, icon, route_name, required_permission, display_order)
VALUES ('bank-data', 'Bank Data', 'database', '/dashboard/bank-data', 'executive_dashboard.view', 26)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, route_name = EXCLUDED.route_name,
  required_permission = EXCLUDED.required_permission, display_order = EXCLUDED.display_order, is_active = true;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT role.id, menu.id, true, menu.display_order
FROM sababuka.roles role
JOIN sababuka.menu_items menu ON menu.code = 'bank-data'
WHERE role.code IN ('superadmin', 'bapperida', 'kominfo')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET is_visible = true, display_order = EXCLUDED.display_order;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('082', 'Bank Data menu for BAPPERIDA, Walidata, and Developer')
ON CONFLICT (version) DO NOTHING;

COMMIT;
