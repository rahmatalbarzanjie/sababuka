BEGIN;

-- Profil Data OPD adalah ruang kerja utama PIC OPD. Tegaskan kembali izin
-- dan menu agar konsisten pada database yang pernah melewati konfigurasi role.
INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'submission.view'
WHERE r.code = 'opd' AND r.is_active = true
ON CONFLICT DO NOTHING;

UPDATE sababuka.menu_items
SET label = 'Profil Data OPD',
    required_permission = 'submission.view',
    is_active = true,
    updated_at = now()
WHERE code = 'opd-profile';

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'opd-profile' AND m.is_active = true
WHERE r.code = 'opd' AND r.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('039', 'OPD profile access and approved registration PIC linkage')
ON CONFLICT (version) DO NOTHING;

COMMIT;
