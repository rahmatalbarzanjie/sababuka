BEGIN;

-- Pimpinan hanya memiliki dua menu: Dashboard Eksekutif dan Tanya Sababuka (keputusan pemilik, 15 Nov 2026).
-- Analisis dan tren kini menjadi bagian Dashboard Eksekutif.
UPDATE sababuka.menu_items SET label = 'Dashboard Eksekutif' WHERE code = 'dashboard';

UPDATE sababuka.role_menu_items rmi
SET is_visible = false
FROM sababuka.roles r, sababuka.menu_items m
WHERE rmi.role_id = r.id AND rmi.menu_item_id = m.id
  AND r.code = 'pimpinan' AND m.code NOT IN ('dashboard', 'assistant');

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('071', 'Dashboard Eksekutif menu and two-menu Pimpinan')
ON CONFLICT (version) DO NOTHING;

COMMIT;
