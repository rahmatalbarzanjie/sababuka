-- Fitur Ruang Bupati dibatalkan dari Versi 1 (keputusan pemilik, 24 Nov 2026) dan dipindah ke Versi 2. Tabel ini sudah diterapkan di produksi dan dipertahankan tanpa dipakai aplikasi, seperti submission_evidence.
-- Ruang Bupati (permintaan pemilik, 24 Nov 2026): briefing harian, indikator pantauan, dan catatan pribadi Bupati.
-- Semua data milik pengguna dan hanya dibaca pemiliknya; tidak dikirim ke OPD.
BEGIN;

CREATE TABLE IF NOT EXISTS sababuka.assistant_briefing_reads (
    user_id     uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    brief_date  date NOT NULL,
    item_key    varchar(32) NOT NULL,
    read_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, brief_date, item_key)
);

CREATE TABLE IF NOT EXISTS sababuka.assistant_pins (
    user_id       uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    indicator_id  uuid NOT NULL REFERENCES sababuka.indicators(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, indicator_id)
);

CREATE TABLE IF NOT EXISTS sababuka.assistant_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    session_id  uuid REFERENCES sababuka.assistant_sessions(id) ON DELETE SET NULL,
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assistant_notes_content_length CHECK (char_length(content) BETWEEN 2 AND 1000)
);
CREATE INDEX IF NOT EXISTS assistant_notes_user_idx ON sababuka.assistant_notes(user_id, created_at DESC);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('092', 'ruang bupati: briefing reads, pins, notes')
ON CONFLICT (version) DO NOTHING;

COMMIT;
