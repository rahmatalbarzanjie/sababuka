BEGIN;

-- Pendaftaran BAPPERIDA dan Diskominfosantik memakai satu PIC yang sekaligus
-- memiliki kewenangan OPD serta kewenangan khusus instansinya.
UPDATE sababuka.user_registration_requests rr
SET approved_organization_id = rr.requested_organization_id,
    approved_role_id = (SELECT id FROM sababuka.roles WHERE code = 'opd'),
    updated_at = now()
FROM sababuka.organizations o
WHERE rr.requested_organization_id = o.id
  AND o.code IN ('BAPPERIDA', 'DISKOMINFOSANTIK')
  AND rr.status = 'approved'
  AND (rr.approved_organization_id IS NULL OR rr.approved_role_id IS DISTINCT FROM (SELECT id FROM sababuka.roles WHERE code = 'opd'));

INSERT INTO sababuka.user_role_assignments
    (user_id, role_id, organization_id, scope_type, assigned_by)
SELECT rr.user_id, opd_role.id, rr.approved_organization_id, 'organization', rr.reviewed_by
FROM sababuka.user_registration_requests rr
JOIN sababuka.organizations o ON o.id = rr.approved_organization_id
JOIN sababuka.roles opd_role ON opd_role.code = 'opd' AND opd_role.is_active = true
JOIN sababuka.users u ON u.id = rr.user_id AND u.status IN ('active', 'locked') AND u.archived_at IS NULL
WHERE rr.status = 'approved' AND o.code IN ('BAPPERIDA', 'DISKOMINFOSANTIK')
ON CONFLICT (user_id, role_id, organization_id, scope_type) DO UPDATE
SET ends_at = NULL, starts_at = now(), assigned_by = EXCLUDED.assigned_by;

INSERT INTO sababuka.user_role_assignments
    (user_id, role_id, organization_id, scope_type, assigned_by)
SELECT rr.user_id, special_role.id, NULL, 'global', rr.reviewed_by
FROM sababuka.user_registration_requests rr
JOIN sababuka.organizations o ON o.id = rr.approved_organization_id
JOIN sababuka.roles special_role
  ON special_role.code = CASE WHEN o.code = 'BAPPERIDA' THEN 'bapperida' ELSE 'kominfo' END
 AND special_role.is_active = true
JOIN sababuka.users u ON u.id = rr.user_id AND u.status IN ('active', 'locked') AND u.archived_at IS NULL
WHERE rr.status = 'approved' AND o.code IN ('BAPPERIDA', 'DISKOMINFOSANTIK')
ON CONFLICT (user_id, role_id, organization_id, scope_type) DO UPDATE
SET ends_at = NULL, starts_at = now(), assigned_by = EXCLUDED.assigned_by;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('040', 'single PIC with dual institutional roles for BAPPERIDA and Diskominfosantik')
ON CONFLICT (version) DO NOTHING;

COMMIT;
