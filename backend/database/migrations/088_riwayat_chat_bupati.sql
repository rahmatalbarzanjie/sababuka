BEGIN;

ALTER TABLE sababuka.assistant_messages
  ADD COLUMN IF NOT EXISTS client_message_id uuid;

ALTER TABLE sababuka.assistant_messages
  DROP CONSTRAINT IF EXISTS assistant_messages_client_id_role_check;

ALTER TABLE sababuka.assistant_messages
  ADD CONSTRAINT assistant_messages_client_id_role_check
  CHECK (client_message_id IS NULL OR message_role = 'user');

CREATE UNIQUE INDEX IF NOT EXISTS assistant_messages_client_id_unique
  ON sababuka.assistant_messages(session_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('088', 'server-side Bupati chat history and idempotent messages')
ON CONFLICT (version) DO NOTHING;

COMMIT;
