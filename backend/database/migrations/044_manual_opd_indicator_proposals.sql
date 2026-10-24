-- Indikator usulan OPD selalu dibuat satu per satu melalui formulir.
-- Tidak ada jalur impor dokumen atau pembentukan kandidat otomatis.

ALTER TABLE sababuka.indicators
    ADD COLUMN IF NOT EXISTS origin_type varchar(32) NOT NULL DEFAULT 'rpjmd_master',
    ADD COLUMN IF NOT EXISTS planning_document_type varchar(32),
    ADD COLUMN IF NOT EXISTS planning_document_reference text,
    ADD COLUMN IF NOT EXISTS proposed_by_organization_id uuid REFERENCES sababuka.organizations(id);

ALTER TABLE sababuka.indicators
    DROP CONSTRAINT IF EXISTS indicators_origin_type_check,
    DROP CONSTRAINT IF EXISTS indicators_planning_document_type_check,
    ADD CONSTRAINT indicators_origin_type_check
      CHECK (origin_type IN ('rpjmd_master', 'opd_manual')),
    ADD CONSTRAINT indicators_planning_document_type_check
      CHECK (planning_document_type IS NULL OR planning_document_type IN ('renstra', 'renja', 'other')),
    ADD CONSTRAINT indicators_manual_proposal_check CHECK (
      origin_type <> 'opd_manual'
      OR (
        proposed_by_organization_id IS NOT NULL
        AND owner_organization_id = proposed_by_organization_id
        AND planning_document_type IS NOT NULL
        AND length(trim(COALESCE(planning_document_reference, ''))) >= 3
      )
    );

CREATE INDEX IF NOT EXISTS indicators_origin_owner_idx
    ON sababuka.indicators(origin_type, proposed_by_organization_id)
    WHERE archived_at IS NULL;

INSERT INTO sababuka.permissions (code, name, risk_level)
VALUES ('indicator.propose', 'Usulkan indikator OPD secara manual', 'elevated')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'indicator.propose'
WHERE r.code IN ('opd', 'superadmin')
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('044', 'manual OPD indicator proposals with explicit planning-document provenance')
ON CONFLICT (version) DO NOTHING;
