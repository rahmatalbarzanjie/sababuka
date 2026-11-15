BEGIN;

-- Tautan manual antara indikator RPJMD dan Seri Data (indikator origin_type = 'bank_data').
-- Seri Data tidak dipaksakan berelasi dengan RPJMD: tautan dibuat hanya bila memang berkaitan.
CREATE TABLE IF NOT EXISTS sababuka.indicator_series_links (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rpjmd_indicator_id uuid NOT NULL REFERENCES sababuka.indicators(id) ON DELETE CASCADE,
    series_indicator_id uuid NOT NULL REFERENCES sababuka.indicators(id) ON DELETE CASCADE,
    relation_type      varchar(24) NOT NULL DEFAULT 'supporting',
    notes              text,
    created_by         uuid REFERENCES sababuka.users(id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT indicator_series_links_relation_check CHECK (relation_type IN ('primary', 'supporting', 'comparison')),
    CONSTRAINT indicator_series_links_distinct_check CHECK (rpjmd_indicator_id <> series_indicator_id),
    CONSTRAINT indicator_series_links_unique UNIQUE (rpjmd_indicator_id, series_indicator_id)
);
CREATE INDEX IF NOT EXISTS indicator_series_links_series_idx ON sababuka.indicator_series_links (series_indicator_id);

COMMIT;
