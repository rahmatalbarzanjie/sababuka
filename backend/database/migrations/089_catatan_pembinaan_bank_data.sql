BEGIN;

CREATE TABLE IF NOT EXISTS sababuka.bank_data_guidance_notes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id        uuid NOT NULL REFERENCES sababuka.indicators(id),
    guidance_type       varchar(24) NOT NULL,
    notes               text NOT NULL,
    snapshot_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by          uuid NOT NULL REFERENCES sababuka.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    resolved_by         uuid REFERENCES sababuka.users(id),
    resolved_at         timestamptz,
    resolution_notes    text,
    CONSTRAINT bank_guidance_type_check CHECK (guidance_type IN ('standar', 'metadata', 'metodologi', 'konsistensi')),
    CONSTRAINT bank_guidance_notes_length_check CHECK (char_length(btrim(notes)) BETWEEN 10 AND 4000),
    CONSTRAINT bank_guidance_snapshot_object_check CHECK (jsonb_typeof(snapshot_json) = 'object'),
    CONSTRAINT bank_guidance_resolution_check CHECK (
      (resolved_at IS NULL AND resolved_by IS NULL AND resolution_notes IS NULL)
      OR
      (resolved_at IS NOT NULL AND resolved_by IS NOT NULL AND char_length(btrim(resolution_notes)) BETWEEN 10 AND 4000)
    )
);

CREATE INDEX IF NOT EXISTS bank_data_guidance_indicator_idx
  ON sababuka.bank_data_guidance_notes(indicator_id, created_at DESC);

INSERT INTO sababuka.permissions (code, name, description, risk_level)
VALUES
  ('bank_data.note', 'Buat catatan pembinaan Bank Data', 'Membuat catatan pembinaan statistik tanpa mengubah nilai.', 'normal'),
  ('bank_data.resolve_note', 'Selesaikan catatan Bank Data', 'Menandai catatan pembinaan telah ditindaklanjuti dengan penjelasan.', 'elevated')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'bank_data.note'
WHERE r.code = 'pembina_statistik'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'bank_data.resolve_note'
WHERE r.code IN ('superadmin', 'bapperida')
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('089', 'BPS guidance notes on Bank Data series')
ON CONFLICT (version) DO NOTHING;

COMMIT;
