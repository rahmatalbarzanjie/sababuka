BEGIN;

-- Navigasi administrasi harus berasal dari /me/menu seperti menu peran lain.
INSERT INTO sababuka.menu_items
    (code, label, icon, route_name, required_permission, display_order, is_active)
VALUES
    ('system-dashboard', 'Dashboard Sistem', 'layout-dashboard', '/admin', 'system.configure', 5, true),
    ('opd-monitoring', 'Kesiapan OPD', 'building-2', '/admin/opd-monitoring', 'organization.view', 6, true)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route_name = EXCLUDED.route_name,
    required_permission = EXCLUDED.required_permission,
    display_order = EXCLUDED.display_order,
    is_active = true,
    updated_at = now();

UPDATE sababuka.menu_items
SET label = CASE code
      WHEN 'categories' THEN 'Kategori'
      WHEN 'indicators' THEN 'Matriks Indikator'
      WHEN 'assistant' THEN 'Asisten AI'
      WHEN 'publications' THEN 'Kurasi & Publikasi'
      WHEN 'roles' THEN 'Peran dan Hak Akses'
      WHEN 'connectors' THEN 'Pusat Sinkronisasi Data'
      ELSE label
    END,
    updated_at = now()
WHERE code IN ('categories', 'indicators', 'assistant', 'publications', 'roles', 'connectors');

WITH desired(menu_code, display_order) AS (
  VALUES
    ('system-dashboard', 5),
    ('opd-monitoring', 6),
    ('dashboard', 10),
    ('connectors', 20),
    ('audit', 30),
    ('administration', 40),
    ('organizations', 41),
    ('users', 42),
    ('roles', 43),
    ('menus', 44),
    ('metadata-profiles', 45),
    ('system-settings', 46)
)
INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT role.id, menu.id, true, desired.display_order
FROM desired
JOIN sababuka.roles role ON role.code = 'superadmin' AND role.is_active = true
JOIN sababuka.menu_items menu ON menu.code = desired.menu_code AND menu.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = EXCLUDED.is_visible,
    display_order = EXCLUDED.display_order;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('051', 'API-driven system navigation and canonical menu labels')
ON CONFLICT (version) DO NOTHING;

COMMIT;
