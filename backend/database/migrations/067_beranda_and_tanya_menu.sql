BEGIN;

-- Beranda Bupati: ringkasan perubahan penting + Tanya Sababuka (keputusan pemilik, 15 Nov 2026).
UPDATE sababuka.menu_items SET label = 'Beranda' WHERE code = 'dashboard';
UPDATE sababuka.menu_items SET label = 'Tanya Sababuka' WHERE code = 'assistant';

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, 10
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'dashboard' AND m.is_active = true
WHERE r.code = 'pimpinan' AND r.is_active = true
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET is_visible = true, display_order = 10;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('067', 'Beranda and Tanya Sababuka menu labels')
ON CONFLICT (version) DO NOTHING;

COMMIT;
