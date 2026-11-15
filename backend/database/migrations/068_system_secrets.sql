BEGIN;

-- Rahasia sistem non-konektor (mis. kunci API model bahasa untuk Tanya Sababuka), disimpan terenkripsi.
CREATE TABLE IF NOT EXISTS sababuka.system_secrets (
    code              varchar(64) PRIMARY KEY,
    encrypted_secret  text NOT NULL,
    masked_hint       varchar(32),
    last_tested_at    timestamptz,
    last_test_status  varchar(24),
    last_test_error   text,
    updated_by        uuid REFERENCES sababuka.users(id),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('068', 'system secrets table for LLM API key')
ON CONFLICT (version) DO NOTHING;

COMMIT;
