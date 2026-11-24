-- Hapus seluruh riwayat Tanya Sababuka yang ada (permintaan pemilik, 24 Nov 2026) agar riwayat Bupati dimulai bersih
-- sebelum jawaban asisten diperluas dengan kondisi dan perkembangan OPD. Pesan dan kutipan ikut terhapus lewat ON DELETE CASCADE.
-- Jejak audit (assistant.*) tidak dihapus; jumlah baris yang dihapus dicatat di audit.
BEGIN;

WITH counts AS (
  SELECT (SELECT count(*) FROM sababuka.assistant_sessions) AS sessions,
         (SELECT count(*) FROM sababuka.assistant_messages) AS messages
), removed AS (
  DELETE FROM sababuka.assistant_sessions RETURNING id
)
INSERT INTO sababuka.audit_events (event_type, entity_type, metadata)
SELECT 'assistant.history_cleared', 'assistant_session',
       jsonb_build_object('sessions', c.sessions, 'messages', c.messages, 'reason', 'permintaan pemilik, 24 Nov 2026')
FROM counts c;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('091', 'clear existing assistant chat history')
ON CONFLICT (version) DO NOTHING;

COMMIT;
