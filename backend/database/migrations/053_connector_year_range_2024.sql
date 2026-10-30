-- Rentang tahun konektor mengikuti periode jabatan bupati: 2024-2029.
-- Sebelumnya dibatasi 2025-2029 sehingga seri historis 2024 ditolak pada staging.
-- Baris yang ada seluruhnya berada di 2025-2029, jadi pelonggaran ini tidak mengubah data.
ALTER TABLE sababuka.connector_staging_values DROP CONSTRAINT IF EXISTS connector_staging_year_check;
ALTER TABLE sababuka.connector_staging_values
  ADD CONSTRAINT connector_staging_year_check CHECK (year BETWEEN 2024 AND 2029);
