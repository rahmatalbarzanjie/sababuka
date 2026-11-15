BEGIN;

-- Status sinkron otomatis Bank Data (BPS Kapuas dalam Angka dan Satu Data Kapuas).
CREATE TABLE IF NOT EXISTS sababuka.bank_data_sync_items (
    source_code      varchar(40) NOT NULL,
    external_id      varchar(120) NOT NULL,
    remote_modified  text,
    last_checked_at  timestamptz NOT NULL DEFAULT now(),
    last_changed_at  timestamptz,
    last_status      varchar(24) NOT NULL,
    detail           text,
    PRIMARY KEY (source_code, external_id)
);

CREATE TABLE IF NOT EXISTS sababuka.bank_data_sync_runs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger        varchar(16) NOT NULL DEFAULT 'scheduler',
    started_at     timestamptz NOT NULL DEFAULT now(),
    finished_at    timestamptz,
    status         varchar(16) NOT NULL DEFAULT 'running',
    summary        jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT bank_data_sync_runs_status_check CHECK (status IN ('running', 'success', 'partial', 'failed'))
);
CREATE INDEX IF NOT EXISTS bank_data_sync_runs_started_idx ON sababuka.bank_data_sync_runs (started_at DESC);

COMMIT;
