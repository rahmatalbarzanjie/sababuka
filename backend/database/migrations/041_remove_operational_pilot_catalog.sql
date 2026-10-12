BEGIN;

-- Bersihkan katalog pembuktian integrasi yang pernah dimuat oleh skrip pilot.
-- Master sumber BPS/Satu Data tetap dipertahankan untuk integrasi resmi berikutnya.
CREATE TEMP TABLE _pilot_indicator_versions ON COMMIT DROP AS
SELECT iv.id
FROM sababuka.indicator_versions iv
JOIN sababuka.indicators i ON i.id = iv.indicator_id
WHERE i.code IN (
  'SATUDATA_RASIO_ELEKTRIFIKASI_MANTANGAI',
  'BPS_JUMLAH_PELANGGAN_LISTRIK_KAPUAS',
  'BPS_WISATAWAN_DOMESTIK_KAPUAS'
);

CREATE TEMP TABLE _pilot_observations ON COMMIT DROP AS
WITH RECURSIVE related AS (
  SELECT o.id
  FROM sababuka.observations o
  WHERE o.indicator_version_id IN (SELECT id FROM _pilot_indicator_versions)
  UNION
  SELECT child.id
  FROM sababuka.observations child
  JOIN related parent ON child.supersedes_id = parent.id
)
SELECT id FROM related;

CREATE TEMP TABLE _pilot_dataset_versions ON COMMIT DROP AS
SELECT dv.id
FROM sababuka.dataset_versions dv
JOIN sababuka.datasets d ON d.id = dv.dataset_id
WHERE d.code IN (
  'BPS.KAPUAS.PELANGGAN_LISTRIK.2026',
  'BPS.KAPUAS.WISATAWAN_DOMESTIK.2026'
);

CREATE TEMP TABLE _pilot_batches ON COMMIT DROP AS
SELECT DISTINCT b.id
FROM sababuka.data_batches b
LEFT JOIN sababuka.observations o ON o.batch_id = b.id
WHERE b.dataset_version_id IN (SELECT id FROM _pilot_dataset_versions)
   OR o.id IN (SELECT id FROM _pilot_observations);

CREATE TEMP TABLE _pilot_publications ON COMMIT DROP AS
SELECT DISTINCT p.id
FROM sababuka.publications p
LEFT JOIN sababuka.publication_items pi ON pi.publication_id = p.id
WHERE p.publication_key IN (
  'SATUDATA_OPERASIONAL_MANTANGAI',
  'BPS_KAPUAS_TREN_OPERASIONAL',
  'AUTO_SATUDATA_RASIO_ELEKTRIFIKASI_MANTANGAI',
  'AUTO_BPS_JUMLAH_PELANGGAN_LISTRIK_KAPUAS',
  'AUTO_BPS_WISATAWAN_DOMESTIK_KAPUAS'
)
   OR pi.observation_id IN (SELECT id FROM _pilot_observations);

CREATE TEMP TABLE _pilot_publication_items ON COMMIT DROP AS
SELECT pi.id
FROM sababuka.publication_items pi
WHERE pi.publication_id IN (SELECT id FROM _pilot_publications)
   OR pi.observation_id IN (SELECT id FROM _pilot_observations)
   OR pi.dataset_version_id IN (SELECT id FROM _pilot_dataset_versions);

DELETE FROM sababuka.assistant_citations
WHERE publication_item_id IN (SELECT id FROM _pilot_publication_items);

UPDATE sababuka.publications
SET replaced_by_id = NULL
WHERE replaced_by_id IN (SELECT id FROM _pilot_publications);

UPDATE sababuka.publications
SET status = 'draft', effective_at = NULL, updated_at = now()
WHERE id IN (SELECT id FROM _pilot_publications);

DELETE FROM sababuka.publication_items
WHERE id IN (SELECT id FROM _pilot_publication_items);

DELETE FROM sababuka.publications
WHERE id IN (SELECT id FROM _pilot_publications);

ALTER TABLE sababuka.workflow_actions DISABLE TRIGGER workflow_actions_append_only;
DELETE FROM sababuka.workflow_actions
WHERE entity_id IN (SELECT id FROM _pilot_indicator_versions)
   OR entity_id IN (SELECT id FROM _pilot_dataset_versions)
   OR entity_id IN (SELECT id FROM _pilot_publications)
   OR entity_id IN (SELECT id FROM _pilot_batches)
   OR batch_id IN (SELECT id FROM _pilot_batches);
ALTER TABLE sababuka.workflow_actions ENABLE TRIGGER workflow_actions_append_only;

DELETE FROM sababuka.notifications
WHERE entity_id IN (SELECT id FROM _pilot_indicator_versions)
   OR entity_id IN (SELECT id FROM _pilot_dataset_versions)
   OR entity_id IN (SELECT id FROM _pilot_publications)
   OR entity_id IN (SELECT id FROM _pilot_batches);

DELETE FROM sababuka.submission_evidence
WHERE indicator_version_id IN (SELECT id FROM _pilot_indicator_versions)
   OR batch_id IN (SELECT id FROM _pilot_batches);

DELETE FROM sababuka.validation_issues
WHERE observation_id IN (SELECT id FROM _pilot_observations)
   OR batch_id IN (SELECT id FROM _pilot_batches);

-- Hapus mapping lebih dahulu agar connector run tidak lagi menahan batch impor.
DELETE FROM sababuka.indicator_source_mappings
WHERE indicator_version_id IN (SELECT id FROM _pilot_indicator_versions)
   OR dataset_version_id IN (SELECT id FROM _pilot_dataset_versions);

DELETE FROM sababuka.observations
WHERE id IN (SELECT id FROM _pilot_observations);

DELETE FROM sababuka.data_batches b
WHERE b.id IN (SELECT id FROM _pilot_batches)
  AND NOT EXISTS (SELECT 1 FROM sababuka.observations o WHERE o.batch_id = b.id);

DELETE FROM sababuka.targets
WHERE indicator_version_id IN (SELECT id FROM _pilot_indicator_versions);

DELETE FROM sababuka.indicator_versions
WHERE id IN (SELECT id FROM _pilot_indicator_versions);

DELETE FROM sababuka.indicators
WHERE code IN (
  'SATUDATA_RASIO_ELEKTRIFIKASI_MANTANGAI',
  'BPS_JUMLAH_PELANGGAN_LISTRIK_KAPUAS',
  'BPS_WISATAWAN_DOMESTIK_KAPUAS'
);

DELETE FROM sababuka.dataset_versions
WHERE id IN (SELECT id FROM _pilot_dataset_versions);

DELETE FROM sababuka.datasets
WHERE code IN (
  'BPS.KAPUAS.PELANGGAN_LISTRIK.2026',
  'BPS.KAPUAS.WISATAWAN_DOMESTIK.2026'
);

DELETE FROM sababuka.metadata_profiles mp
WHERE mp.code = 'OFFICIAL_PDF_TABLE_ANNUAL'
  AND NOT EXISTS (SELECT 1 FROM sababuka.dataset_versions dv WHERE dv.metadata_profile_id = mp.id);

DELETE FROM sababuka.categories c
WHERE c.code IN ('SATUDATA_LAYANAN_DASAR', 'OPERASIONAL_EKONOMI_PARIWISATA')
  AND NOT EXISTS (SELECT 1 FROM sababuka.indicators i WHERE i.category_id = c.id);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('041', 'remove operational pilot categories, indicators, datasets, and publications')
ON CONFLICT (version) DO NOTHING;

COMMIT;
