BEGIN;

ALTER TABLE sababuka.indicators
    ADD COLUMN IF NOT EXISTS kodref_ip varchar(128);

ALTER TABLE sababuka.indicators
    DROP CONSTRAINT IF EXISTS indicators_kodref_ip_not_blank,
    ADD CONSTRAINT indicators_kodref_ip_not_blank
      CHECK (kodref_ip IS NULL OR length(trim(kodref_ip)) > 0);

CREATE INDEX IF NOT EXISTS indicators_kodref_ip_idx
    ON sababuka.indicators(kodref_ip)
    WHERE kodref_ip IS NOT NULL;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('045', 'optional national development indicator reference code')
ON CONFLICT (version) DO NOTHING;

COMMIT;
