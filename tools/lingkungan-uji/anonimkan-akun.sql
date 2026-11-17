UPDATE sababuka.users SET password_hash = :'hash', must_change_password = false, failed_login_count = 0, locked_until = NULL, mfa_required = false;
WITH r AS (
  SELECT ura.user_id, string_agg(DISTINCT ro.code, '-' ORDER BY ro.code) AS roles, min(o.short_name) AS org
  FROM sababuka.user_role_assignments ura JOIN sababuka.roles ro ON ro.id = ura.role_id
  LEFT JOIN sababuka.organizations o ON o.id = ura.organization_id GROUP BY ura.user_id)
UPDATE sababuka.users u SET
  email = CASE
    WHEN u.email IN ('bupati@sababuka.com', 'developer@sababuka.com') THEN u.email
    WHEN u.email = 'sababuka.id@gmail.com' THEN 'ops@uji.local'
    WHEN r.roles IS NOT NULL THEN lower(regexp_replace(r.roles || '-' || coalesce(r.org, 'x'), '[^a-zA-Z0-9-]+', '', 'g')) || '-' || substr(u.id::text, 1, 4) || '@uji.local'
    ELSE 'akun-' || substr(u.id::text, 1, 8) || '@uji.local' END,
  username = CASE WHEN u.username = 'developer' THEN 'developer' ELSE NULL END,
  full_name = CASE WHEN u.email = 'developer@sababuka.com' THEN 'Developer' WHEN u.email = 'bupati@sababuka.com' THEN 'Bupati Kapuas' ELSE 'Akun uji' END
FROM r RIGHT JOIN (SELECT id FROM sababuka.users) x ON r.user_id = x.id WHERE x.id = u.id;
UPDATE sababuka.users SET status = 'active' WHERE email IN ('bupati@sababuka.com', 'developer@sababuka.com', 'ops@uji.local');
SELECT u.email, u.status, (SELECT string_agg(ro.code, ',') FROM sababuka.user_role_assignments a JOIN sababuka.roles ro ON ro.id=a.role_id WHERE a.user_id=u.id) peran FROM sababuka.users u ORDER BY 3 NULLS LAST, 1 LIMIT 60;
