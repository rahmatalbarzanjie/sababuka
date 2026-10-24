import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { createDatabase, type QueryResultRow } from "../database.js";

const CONFIRMATION = "SYNC_BPS_RPJMD_VERIFIED";
if (process.env.CONFIRM_BPS_RPJMD_SYNC !== CONFIRMATION) {
  throw new Error(`Set CONFIRM_BPS_RPJMD_SYNC=${CONFIRMATION} untuk menjalankan sinkronisasi ini.`);
}

const IKR_PAGE = "https://kapuaskab.bps.go.id/id/publication/2025/12/31/36a8725e4367286abd0ad42e/welfare-indicators-of-kapuas-regency-2025.html";
const HLS_PAGE = "https://kalteng.bps.go.id/id/statistics-table/2/NDQjMg%3D%3D/harapan-lama-sekolah--2024.html";
const IPM_PAGE = "https://kapuaskab.bps.go.id/id/statistics-table/2/MzMzIzI%3D/-metode-baru-indeks-pembangunan-manusia-ipm-.html";

const series = [
  { code: "TINGKAT_KEMISKINAN", values: { 2025: 5.48 }, sourceUrl: IKR_PAGE, location: "Gambar 8.1, halaman buku 61", sourceName: "BPS Kabupaten Kapuas — Indikator Kesejahteraan Rakyat 2025" },
  { code: "RPJMD_I027_TINGKAT_PENGANGGURAN_TERBUKA_TPT", values: { 2024: 3.61, 2025: 3.51 }, sourceUrl: IKR_PAGE, location: "Gambar 5.3, halaman buku 38", sourceName: "BPS Kabupaten Kapuas — Sakernas Agustus 2023–2025" },
  { code: "RPJMD_I028_TINGKAT_PARTISIPASI_ANGKATAN_KERJA_TPAK", values: { 2024: 71.52, 2025: 67.92 }, sourceUrl: IKR_PAGE, location: "Gambar 5.2, halaman buku 37", sourceName: "BPS Kabupaten Kapuas — Sakernas Agustus 2023–2025" },
  { code: "RPJMD_I029_TPAK_PEREMPUAN", values: { 2024: 53.90, 2025: 51.82 }, sourceUrl: IKR_PAGE, location: "Gambar 5.2, halaman buku 37", sourceName: "BPS Kabupaten Kapuas — Sakernas Agustus 2023–2025" },
  { code: "RPJMD_I030_USIA_HARAPAN_HIDUP_UHH", values: { 2024: 72.86, 2025: 73.02 }, sourceUrl: IKR_PAGE, location: "Gambar 3.1, halaman buku 16", sourceName: "BPS Kabupaten Kapuas — Indeks Pembangunan Manusia 2024–2025" },
  { code: "RPJMD_I036_RATA_RATA_LAMA_SEKOLAH_RLS", values: { 2024: 7.93, 2025: 8.04 }, sourceUrl: IKR_PAGE, location: "Gambar 4.2, halaman buku 27", sourceName: "BPS Kabupaten Kapuas — Indeks Pembangunan Manusia 2021–2025" },
  { code: "RPJMD_I037_HARAPAN_LAMA_SEKOLAH_HLS", values: { 2025: 13.02 }, sourceUrl: HLS_PAGE, location: "Tabel Statistik HLS kabupaten/kota, 2025", sourceName: "BPS Provinsi Kalimantan Tengah — Harapan Lama Sekolah 2025" },
  { code: "RPJMD_I024_INDEKS_PEMBANGUNAN_MANUSIA_IPM", values: { 2024: 71.32 }, sourceUrl: IPM_PAGE, location: "Tabel Statistik IPM kabupaten/kota, 2024", sourceName: "BPS Kabupaten Kapuas — Indeks Pembangunan Manusia 2024" },
] as const;

interface IndicatorRow extends QueryResultRow {
  id: string;
  version_id: string;
  code: string;
  name: string;
  source_reference: string | null;
}

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const requestId = randomUUID();

async function actorFor(roleCode: string) {
  const result = await db.query<{ id: string } & QueryResultRow>(
    `SELECT u.id::text
     FROM sababuka.users u
     JOIN sababuka.user_role_assignments ura ON ura.user_id=u.id AND ura.ends_at IS NULL
     JOIN sababuka.roles r ON r.id=ura.role_id AND r.code=$1
     WHERE u.status='active' AND u.archived_at IS NULL
     ORDER BY u.created_at LIMIT 1`,
    [roleCode],
  );
  if (!result.rows[0]) throw new Error(`Aktor aktif dengan peran ${roleCode} tidak tersedia.`);
  return result.rows[0].id;
}

try {
  const creatorId = await actorFor("superadmin");
  const bapperidaId = await actorFor("bapperida");
  const indicators = await db.query<IndicatorRow>(
    `SELECT i.id::text,iv.id::text AS version_id,i.code,i.name,iv.source_reference
     FROM sababuka.indicators i
     JOIN sababuka.indicator_versions iv ON iv.indicator_id=i.id AND iv.status='active'
     JOIN sababuka.categories c ON c.id=i.category_id
     WHERE i.is_active=true AND i.archived_at IS NULL AND c.code LIKE 'RPJMD%'
     ORDER BY i.code`,
  );
  const indicatorByCode = new Map(indicators.rows.map((row) => [row.code, row]));
  const activeIndicatorCount = indicators.rows.length;
  for (const item of series) {
    if (!indicatorByCode.has(item.code)) throw new Error(`Indikator aktif ${item.code} tidak ditemukan.`);
  }

  await db.query("BEGIN");
  await db.query(
    `INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
     VALUES ('annual','2024','Tahun 2024',DATE '2024-01-01',DATE '2024-12-31'),
            ('annual','2025','Tahun 2025',DATE '2025-01-01',DATE '2025-12-31')
     ON CONFLICT (code) DO NOTHING`,
  );
  const geography = await db.query<{ id: string } & QueryResultRow>("SELECT id::text FROM sababuka.geographies WHERE code='6203'");
  const bpsOrganization = await db.query<{ id: string } & QueryResultRow>("SELECT id::text FROM sababuka.organizations WHERE code='BPS_KAPUAS'");
  if (!geography.rows[0] || !bpsOrganization.rows[0]) throw new Error("Master wilayah Kapuas atau organisasi BPS Kapuas belum tersedia.");

  const profile = await db.query<{ id: string } & QueryResultRow>(
    `INSERT INTO sababuka.metadata_profiles
       (code,name,version_number,description,schema_json,mapping_json,status,created_by,approved_by,approved_at)
     VALUES ('BPS_RPJMD_VERIFIED_SERIES','Seri resmi BPS untuk indikator RPJMD',1,
       'Nilai indikator RPJMD yang diverifikasi langsung dari publikasi atau tabel statistik resmi BPS.',
       '{"year":"integer","value":"number","indicator_code":"string","source_location":"string"}'::jsonb,
       '{"verification":"manual_source_review","geography":"6203"}'::jsonb,
       'active',$1,$2,now())
     ON CONFLICT (code,version_number) DO UPDATE SET status='active',approved_by=EXCLUDED.approved_by,
       approved_at=now(),updated_at=now() RETURNING id::text`,
    [creatorId, bapperidaId],
  );
  const source = await db.query<{ id: string } & QueryResultRow>(
    `INSERT INTO sababuka.data_sources
       (code,name,source_type,base_url,owner_organization_id,connection_config,is_active,last_checked_at,created_by)
     VALUES ('BPS_KAPUAS_RPJMD','BPS Kabupaten Kapuas — Sumber RPJMD','bps',$1,$2,
       '{"verification_mode":"official_publication_and_statistics_table","contains_secrets":false}'::jsonb,true,now(),$3)
     ON CONFLICT (code) DO UPDATE SET base_url=EXCLUDED.base_url,owner_organization_id=EXCLUDED.owner_organization_id,
       connection_config=EXCLUDED.connection_config,is_active=true,last_checked_at=now(),updated_at=now()
     RETURNING id::text`,
    [IKR_PAGE, bpsOrganization.rows[0].id, creatorId],
  );
  const dataset = await db.query<{ id: string } & QueryResultRow>(
    `INSERT INTO sababuka.datasets (code,title,owner_organization_id,source_id,is_active,created_by)
     VALUES ('BPS.KAPUAS.RPJMD.2024_2025','Indikator RPJMD Kabupaten Kapuas dari BPS 2024–2025',$1,$2,true,$3)
     ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title,source_id=EXCLUDED.source_id,is_active=true,updated_at=now()
     RETURNING id::text`,
    [bpsOrganization.rows[0].id, source.rows[0]!.id, creatorId],
  );
  const datasetVersion = await db.query<{ id: string } & QueryResultRow>(
    `INSERT INTO sababuka.dataset_versions
       (dataset_id,version_number,name,title,notes,organization_id,author,maintainer,license_id,visibility,
        metadata_profile_id,metadata_json,effective_from,status,source_modified_at,submitted_by,submitted_at,approved_by,approved_at,created_by)
     VALUES ($1,1,'bps-kapuas-rpjmd-2024-2025','Indikator RPJMD Kabupaten Kapuas dari BPS 2024–2025',
       'Kompilasi nilai yang cocok langsung dengan definisi indikator RPJMD aktif.',$2,'Badan Pusat Statistik',
       'Walidata Kabupaten Kapuas','public-domain','public',$3,$4::jsonb,DATE '2024-01-01','active',now(),$5,now(),$6,now(),$5)
     ON CONFLICT (dataset_id,version_number) DO UPDATE SET notes=EXCLUDED.notes,metadata_json=EXCLUDED.metadata_json,
       status='active',approved_by=EXCLUDED.approved_by,approved_at=now(),updated_at=now()
     RETURNING id::text`,
    [dataset.rows[0]!.id, bpsOrganization.rows[0].id, profile.rows[0]!.id,
      JSON.stringify({ sources: [IKR_PAGE, HLS_PAGE, IPM_PAGE], verification: "direct_manual_review", geography_code: "6203" }),
      creatorId, bapperidaId],
  );
  for (const [externalId, name, url] of [
    ["62030.25027", "Indikator Kesejahteraan Rakyat Kabupaten Kapuas 2025", IKR_PAGE],
    ["BPS-KALTENG-HLS-2025", "Tabel Statistik Harapan Lama Sekolah 2025", HLS_PAGE],
    ["BPS-KAPUAS-IPM-2024", "Tabel Statistik Indeks Pembangunan Manusia 2024", IPM_PAGE],
  ]) {
    await db.query(
      `INSERT INTO sababuka.data_resources (dataset_version_id,external_id,name,format,mime_type,url)
       VALUES ($1,$2,$3,'HTML','text/html',$4)
       ON CONFLICT (dataset_version_id,external_id) WHERE external_id IS NOT NULL
       DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,updated_at=now()`,
      [datasetVersion.rows[0]!.id, externalId, name, url],
    );
  }

  const publicationItems: Array<{ observationId: string; order: number }> = [];
  const imported: Array<{ code: string; year: number; value: number }> = [];
  const skippedExisting: Array<{ code: string; year: number; value: number }> = [];
  let order = 1;
  for (const item of series) {
    const indicator = indicatorByCode.get(item.code)!;
    await db.query(
      `INSERT INTO sababuka.indicator_datasets (indicator_version_id,dataset_version_id,relation_type,field_mapping)
       VALUES ($1,$2,'primary',$3::jsonb)
       ON CONFLICT (indicator_version_id,dataset_version_id) DO UPDATE SET relation_type='primary',field_mapping=EXCLUDED.field_mapping`,
      [indicator.version_id, datasetVersion.rows[0]!.id, JSON.stringify({ indicator_code: item.code, source_location: item.location })],
    );
    await db.query(
      `INSERT INTO sababuka.indicator_source_audits
         (indicator_version_id,audit_status,source_name,source_url,source_period,notes,retrieved_at)
       VALUES ($1,'verified_direct',$2,$3,'2024–2025',$4,now())
       ON CONFLICT (indicator_version_id,source_name,source_period) DO UPDATE SET audit_status='verified_direct',
         source_url=EXCLUDED.source_url,notes=EXCLUDED.notes,retrieved_at=now(),updated_at=now()`,
      [indicator.version_id, item.sourceName, item.sourceUrl, `Cocok langsung dengan definisi indikator; ${item.location}.`],
    );

    for (const [yearText, rawValue] of Object.entries(item.values)) {
      const year = Number(yearText);
      const value = Number(rawValue);
      const existing = await db.query<{ observation_id: string; numeric_value: string } & QueryResultRow>(
        `SELECT ob.id::text AS observation_id,ob.numeric_value::text
         FROM sababuka.publication_items pi
         JOIN sababuka.publications p ON p.id=pi.publication_id AND p.status='active'
         JOIN sababuka.observations ob ON ob.id=pi.observation_id
         JOIN sababuka.periods pe ON pe.id=ob.period_id
         WHERE ob.indicator_version_id=$1 AND pe.code=$2 AND ob.source_status IN ('verified_direct','verified_calculated')
         ORDER BY p.activated_at DESC LIMIT 1`,
        [indicator.version_id, yearText],
      );
      if (existing.rows[0]) {
        if (Math.abs(Number(existing.rows[0].numeric_value) - value) > 0.000001) {
          throw new Error(`Konflik nilai aktif ${item.code} ${year}: ${existing.rows[0].numeric_value} != ${value}`);
        }
        skippedExisting.push({ code: item.code, year, value });
        continue;
      }
      const period = await db.query<{ id: string } & QueryResultRow>("SELECT id::text FROM sababuka.periods WHERE code=$1", [yearText]);
      const importKey = `BPS_RPJMD:${item.code}:${year}`;
      let batch = await db.query<{ id: string } & QueryResultRow>(
        `SELECT id::text FROM sababuka.data_batches
         WHERE dataset_version_id=$1 AND source_metadata->>'import_key'=$2 LIMIT 1`,
        [datasetVersion.rows[0]!.id, importKey],
      );
      if (!batch.rows[0]) {
        batch = await db.query<{ id: string } & QueryResultRow>(
          `INSERT INTO sababuka.data_batches
             (dataset_version_id,organization_id,reporting_period_id,submission_method,source_metadata,row_count,status,
              submitted_by,submitted_at,confirmed_by,confirmed_at,approved_by,approved_at,created_by)
           VALUES ($1,$2,$3,'api_import',$4::jsonb,1,'approved',$5,now(),$6,now(),$6,now(),$5)
           RETURNING id::text`,
          [datasetVersion.rows[0]!.id, bpsOrganization.rows[0].id, period.rows[0]!.id,
            JSON.stringify({ import_key: importKey, source_url: item.sourceUrl, source_location: item.location, extraction_method: "manual_source_review" }),
            creatorId, bapperidaId],
        );
      }
      const observation = await db.query<{ id: string } & QueryResultRow>(
        `INSERT INTO sababuka.observations
           (batch_id,indicator_version_id,period_id,geography_id,numeric_value,quality_status,notes,created_by,
            source_name,source_url,source_status,source_retrieved_at)
         VALUES ($1,$2,$3,$4,$5,'valid',$6,$7,$8,$9,'verified_direct',now())
         ON CONFLICT (batch_id,indicator_version_id,period_id,geography_id,dimension_hash)
         DO UPDATE SET numeric_value=EXCLUDED.numeric_value,quality_status='valid',notes=EXCLUDED.notes,
           source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,source_status='verified_direct',source_retrieved_at=now()
         RETURNING id::text`,
        [batch.rows[0]!.id, indicator.version_id, period.rows[0]!.id, geography.rows[0].id, value,
          `Diverifikasi langsung; ${item.location}.`, creatorId, item.sourceName, item.sourceUrl],
      );
      publicationItems.push({ observationId: observation.rows[0]!.id, order: order++ });
      imported.push({ code: item.code, year, value });
    }
  }

  const verifiedCodes = new Set(series.map((item) => item.code));
  for (const indicator of indicators.rows) {
    if (verifiedCodes.has(indicator.code as (typeof series)[number]["code"])) continue;
    const proposedBps = /\bBPS\b/iu.test(indicator.source_reference ?? "");
    await db.query(
      `INSERT INTO sababuka.indicator_source_audits
         (indicator_version_id,audit_status,source_name,source_url,source_period,notes,retrieved_at)
       VALUES ($1,$2,$3,$4,'RPJMD 2025–2029',$5,now())
       ON CONFLICT (indicator_version_id,source_name,source_period) DO UPDATE SET audit_status=EXCLUDED.audit_status,
         source_url=EXCLUDED.source_url,notes=EXCLUDED.notes,retrieved_at=now(),updated_at=now()`,
      [indicator.version_id, proposedBps ? "candidate" : "requires_opd",
        proposedBps ? "BPS — kandidat sumber indikator RPJMD" : "Sumber sektoral sesuai metadata RPJMD",
        proposedBps ? "https://kapuaskab.bps.go.id/id" : null,
        proposedBps
          ? "Belum ditemukan nilai Kabupaten Kapuas yang cocok langsung dan terverifikasi pada sumber resmi yang diperiksa; jangan diisi otomatis."
          : `Memerlukan data sektoral/OPD atau kementerian sesuai referensi indikator: ${indicator.source_reference ?? "belum ditetapkan"}`],
    );
  }

  let publicationId: string | null = null;
  if (publicationItems.length > 0) {
    const previous = await db.query<{ id: string; version_number: number; status: string } & QueryResultRow>(
      `SELECT id::text,version_number,status FROM sababuka.publications
       WHERE publication_key='BPS_RPJMD_KAPUAS_VERIFIED' ORDER BY version_number DESC LIMIT 1`,
    );
    const version = (previous.rows[0]?.version_number ?? 0) + 1;
    const publication = await db.query<{ id: string } & QueryResultRow>(
      `INSERT INTO sababuka.publications
         (publication_key,version_number,publication_number,title,description,status,effective_at,change_notes,created_by)
       VALUES ('BPS_RPJMD_KAPUAS_VERIFIED',$1,'BPS-RPJMD-'||lpad(($1::integer)::text,3,'0'),
         'Capaian RPJMD Kabupaten Kapuas — sumber BPS terverifikasi',
         'Nilai 2024–2025 yang cocok langsung dengan definisi indikator RPJMD aktif dan diverifikasi dari sumber resmi BPS.',
         'draft',now(),'Hanya nilai dengan kecocokan definisi dan sumber langsung yang dipublikasikan.',$2)
       RETURNING id::text`,
      [version, creatorId],
    );
    publicationId = publication.rows[0]!.id;
    for (const item of publicationItems) {
      await db.query(
        `INSERT INTO sababuka.publication_items (publication_id,observation_id,dataset_version_id,display_order)
         VALUES ($1,$2,$3,$4)`,
        [publicationId, item.observationId, datasetVersion.rows[0]!.id, item.order],
      );
    }
    if (previous.rows[0]?.status === "active") {
      await db.query("UPDATE sababuka.publications SET status='replaced',replaced_by_id=$2,updated_at=now() WHERE id=$1", [previous.rows[0].id, publicationId]);
    }
    await db.query(
      "UPDATE sababuka.publications SET status='active',activated_by=$2,activated_at=now(),updated_at=now() WHERE id=$1",
      [publicationId, bapperidaId],
    );
    await db.query(
      `INSERT INTO sababuka.workflow_actions
         (entity_type,entity_id,action,from_status,to_status,actor_id,actor_role_code,notes,request_id)
       VALUES ('publication',$1,'activate','draft','active',$2,'bapperida',
         'Nilai RPJMD dari BPS diaktifkan setelah verifikasi kecocokan indikator dan sumber.',$3)`,
      [publicationId, bapperidaId, requestId],
    );
  }
  await db.query(
    `INSERT INTO sababuka.audit_events (actor_id,event_type,entity_type,entity_id,metadata,request_id)
     VALUES ($1,'official.bps_rpjmd_sync','publication',$2,$3::jsonb,$4)`,
    [bapperidaId, publicationId, JSON.stringify({ active_rpjmd_indicators: activeIndicatorCount, verified_indicator_count: series.length,
      imported_observation_count: imported.length, skipped_existing_count: skippedExisting.length }), requestId],
  );
  await db.query("COMMIT");
  console.log(JSON.stringify({ publication_id: publicationId, active_rpjmd_indicators: activeIndicatorCount,
    verified_indicators: series.length, imported, skipped_existing: skippedExisting,
    coverage: { verified_direct: series.length, remaining_reviewed: activeIndicatorCount - series.length } }, null, 2));
} catch (error) {
  await db.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
