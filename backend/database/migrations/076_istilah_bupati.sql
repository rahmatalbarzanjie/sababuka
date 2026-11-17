BEGIN;

-- Istilah "Pimpinan" diganti "Bupati" pada teks tampilan (keputusan pemilik, 17 Nov 2026).
-- Kode peran internal `pimpinan` tidak diubah agar izin dan kebijakan akses tetap utuh.
UPDATE sababuka.roles
   SET name = 'Bupati', description = 'Pembaca dashboard eksekutif dan pengguna Asisten AI untuk Bupati.'
 WHERE code = 'pimpinan';

UPDATE sababuka.menu_items SET label = 'Ringkasan Bupati' WHERE code = 'executive';

UPDATE sababuka.feature_flags
   SET name = replace(replace(name, 'Pimpinan', 'Bupati'), 'pimpinan', 'Bupati'),
       description = replace(replace(description, 'Pimpinan', 'Bupati'), 'pimpinan', 'Bupati')
 WHERE name ILIKE '%pimpinan%' OR description ILIKE '%pimpinan%';

UPDATE sababuka.notifications
   SET title = replace(replace(title, 'Pimpinan', 'Bupati'), 'pimpinan', 'Bupati'),
       message = replace(replace(message, 'Pimpinan', 'Bupati'), 'pimpinan', 'Bupati')
 WHERE title ILIKE '%pimpinan%' OR message ILIKE '%pimpinan%';

-- Akun pimpinan@sababuka.com menjadi bupati@sababuka.com (kata sandi tidak berubah).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM sababuka.users WHERE email = 'bupati@sababuka.com') THEN
    RAISE EXCEPTION 'bupati@sababuka.com sudah ada; migration dihentikan';
  END IF;
END $$;

INSERT INTO sababuka.audit_events (actor_id, event_type, entity_type, entity_id, before_data, after_data, metadata)
SELECT (SELECT id FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1),
       'user.email_renamed', 'user', u.id,
       jsonb_build_object('email', u.email), jsonb_build_object('email', 'bupati@sababuka.com'),
       jsonb_build_object('reason', 'istilah Pimpinan diganti Bupati (migration 076)')
FROM sababuka.users u WHERE u.email = 'pimpinan@sababuka.com';

UPDATE sababuka.users
   SET email = 'bupati@sababuka.com', full_name = 'Bupati Kapuas'
 WHERE email = 'pimpinan@sababuka.com';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('076', 'Rename Pimpinan to Bupati in display text and account email')
ON CONFLICT (version) DO NOTHING;

COMMIT;
