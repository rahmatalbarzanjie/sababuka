-- connector_connection_checks hanya menyimpan satu baris per sumber (hasil uji terakhir).
-- Tabel ini mencatat setiap uji koneksi sebagai riwayat; key dan respons mentah tidak disimpan.
CREATE TABLE IF NOT EXISTS sababuka.connector_check_history (
    id             bigserial PRIMARY KEY,
    source_id      uuid NOT NULL REFERENCES sababuka.data_sources(id) ON DELETE CASCADE,
    checked_at     timestamptz NOT NULL DEFAULT now(),
    reachable      boolean NOT NULL,
    response_ms    integer,
    platform       varchar(120),
    dataset_count  integer,
    resource_count integer,
    error_text     text,
    checked_by     uuid REFERENCES sababuka.users(id)
);

CREATE INDEX IF NOT EXISTS connector_check_history_source_time_idx
    ON sababuka.connector_check_history (source_id, checked_at DESC);

-- Hasil uji terakhir yang sudah ada menjadi entri riwayat pertama.
INSERT INTO sababuka.connector_check_history (source_id, checked_at, reachable, response_ms, platform, dataset_count, resource_count, error_text)
SELECT c.source_id, c.checked_at, c.reachable, c.response_ms, c.platform, c.dataset_count, c.resource_count, c.error_text
FROM sababuka.connector_connection_checks c
WHERE NOT EXISTS (SELECT 1 FROM sababuka.connector_check_history h WHERE h.source_id = c.source_id);
