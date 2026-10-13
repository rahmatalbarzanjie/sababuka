BEGIN;

-- BPS Kabupaten/Kota adalah instansi vertikal, bukan OPD Pemerintah Daerah.
-- Dalam Satu Data Indonesia BPS menjalankan fungsi Pembina Data Statistik:
-- memberikan pembinaan standar, metadata, metodologi, dan konsistensi statistik,
-- tanpa mengambil alih koreksi data milik Produsen Data atau persetujuan akhir daerah.
INSERT INTO sababuka.organizations
    (code, name, short_name, organization_type, metadata)
VALUES
    ('BPS_KAPUAS', 'Badan Pusat Statistik Kabupaten Kapuas', 'BPS Kabupaten Kapuas',
     'vertical_agency',
     '{"institutional_role":"statistical_data_coach","government_level":"central_vertical","may_produce_own_data":true}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    organization_type = EXCLUDED.organization_type,
    metadata = sababuka.organizations.metadata || EXCLUDED.metadata,
    is_active = true,
    archived_at = NULL,
    updated_at = now();

INSERT INTO sababuka.roles (code, name, description, is_system)
VALUES (
    'pembina_statistik',
    'Pembina Data Statistik (BPS)',
    'Menelaah standar, metadata, metodologi, dan konsistensi statistik serta memberi rekomendasi perbaikan tanpa mengubah data OPD atau memberikan persetujuan akhir.',
    true
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = true,
    is_active = true,
    updated_at = now();

INSERT INTO sababuka.permissions (code, name, description, risk_level)
VALUES
    ('statistical_guidance.view', 'Lihat pembinaan statistik', 'Melihat data lintas instansi untuk telaah statistik tanpa mengubah data sumber.', 'normal'),
    ('statistical_guidance.comment', 'Beri rekomendasi statistik', 'Menambahkan rekomendasi standar, metadata, metodologi, atau konsistensi tanpa mengubah status pelaporan.', 'elevated')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = ANY (ARRAY[
    'organization.view', 'policy_focus.view', 'category.view', 'indicator.view',
    'dataset.view', 'submission.view', 'statistical_guidance.view',
    'statistical_guidance.comment'
])
WHERE r.code = 'pembina_statistik'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.menu_items
    (code, label, icon, route_name, required_permission, display_order)
VALUES
    ('statistical-guidance', 'Pembinaan Statistik', 'book-check', '/guidance', 'statistical_guidance.view', 55)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route_name = EXCLUDED.route_name,
    required_permission = EXCLUDED.required_permission,
    display_order = EXCLUDED.display_order,
    is_active = true,
    updated_at = now();

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = ANY (ARRAY[
    'governance', 'indicators', 'datasets', 'submissions', 'statistical-guidance'
])
WHERE r.code = 'pembina_statistik'
ON CONFLICT DO NOTHING;

CREATE TABLE sababuka.submission_guidance_notes (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                uuid NOT NULL REFERENCES sababuka.data_batches(id) ON DELETE CASCADE,
    indicator_version_id    uuid REFERENCES sababuka.indicator_versions(id),
    guidance_type           varchar(24) NOT NULL,
    notes                   text NOT NULL,
    created_by              uuid NOT NULL REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    resolved_by             uuid REFERENCES sababuka.users(id),
    resolved_at             timestamptz,
    resolution_notes        text,
    CONSTRAINT submission_guidance_type_check CHECK (
        guidance_type IN ('standard', 'metadata', 'methodology', 'consistency')
    ),
    CONSTRAINT submission_guidance_notes_check CHECK (length(btrim(notes)) BETWEEN 3 AND 4000),
    CONSTRAINT submission_guidance_resolution_check CHECK (
        (resolved_at IS NULL AND resolved_by IS NULL)
        OR (resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
    )
);

CREATE INDEX submission_guidance_batch_idx
    ON sababuka.submission_guidance_notes(batch_id, created_at DESC);
CREATE INDEX submission_guidance_open_idx
    ON sababuka.submission_guidance_notes(batch_id)
    WHERE resolved_at IS NULL;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('042', 'BPS vertical agency, statistical data coach role, and non-destructive guidance notes')
ON CONFLICT (version) DO NOTHING;

COMMIT;
