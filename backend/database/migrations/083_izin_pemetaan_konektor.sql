BEGIN;

-- Pemetaan sumber ke indikator adalah tugas BAPPERIDA (permintaan pemilik, 18 Nov 2026). Izin baru connector.map mencakup
-- menyusun dan menyetujui pemetaan, tautan Seri Data, pencarian kandidat, dan registri sumber OPD. Eksekusi impor, sinkron,
-- aktivasi, rahasia konektor, dan Bank Data tetap hanya Developer (connector.manage).
INSERT INTO sababuka.permissions (code, name, risk_level)
VALUES ('connector.map', 'Menyusun dan menyetujui pemetaan sumber data ke indikator', 'elevated')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'connector.map'
WHERE r.code IN ('bapperida', 'superadmin')
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('083', 'connector.map permission for BAPPERIDA')
ON CONFLICT (version) DO NOTHING;

COMMIT;
