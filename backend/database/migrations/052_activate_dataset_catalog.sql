BEGIN;

UPDATE sababuka.menu_items
SET badge = NULL,
    navigation_disabled = false,
    updated_at = now()
WHERE code = 'datasets'
  AND route_name = '/governance/datasets';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('052', 'activate functional dataset catalog')
ON CONFLICT (version) DO NOTHING;

COMMIT;
