BEGIN;

-- Teks tampilan tidak memakai tanda pisah panjang/sedang (em dash, en dash); diganti tanda hubung biasa (keputusan pemilik, 15 Nov 2026).
-- Nilai observations.source_name sengaja tidak diubah karena observasi terbit tidak dapat diubah; antarmuka dan API membersihkannya saat ditampilkan.
CREATE OR REPLACE FUNCTION sababuka.plain_dash(value text) RETURNS text
LANGUAGE sql IMMUTABLE AS $fn$
    SELECT regexp_replace(regexp_replace(value, E'\\s+[\\u2013\\u2014]\\s+', ' - ', 'g'), E'[\\u2013\\u2014]', '-', 'g')
$fn$;

UPDATE sababuka.indicators SET name = sababuka.plain_dash(name) WHERE name ~ E'[\\u2013\\u2014]';
UPDATE sababuka.categories SET name = sababuka.plain_dash(name) WHERE name ~ E'[\\u2013\\u2014]';
UPDATE sababuka.datasets SET title = sababuka.plain_dash(title) WHERE title ~ E'[\\u2013\\u2014]';
UPDATE sababuka.dataset_versions SET title = sababuka.plain_dash(title) WHERE title ~ E'[\\u2013\\u2014]';
UPDATE sababuka.indicator_source_audits SET source_name = sababuka.plain_dash(source_name) WHERE source_name ~ E'[\\u2013\\u2014]';
UPDATE sababuka.indicator_versions SET definition = sababuka.plain_dash(definition) WHERE definition ~ E'[\\u2013\\u2014]';
UPDATE sababuka.indicator_versions SET source_reference = sababuka.plain_dash(source_reference) WHERE source_reference ~ E'[\\u2013\\u2014]';
UPDATE sababuka.periods SET label = sababuka.plain_dash(label) WHERE label ~ E'[\\u2013\\u2014]';
UPDATE sababuka.publications SET title = sababuka.plain_dash(title) WHERE title ~ E'[\\u2013\\u2014]';
UPDATE sababuka.notifications SET message = sababuka.plain_dash(message) WHERE message ~ E'[\\u2013\\u2014]';
UPDATE sababuka.assistant_messages SET content = sababuka.plain_dash(content) WHERE content ~ E'[\\u2013\\u2014]';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('072', 'Replace em dash and en dash in display text with hyphen')
ON CONFLICT (version) DO NOTHING;

COMMIT;
