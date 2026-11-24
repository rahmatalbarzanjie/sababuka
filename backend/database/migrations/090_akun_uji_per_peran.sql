-- Akun uji per peran untuk uji tampilan dan uji penetrasi (permintaan pemilik, 24 Nov 2026).
-- Tanpa akun Developer. Kata sandi acak dibagikan pemilik di luar repo; hanya hash argon2id yang disimpan di sini.
-- Akun OPD dipasang pada Diskominfosantik sebagai akun tambahan (batas satu PIC hanya diperiksa aplikasi).
-- Nonaktifkan setelah pengujian: UPDATE sababuka.users SET status = 'suspended' WHERE email LIKE 'uji.%@sababuka.test';
BEGIN;

WITH accounts(username, email, full_name, password_hash, role_code, scope_type, org_code, membership_type) AS (
  VALUES
    ('uji.opd', 'uji.opd@sababuka.test', 'Akun Uji OPD', '$argon2id$v=19$m=65536,p=1,t=3$AQxCBhpc1l7oRseqHH/YLg$Qo5NwK9KdbNztFtSxz8+Kv/Mdx+GYCw2KcViGQdjtaM', 'opd', 'organization', 'DISKOMINFOSANTIK', 'operator'),
    ('uji.bapperida', 'uji.bapperida@sababuka.test', 'Akun Uji BAPPERIDA', '$argon2id$v=19$m=65536,p=1,t=3$/jg5lJ5CFBSvKCav9RP13Q$jNxMUUC+cmvF/m4gLYb4j3GhRjCA07ePuIphR2x1UWw', 'bapperida', 'global', 'BAPPERIDA', 'administrator'),
    ('uji.bps', 'uji.bps@sababuka.test', 'Akun Uji BPS', '$argon2id$v=19$m=65536,p=1,t=3$TNT+Dw7sfwXwY/bCdFBasw$BLt2mT5NiXoRtVOYfzUwL/jZvTqy2J8J7oqgKIrK/Hw', 'pembina_statistik', 'global', 'BPS_KAPUAS', 'member'),
    ('uji.bupati', 'uji.bupati@sababuka.test', 'Akun Uji Bupati', '$argon2id$v=19$m=65536,p=1,t=3$1fFQO6mu7Ml+p7jHm1afCQ$T7A4sDRHMzoJxY5XHsT16MzsB1WDnitx7jpjnTdh+aY', 'pimpinan', 'published', 'KAPUAS', 'member')
), created AS (
  INSERT INTO sababuka.users (email, username, full_name, password_hash, status, must_change_password, mfa_required)
  SELECT email, username, full_name, password_hash, 'active', false, false FROM accounts
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
), membership AS (
  INSERT INTO sababuka.organization_memberships (user_id, organization_id, membership_type, is_primary)
  SELECT c.id, o.id, a.membership_type, true
  FROM created c
  JOIN accounts a ON a.email = c.email
  JOIN sababuka.organizations o ON o.code = a.org_code
  RETURNING user_id
), assignment AS (
  INSERT INTO sababuka.user_role_assignments (user_id, role_id, organization_id, scope_type, assigned_by)
  SELECT c.id, r.id, CASE WHEN a.scope_type = 'organization' THEN o.id ELSE NULL END, a.scope_type, c.id
  FROM created c
  JOIN accounts a ON a.email = c.email
  JOIN sababuka.roles r ON r.code = a.role_code
  JOIN sababuka.organizations o ON o.code = a.org_code
  RETURNING user_id
)
INSERT INTO sababuka.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
SELECT c.id, 'user.test_account_created', 'user', c.id, jsonb_build_object('purpose', 'uji tampilan dan penetrasi')
FROM created c;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('090', 'test accounts per role for UI and penetration testing')
ON CONFLICT (version) DO NOTHING;

COMMIT;
