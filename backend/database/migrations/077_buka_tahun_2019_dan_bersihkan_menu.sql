BEGIN;

-- 1. OPD dapat menginput realisasi mulai tahun 2019 (termasuk 2024 sebagai tahun dasar); analisis tren
--    memakai seluruh nilai terbit tanpa batas bawah. Sebelumnya versi indikator RPJMD berlaku sejak 2025-01-01,
--    sehingga periode sebelum 2025 tidak muncul pada Pelaporan Realisasi.
UPDATE sababuka.indicator_versions iv
   SET effective_from = DATE '2019-01-01'
  FROM sababuka.indicators i
 WHERE i.id = iv.indicator_id AND i.origin_type <> 'bank_data'
   AND iv.effective_from > DATE '2019-01-01';

-- 2. Menu usang atau placeholder dihapus: Fokus Kebijakan dan Profil Metadata ("sedang disiapkan")
--    serta Ringkasan Bupati lama (digantikan Dashboard Eksekutif). role_menu_items ikut terhapus (CASCADE).
DELETE FROM sababuka.menu_items WHERE code IN ('focuses', 'metadata-profiles', 'executive');

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('077', 'Open reporting from 2019 and remove placeholder menus')
ON CONFLICT (version) DO NOTHING;

COMMIT;
