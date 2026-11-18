BEGIN;

-- Koreksi target tahunan Indeks Hasil Pengawasan Kearsipan (permintaan pemilik, 18 Nov 2026):
-- 2025 71,94; 2026 71,95; 2027 71,96; 2028 71,97; 2029 71,98 (sebelumnya 71,95 sampai 71,99).
DO $$
DECLARE
  nilai record;
  jumlah integer := 0;
BEGIN
  FOR nilai IN
    SELECT t.id, p.code AS tahun, t.numeric_value AS lama,
           CASE p.code WHEN '2025' THEN 71.94 WHEN '2026' THEN 71.95 WHEN '2027' THEN 71.96 WHEN '2028' THEN 71.97 WHEN '2029' THEN 71.98 END AS baru
    FROM sababuka.targets t
    JOIN sababuka.indicator_versions iv ON iv.id = t.indicator_version_id AND iv.status = 'active'
    JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.code = 'RPJMD_I066_INDEKS_HASIL_PENGAWASAN_KEARSIPAN'
    JOIN sababuka.periods p ON p.id = t.period_id AND p.period_type = 'annual' AND p.code IN ('2025', '2026', '2027', '2028', '2029')
    WHERE t.geography_id IS NULL AND t.dimension_values = '{}'::jsonb
  LOOP
    UPDATE sababuka.targets SET numeric_value = nilai.baru WHERE id = nilai.id;
    INSERT INTO sababuka.audit_events (actor_id, event_type, entity_type, entity_id, before_data, after_data, metadata)
    VALUES ((SELECT id FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1),
            'target.corrected', 'target', nilai.id,
            jsonb_build_object('tahun', nilai.tahun, 'numeric_value', nilai.lama),
            jsonb_build_object('tahun', nilai.tahun, 'numeric_value', nilai.baru),
            jsonb_build_object('reason', 'koreksi target atas permintaan pemilik (migration 081)'));
    jumlah := jumlah + 1;
  END LOOP;
  IF jumlah NOT IN (0, 5) THEN
    RAISE EXCEPTION 'Target Indeks Hasil Pengawasan Kearsipan yang dikoreksi harus 5 baris (atau 0 bila indikator tidak ada), ditemukan %', jumlah;
  END IF;
END
$$;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('081', 'Correct annual targets of archive supervision index')
ON CONFLICT (version) DO NOTHING;

COMMIT;
