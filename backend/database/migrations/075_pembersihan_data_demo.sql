BEGIN;

-- Pembersihan data demo menjelang rilis final (keputusan pemilik, 17 Nov 2026).
-- Cakupan: akun uji/arsip, nilai demo dan nilai 0,00 indikator RPJMD, notifikasi lama,
-- undangan kedaluwarsa, sesi asisten lama, dan fokus kebijakan pilot nonaktif.
-- Jejak audit (audit_events) bersifat append-only dan tidak disentuh.

-- 1. Akun uji dan arsip. Baris pengguna tidak dihapus karena audit_events merujuknya;
--    identitas dihapus, akses dicabut, dan akun tetap berstatus arsip.
CREATE TEMP TABLE _akun_hapus ON COMMIT DROP AS
SELECT id FROM sababuka.users
WHERE email IN ('bapperida@sababuka.com', 'kominfo@sababuka.com', 'opd.dinkes@sababuka.com', 'opd.dkpp@sababuka.com')
   OR email LIKE 'qa.registration.%@sababuka.com';

DO $$
BEGIN
  IF (SELECT count(*) FROM _akun_hapus) > 5 THEN
    RAISE EXCEPTION 'Jumlah akun yang akan dibersihkan melebihi 5; migration dihentikan';
  END IF;
  IF EXISTS (SELECT 1 FROM sababuka.users u JOIN _akun_hapus a ON a.id = u.id WHERE u.status <> 'archived') THEN
    RAISE EXCEPTION 'Ada akun target yang belum berstatus arsip; migration dihentikan';
  END IF;
END $$;

DELETE FROM sababuka.auth_sessions WHERE user_id IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.password_reset_tokens WHERE user_id IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.user_mfa_methods WHERE user_id IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.user_invitations WHERE user_id IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.notifications WHERE user_id IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.assistant_sessions WHERE user_id IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.organization_memberships WHERE user_id IN (SELECT id FROM _akun_hapus);
UPDATE sababuka.user_role_assignments SET assigned_by = NULL
 WHERE assigned_by IN (SELECT id FROM _akun_hapus) AND user_id NOT IN (SELECT id FROM _akun_hapus);
DELETE FROM sababuka.user_role_assignments WHERE user_id IN (SELECT id FROM _akun_hapus);
UPDATE sababuka.users
   SET email = 'akun-dihapus-' || substr(id::text, 1, 8) || '@akun-dihapus.invalid',
       username = NULL, full_name = 'Akun dihapus', password_hash = NULL,
       status = 'archived', archived_at = COALESCE(archived_at, now()),
       must_change_password = false, locked_until = NULL
 WHERE id IN (SELECT id FROM _akun_hapus);

-- 2. Nilai demo dan nilai 0,00 pada indikator RPJMD. Nilai Bank Data bernilai 0 adalah data resmi dan tidak disentuh.
CREATE TEMP TABLE _nilai_hapus ON COMMIT DROP AS
SELECT o.id
FROM sababuka.observations o
JOIN sababuka.indicator_versions iv ON iv.id = o.indicator_version_id
JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.origin_type = 'rpjmd_master'
WHERE o.numeric_value = 0 OR o.source_name ILIKE '%Survei Kesehatan Indonesia%';

DO $$
BEGIN
  IF (SELECT count(*) FROM _nilai_hapus) > 6 THEN
    RAISE EXCEPTION 'Jumlah nilai yang akan dihapus melebihi 6; migration dihentikan';
  END IF;
END $$;

-- Catat nilai yang dihapus ke jejak audit sebelum penghapusan.
INSERT INTO sababuka.audit_events (actor_id, event_type, entity_type, entity_id, before_data, metadata)
SELECT (SELECT id FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1),
       'observation.demo_value_removed', 'observation', o.id,
       jsonb_build_object('indicator_version_id', o.indicator_version_id, 'period_id', o.period_id,
                          'numeric_value', o.numeric_value, 'source_name', o.source_name, 'batch_id', o.batch_id),
       jsonb_build_object('reason', 'pembersihan data demo menjelang rilis (migration 075)')
FROM sababuka.observations o WHERE o.id IN (SELECT id FROM _nilai_hapus);

-- Penjaga data terbit (published immutable) dilepas sementara hanya untuk id di atas, lalu dipasang kembali.
ALTER TABLE sababuka.publication_items DISABLE TRIGGER publication_items_protect_delete;
ALTER TABLE sababuka.observations DISABLE TRIGGER observations_published_immutable;

DELETE FROM sababuka.assistant_citations
 WHERE publication_item_id IN (SELECT id FROM sababuka.publication_items WHERE observation_id IN (SELECT id FROM _nilai_hapus));
DELETE FROM sababuka.publication_items WHERE observation_id IN (SELECT id FROM _nilai_hapus);
DELETE FROM sababuka.observation_conflict_decisions WHERE chosen_observation_id IN (SELECT id FROM _nilai_hapus);
UPDATE sababuka.observations SET supersedes_id = NULL WHERE supersedes_id IN (SELECT id FROM _nilai_hapus);
DELETE FROM sababuka.observations WHERE id IN (SELECT id FROM _nilai_hapus);

ALTER TABLE sababuka.observations ENABLE TRIGGER observations_published_immutable;
ALTER TABLE sababuka.publication_items ENABLE TRIGGER publication_items_protect_delete;

-- 3. Notifikasi lama (lebih dari 7 hari), undangan kedaluwarsa yang tidak diterima, dan sesi asisten lama.
DELETE FROM sababuka.notifications WHERE created_at < now() - interval '7 days';
DELETE FROM sababuka.user_invitations WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at < now();
DELETE FROM sababuka.assistant_sessions WHERE started_at < now() - interval '7 days';

-- 4. Fokus kebijakan pilot nonaktif beserta kategori draf nonaktif tanpa indikator yang menempel padanya.
DELETE FROM sababuka.categories c
 USING sababuka.policy_focuses pf
 WHERE c.policy_focus_id = pf.id AND pf.name = 'Indikator Pilot Laporan Antara'
   AND c.is_active = false AND c.review_status = 'draft'
   AND NOT EXISTS (SELECT 1 FROM sababuka.indicators i WHERE i.category_id = c.id);
DELETE FROM sababuka.policy_focuses pf
 WHERE pf.name = 'Indikator Pilot Laporan Antara' AND pf.is_active = false
   AND NOT EXISTS (SELECT 1 FROM sababuka.categories c WHERE c.policy_focus_id = pf.id);

-- 5. Verifikasi akhir: gagal bila masih ada sisa.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM sababuka.users WHERE email IN ('bapperida@sababuka.com', 'kominfo@sababuka.com', 'opd.dinkes@sababuka.com', 'opd.dkpp@sababuka.com') OR email LIKE 'qa.registration.%@sababuka.com') THEN
    RAISE EXCEPTION 'Akun target masih ada';
  END IF;
  IF EXISTS (SELECT 1 FROM sababuka.observations o JOIN sababuka.indicator_versions iv ON iv.id = o.indicator_version_id JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.origin_type = 'rpjmd_master' WHERE o.numeric_value = 0 OR o.source_name ILIKE '%Survei Kesehatan Indonesia%') THEN
    RAISE EXCEPTION 'Nilai demo masih ada';
  END IF;
  IF EXISTS (SELECT 1 FROM sababuka.policy_focuses WHERE name = 'Indikator Pilot Laporan Antara') THEN
    RAISE EXCEPTION 'Fokus kebijakan pilot masih ada';
  END IF;
END $$;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('075', 'Remove demo accounts, demo values, old notifications, stale invitations and sessions')
ON CONFLICT (version) DO NOTHING;

COMMIT;
