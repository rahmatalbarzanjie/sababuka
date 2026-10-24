BEGIN;

-- Preview sumber eksternal adalah ruang kerja teknis Developer/Superadmin.
-- Nilai mentah staging dibersihkan setelah 90 hari, tetapi ringkasan run dan
-- audit trail tetap disimpan agar tindakan pengambilan data dapat ditelusuri.
ALTER TABLE sababuka.connector_runs
    ADD COLUMN staging_expires_at timestamptz,
    ADD COLUMN staging_purged_at timestamptz;

UPDATE sababuka.connector_runs
SET staging_expires_at = created_at + interval '90 days'
WHERE staging_expires_at IS NULL;

ALTER TABLE sababuka.connector_runs
    ALTER COLUMN staging_expires_at SET DEFAULT (now() + interval '90 days'),
    ALTER COLUMN staging_expires_at SET NOT NULL;

CREATE INDEX connector_runs_staging_expiry_idx
    ON sababuka.connector_runs(staging_expires_at)
    WHERE staging_purged_at IS NULL;

DELETE FROM sababuka.role_permissions rp
USING sababuka.roles r, sababuka.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code <> 'superadmin'
  AND (p.code LIKE 'connector.%' OR p.code LIKE 'connector_secret.%');

DELETE FROM sababuka.role_menu_items rmi
USING sababuka.roles r, sababuka.menu_items m
WHERE rmi.role_id = r.id
  AND rmi.menu_item_id = m.id
  AND r.code <> 'superadmin'
  AND m.code = 'connectors';

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p
  ON p.code IN ('connector.view', 'connector.manage', 'connector_secret.view', 'connector_secret.manage')
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = 'connectors'
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('043', 'Private connector candidate staging with 90-day raw preview retention')
ON CONFLICT (version) DO NOTHING;

COMMIT;
