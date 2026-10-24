BEGIN;

ALTER TABLE sababuka.menu_items
  ADD COLUMN IF NOT EXISTS badge varchar(32),
  ADD COLUMN IF NOT EXISTS navigation_disabled boolean NOT NULL DEFAULT false;

ALTER TABLE sababuka.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_badge_not_blank;

ALTER TABLE sababuka.menu_items
  ADD CONSTRAINT menu_items_badge_not_blank
  CHECK (badge IS NULL OR btrim(badge) <> '');

UPDATE sababuka.menu_items
SET badge = CASE
      WHEN code IN ('focuses', 'datasets', 'metadata-profiles') THEN 'Segera'
      ELSE NULL
    END,
    navigation_disabled = code IN ('focuses', 'datasets', 'metadata-profiles'),
    updated_at = now();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('046', 'data-driven placeholder badges and disabled navigation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
