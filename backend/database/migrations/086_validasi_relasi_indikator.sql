BEGIN;

-- Validasi BAPPERIDA atas keterkaitan indikator yang diusulkan sistem (kelompok isu atau fokus yang sama).
-- Satu baris per pasangan tanpa urutan (indicator_a < indicator_b). confirmed: keterkaitan diakui;
-- rejected: pasangan dikecualikan dari analisis silang. Tanpa baris berarti masih usulan sistem.
CREATE TABLE IF NOT EXISTS sababuka.indicator_relation_reviews (
    indicator_a uuid NOT NULL REFERENCES sababuka.indicators(id) ON DELETE CASCADE,
    indicator_b uuid NOT NULL REFERENCES sababuka.indicators(id) ON DELETE CASCADE,
    status      varchar(12) NOT NULL,
    note        text,
    reviewed_by uuid REFERENCES sababuka.users(id),
    reviewed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (indicator_a, indicator_b),
    CONSTRAINT indicator_relation_reviews_order CHECK (indicator_a < indicator_b),
    CONSTRAINT indicator_relation_reviews_status CHECK (status IN ('confirmed', 'rejected'))
);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('086', 'BAPPERIDA validation of proposed indicator relations')
ON CONFLICT (version) DO NOTHING;

COMMIT;
