BEGIN;

-- Keputusan pemilik 21 November 2026:
-- Diskominfosantik menjadi OPD biasa, mapping hanya BAPPERIDA,
-- impor hanya manual oleh Developer, BPS membaca Bank Data dan memberi catatan,
-- serta Dashboard Analisis menjadi ruang kerja BAPPERIDA.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sababuka.organizations
    WHERE code = 'DISKOMINFOSANTIK' AND is_active = true AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Organisasi DISKOMINFOSANTIK aktif tidak ditemukan';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sababuka.roles WHERE code = 'opd' AND is_active = true) THEN
    RAISE EXCEPTION 'Role OPD aktif tidak ditemukan';
  END IF;
END $$;

-- Pastikan pengguna lama Walidata tetap dapat masuk sebagai OPD Diskominfosantik.
INSERT INTO sababuka.organization_memberships
  (user_id, organization_id, membership_type, is_primary, starts_at)
SELECT DISTINCT ura.user_id, organization.id, 'member', false, now()
FROM sababuka.user_role_assignments ura
JOIN sababuka.roles role ON role.id = ura.role_id AND role.code = 'kominfo'
JOIN sababuka.organizations organization ON organization.code = 'DISKOMINFOSANTIK'
WHERE ura.starts_at <= now() AND (ura.ends_at IS NULL OR ura.ends_at > now())
ON CONFLICT (user_id, organization_id) DO UPDATE
SET ends_at = NULL;

INSERT INTO sababuka.user_role_assignments
  (user_id, role_id, organization_id, scope_type, starts_at, assigned_by)
SELECT DISTINCT ura.user_id, opd.id, organization.id, 'organization', now(), ura.assigned_by
FROM sababuka.user_role_assignments ura
JOIN sababuka.roles old_role ON old_role.id = ura.role_id AND old_role.code = 'kominfo'
JOIN sababuka.roles opd ON opd.code = 'opd' AND opd.is_active = true
JOIN sababuka.organizations organization ON organization.code = 'DISKOMINFOSANTIK'
WHERE ura.starts_at <= now() AND (ura.ends_at IS NULL OR ura.ends_at > now())
ON CONFLICT (user_id, role_id, organization_id, scope_type) DO UPDATE
SET ends_at = NULL,
    starts_at = LEAST(user_role_assignments.starts_at, EXCLUDED.starts_at),
    assigned_by = COALESCE(EXCLUDED.assigned_by, user_role_assignments.assigned_by);

UPDATE sababuka.user_role_assignments ura
SET ends_at = GREATEST(now(), ura.starts_at + interval '1 second')
FROM sababuka.roles role
WHERE role.id = ura.role_id
  AND role.code = 'kominfo'
  AND (ura.ends_at IS NULL OR ura.ends_at > now());

DELETE FROM sababuka.role_permissions
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'kominfo');

UPDATE sababuka.role_menu_items
SET is_visible = false
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'kominfo');

UPDATE sababuka.roles
SET name = 'Role lama Diskominfosantik',
    description = 'Role historis yang dinonaktifkan. Diskominfosantik menggunakan role OPD.',
    is_active = false,
    updated_at = now()
WHERE code = 'kominfo';

-- BPS hanya memakai Bank Data. Catatan pembinaan ditambahkan pada migration berikutnya.
INSERT INTO sababuka.permissions (code, name, description, risk_level)
VALUES ('bank_data.view', 'Melihat Bank Data', 'Membaca seri, metadata, sumber, dan riwayat Bank Data.', 'normal')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, risk_level = EXCLUDED.risk_level;

DELETE FROM sababuka.role_permissions rp
USING sababuka.roles role
WHERE rp.role_id = role.id AND role.code = 'pembina_statistik';

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM sababuka.roles role
JOIN sababuka.permissions permission ON permission.code = 'bank_data.view'
WHERE role.code IN ('superadmin', 'bapperida', 'pembina_statistik')
ON CONFLICT DO NOTHING;

-- Mapping substansi hanya BAPPERIDA. Developer tetap dapat bertindak sebagai
-- BAPPERIDA bila diperlukan dan audit menyimpan acting_as.
DELETE FROM sababuka.role_permissions rp
USING sababuka.roles role, sababuka.permissions permission
WHERE rp.role_id = role.id
  AND rp.permission_id = permission.id
  AND permission.code = 'connector.map'
  AND role.code <> 'bapperida';

-- Dashboard Analisis hanya tersedia untuk BAPPERIDA.
DELETE FROM sababuka.role_permissions rp
USING sababuka.roles role, sababuka.permissions permission
WHERE rp.role_id = role.id
  AND rp.permission_id = permission.id
  AND permission.code = 'executive_dashboard.view'
  AND role.code <> 'bapperida';

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM sababuka.roles role
JOIN sababuka.permissions permission ON permission.code = 'executive_dashboard.view'
WHERE role.code = 'bapperida'
ON CONFLICT DO NOTHING;

UPDATE sababuka.menu_items
SET label = 'Dashboard Analisis', display_order = 12, updated_at = now()
WHERE code = 'dashboard';

UPDATE sababuka.menu_items
SET required_permission = 'bank_data.view', display_order = 26, updated_at = now()
WHERE code = 'bank-data';

UPDATE sababuka.role_menu_items role_menu
SET is_visible = false
FROM sababuka.roles role, sababuka.menu_items menu
WHERE role_menu.role_id = role.id
  AND role_menu.menu_item_id = menu.id
  AND (
    role.code = 'pimpinan' AND menu.code <> 'assistant'
    OR role.code = 'pembina_statistik' AND menu.code <> 'bank-data'
    OR role.code = 'kominfo'
    OR menu.code = 'dashboard' AND role.code <> 'bapperida'
    OR menu.code = 'bank-data' AND role.code NOT IN ('superadmin', 'bapperida', 'pembina_statistik')
  );

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT role.id, menu.id, true, menu.display_order
FROM sababuka.roles role
JOIN sababuka.menu_items menu ON (
  role.code = 'bapperida' AND menu.code = 'dashboard'
  OR role.code IN ('superadmin', 'bapperida', 'pembina_statistik') AND menu.code = 'bank-data'
  OR role.code = 'pimpinan' AND menu.code = 'assistant'
)
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = true, display_order = EXCLUDED.display_order;

-- Tidak ada lagi profil terjadwal atau impor otomatis. Kolom lama dipertahankan
-- agar histori dan deployment bertahap tetap dapat dibaca.
UPDATE sababuka.data_source_integrations
SET sync_mode = 'manual',
    sync_interval_minutes = NULL,
    verification_mode = 'preview_required',
    next_sync_at = NULL,
    updated_at = now()
WHERE sync_mode <> 'manual'
   OR sync_interval_minutes IS NOT NULL
   OR verification_mode <> 'preview_required'
   OR next_sync_at IS NOT NULL;

DROP INDEX IF EXISTS sababuka.data_source_integrations_schedule_idx;

ALTER TABLE sababuka.data_source_integrations
  DROP CONSTRAINT IF EXISTS source_integration_sync_mode_check,
  DROP CONSTRAINT IF EXISTS source_integration_interval_check,
  DROP CONSTRAINT IF EXISTS source_integration_verification_check,
  DROP CONSTRAINT IF EXISTS source_integration_no_schedule_check;

ALTER TABLE sababuka.data_source_integrations
  ADD CONSTRAINT source_integration_sync_mode_check CHECK (sync_mode = 'manual'),
  ADD CONSTRAINT source_integration_interval_check CHECK (sync_interval_minutes IS NULL),
  ADD CONSTRAINT source_integration_verification_check CHECK (verification_mode = 'preview_required'),
  ADD CONSTRAINT source_integration_no_schedule_check CHECK (next_sync_at IS NULL);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('087', 'simplified roles, BAPPERIDA dashboard, BPS Bank Data, and manual-only imports')
ON CONFLICT (version) DO NOTHING;

COMMIT;
