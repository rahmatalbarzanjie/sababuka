import type { Database, QueryResultRow } from "../database.js";
import { plainDash } from "./plain-text.js";

export interface BankDataCatalogItem {
  indicator_id: string; code: string; name: string; sector: string; source_kind: "bps" | "satudata";
  unit: string; source_name: string; first_year: number; last_year: number; years: number;
  observations: number; districts: number; latest_value: number | null; latest_year: number | null;
}

interface AggRow extends QueryResultRow {
  indicator_id: string; code: string; name: string; category_name: string; unit_symbol: string | null; unit_name: string | null;
  source_name: string | null; first_year: number; last_year: number; years: number; observations: number; districts: number;
}
interface LatestRow extends QueryResultRow { indicator_id: string; year: number; value: string }

/** Katalog seluruh seri Bank Data (BPS dan Satu Data) yang sudah terbit, lengkap dengan jangkauan tahun dan wilayah. */
export class BankDataCatalogService {
  constructor(private readonly db: Database) {}

  async catalog() {
    const base = `FROM sababuka.observations o
       JOIN sababuka.data_batches b ON b.id = o.batch_id AND b.status IN ('approved', 'published')
       JOIN sababuka.indicator_versions iv ON iv.id = o.indicator_version_id AND iv.status = 'active'
       JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.is_active = true AND i.origin_type = 'bank_data'
       JOIN sababuka.categories c ON c.id = i.category_id AND c.is_active = true AND c.review_status = 'approved'
       JOIN sababuka.periods p ON p.id = o.period_id AND p.period_type = 'annual' AND p.code ~ '^[0-9]{4}$'
       JOIN sababuka.units u ON u.id = iv.unit_id
       LEFT JOIN sababuka.geographies g ON g.id = o.geography_id
       WHERE o.numeric_value IS NOT NULL AND o.quality_status IN ('valid', 'warning')
         AND EXISTS (SELECT 1 FROM sababuka.publication_items pi JOIN sababuka.publications pub ON pub.id = pi.publication_id AND pub.status = 'active' WHERE pi.observation_id = o.id)
         AND NOT EXISTS (SELECT 1 FROM sababuka.observation_publication_blocks nb WHERE nb.observation_id = o.id AND nb.reason = 'not_chosen')`;
    const agg = await this.db.query<AggRow>(
      `SELECT i.id::text AS indicator_id, i.code, i.name, c.name AS category_name, u.symbol AS unit_symbol, u.name AS unit_name,
              max(o.source_name) AS source_name, min(p.code::int)::int AS first_year, max(p.code::int)::int AS last_year,
              count(DISTINCT p.code)::int AS years, count(*)::int AS observations,
              count(DISTINCT o.geography_id) FILTER (WHERE g.level = 'district')::int AS districts
       ${base}
       GROUP BY i.id, i.code, i.name, c.name, u.symbol, u.name`,
    );
    const latest = await this.db.query<LatestRow>(
      `SELECT DISTINCT ON (i.id) i.id::text AS indicator_id, p.code::int AS year, o.numeric_value::text AS value
       ${base} AND (o.geography_id IS NULL OR g.level <> 'district')
       ORDER BY i.id, p.code DESC`,
    );
    const latestById = new Map(latest.rows.map((row) => [row.indicator_id, row]));
    const items: BankDataCatalogItem[] = agg.rows.map((row) => {
      const last = latestById.get(row.indicator_id);
      return {
        indicator_id: row.indicator_id, code: row.code, name: plainDash(row.name), sector: plainDash(row.category_name.replace(/^Bank Data · /u, "")),
        source_kind: row.code.startsWith("SD_") ? "satudata" as const : "bps" as const, unit: plainDash(row.unit_symbol || row.unit_name || ""),
        source_name: plainDash(row.source_name ?? ""), first_year: row.first_year, last_year: row.last_year, years: row.years,
        observations: row.observations, districts: row.districts, latest_value: last ? Number(last.value) : null, latest_year: last ? last.year : null,
      };
    }).sort((a, b) => a.sector.localeCompare(b.sector, "id") || a.name.localeCompare(b.name, "id"));
    const sum = (pick: (item: BankDataCatalogItem) => number) => items.reduce((total, item) => total + pick(item), 0);
    return {
      generated_at: new Date().toISOString(),
      summary: {
        series: items.length, observations: sum((item) => item.observations),
        with_districts: items.filter((item) => item.districts > 0).length, max_districts: Math.max(0, ...items.map((item) => item.districts)),
        sectors: new Set(items.map((item) => item.sector)).size, bps: items.filter((item) => item.source_kind === "bps").length,
        satudata: items.filter((item) => item.source_kind === "satudata").length,
        first_year: items.length ? Math.min(...items.map((item) => item.first_year)) : null, last_year: items.length ? Math.max(...items.map((item) => item.last_year)) : null,
      },
      items,
    };
  }
}
