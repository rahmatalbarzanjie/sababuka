BEGIN;

-- Periode pelaporan semester, triwulan, bulanan, dan mingguan dibuka dari 2019 (sebelumnya mulai 2024),
-- sehingga rentang input data menjadi 2019-2029 (keputusan pemilik, 16 Nov 2026). Periode tahunan sudah 1990-2035.
INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'semester',year_value || '-S' || semester_value,
       'Semester ' || semester_value || ' Tahun ' || year_value,
       make_date(year_value,CASE semester_value WHEN 1 THEN 1 ELSE 7 END,1),
       (make_date(year_value,CASE semester_value WHEN 1 THEN 1 ELSE 7 END,1) + interval '6 months - 1 day')::date
FROM generate_series(2019,2023) AS year_value
CROSS JOIN generate_series(1,2) AS semester_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'quarter',year_value || '-Q' || quarter_value,
       'Triwulan ' || quarter_value || ' Tahun ' || year_value,
       make_date(year_value,1 + ((quarter_value - 1) * 3),1),
       (make_date(year_value,1 + ((quarter_value - 1) * 3),1) + interval '3 months - 1 day')::date
FROM generate_series(2019,2023) AS year_value
CROSS JOIN generate_series(1,4) AS quarter_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'monthly',year_value || '-M' || lpad(month_value::text,2,'0'),
       to_char(make_date(year_value,month_value,1),'TMMonth YYYY'),
       make_date(year_value,month_value,1),
       (make_date(year_value,month_value,1) + interval '1 month - 1 day')::date
FROM generate_series(2019,2023) AS year_value
CROSS JOIN generate_series(1,12) AS month_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'weekly','W-' || to_char(week_start,'YYYY-MM-DD'),
       'Minggu ' || to_char(week_start,'DD Mon YYYY') || ' - ' || to_char(week_start + interval '6 days','DD Mon YYYY'),
       week_start::date,(week_start + interval '6 days')::date
FROM generate_series(DATE '2019-01-07',DATE '2023-12-25',interval '7 days') AS week_start
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('073', 'Open semester, quarter, monthly and weekly reporting periods from 2019')
ON CONFLICT (version) DO NOTHING;

COMMIT;
