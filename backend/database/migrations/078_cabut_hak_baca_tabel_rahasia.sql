BEGIN;

-- Role baca audit `sababuka` (akses SSH hanya baca, dibuat 14 Nov 2026) tidak memerlukan tabel yang memuat hash token,
-- sesi, dan rahasia terenkripsi. Hak SELECT dicabut agar dampak kebocoran kunci SSH berkurang (temuan T-01 audit rilis
-- 16 Nov 2026; user_invitations ikut dicabut karena menyimpan hash token undangan).
-- Role itu hanya ada di server produksi: di lokal dan CI migration ini tidak mengubah apa pun.
DO $$
DECLARE
  tabel text;
  tersisa text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sababuka') THEN
    RETURN;
  END IF;
  FOREACH tabel IN ARRAY ARRAY['auth_sessions', 'password_reset_tokens', 'connector_secrets',
                               'assistant_sessions', 'system_secrets', 'user_invitations'] LOOP
    IF to_regclass('sababuka.' || tabel) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE sababuka.%I FROM sababuka', tabel);
      IF has_table_privilege('sababuka', 'sababuka.' || tabel, 'SELECT') THEN
        tersisa := tersisa || ' ' || tabel;
      END IF;
    END IF;
  END LOOP;
  IF tersisa <> '' THEN
    RAISE WARNING 'Hak baca role sababuka masih ada pada:% (cabut manual oleh pemilik basis data)', tersisa;
  END IF;
END
$$;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('078', 'Revoke audit read role access to secret tables')
ON CONFLICT (version) DO NOTHING;

COMMIT;
