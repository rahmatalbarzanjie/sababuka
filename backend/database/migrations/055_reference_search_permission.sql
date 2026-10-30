-- Izin hanya-baca untuk mencari rujukan metadata data (Satu Data) saat OPD menyusun usulan indikator.
-- Izin ini tidak membuka mapping, staging, ataupun data nilai: hanya judul, deskripsi, dan format dataset.
INSERT INTO sababuka.permissions (code, name, risk_level)
VALUES ('reference.search', 'Cari rujukan metadata data eksternal', 'normal')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'reference.search'
WHERE r.code IN ('opd', 'bapperida', 'superadmin')
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('055', 'read-only reference metadata search permission for indicator proposals')
ON CONFLICT (version) DO NOTHING;
