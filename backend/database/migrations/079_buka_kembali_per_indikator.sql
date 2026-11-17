BEGIN;

-- Buka kembali per indikator (permintaan pemilik, 17 Nov 2026): BAPPERIDA dapat membuka indikator yang belum diisi pada
-- capaian yang sudah disetujui. Selama ada indikator terbuka, OPD hanya dapat mengisi indikator tersebut; nilai yang sudah
-- terbit tidak disentuh dan publikasi lama tetap tampil sampai versi baru disetujui.
CREATE TABLE sababuka.submission_open_indicators (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id              uuid NOT NULL REFERENCES sababuka.data_batches(id),
    indicator_version_id  uuid NOT NULL REFERENCES sababuka.indicator_versions(id),
    reason                text NOT NULL,
    opened_by             uuid NOT NULL REFERENCES sababuka.users(id),
    opened_at             timestamptz NOT NULL DEFAULT now(),
    closed_at             timestamptz,
    CONSTRAINT submission_open_indicators_reason_check CHECK (length(btrim(reason)) >= 10)
);

CREATE UNIQUE INDEX submission_open_indicators_active_idx
    ON sababuka.submission_open_indicators(batch_id, indicator_version_id) WHERE closed_at IS NULL;
CREATE INDEX submission_open_indicators_batch_idx ON sababuka.submission_open_indicators(batch_id);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('079', 'Per-indicator reopen of approved submissions')
ON CONFLICT (version) DO NOTHING;

COMMIT;
