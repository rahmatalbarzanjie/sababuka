BEGIN;

UPDATE sababuka.menu_items
SET label = 'Pusat Sinkronisasi Data', updated_at = now()
WHERE code = 'connectors';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('048', 'dashboard system and data synchronization center label')
ON CONFLICT (version) DO NOTHING;

COMMIT;
