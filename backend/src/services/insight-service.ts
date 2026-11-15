import type { Database, QueryResultRow } from "../database.js";
import { inferDirection } from "./direction-inference.js";
import { analyzeDistricts, analyzeSeries, buildNarrative, type DistrictAnalysis, type Direction, type SeriesAnalysis, type SeriesPoint } from "./trend-engine.js";

export interface InsightQuery { limit: number; source?: string | undefined; assessment?: string | undefined; q?: string | undefined; indicatorId?: string | undefined }

interface ObservationRow extends QueryResultRow {
  indicator_id: string; code: string; name: string; origin_type: string; category_name: string; direction: Direction;
  unit_symbol: string | null; unit_name: string | null; source_name: string | null; geo_level: string | null; geo_name: string | null; year: number; value: string;
}

export interface Insight {
  indicator_id: string; code: string; name: string; category: string; source_kind: "rpjmd" | "bps" | "satudata" | "opd";
  unit: string; latest_year: number; latest_value: number; change_pct: number | null; trend: SeriesAnalysis["trend"];
  assessment: SeriesAnalysis["assessment"]; score: number; headline: string; detail: string; recommendation: string;
  opds: string[]; direction_inferred: boolean; source_label: string; series: SeriesPoint[]; analysis: SeriesAnalysis; districts: DistrictAnalysis | null; district_latest: { year: number; items: Array<{ name: string; value: number; previous: number | null }> } | null; basis: "kabupaten" | "total_kecamatan";
}

const NON_ADDITIVE = /rata|persen|indeks|rasio|angka|laju|tingkat|per \d|proporsi|kepadatan|harga|upah/iu;

function sourceKind(origin: string, code: string): Insight["source_kind"] {
  if (origin === "rpjmd_master") return "rpjmd";
  if (origin === "opd_manual") return "opd";
  return code.startsWith("SD_") ? "satudata" : "bps";
}

let cache: { at: number; value: Awaited<ReturnType<InsightService["insights"]>> } | null = null;

export class InsightService {
  constructor(private readonly db: Database) {}

  /** Seluruh indikator yang dapat dianalisis, disimpan 5 menit agar chat dan beranda tidak menghitung ulang. */
  async all(): Promise<Insight[]> {
    if (cache && Date.now() - cache.at < 300_000) return cache.value.insights;
    const value = await this.insights({ limit: 5000 });
    cache = { at: Date.now(), value };
    return value.insights;
  }

  async insights(query: InsightQuery) {
    const rows = await this.db.query<ObservationRow>(
      `SELECT i.id::text AS indicator_id, i.code, i.name, i.origin_type, c.name AS category_name, iv.direction,
              u.symbol AS unit_symbol, u.name AS unit_name, o.source_name, g.level AS geo_level, g.name AS geo_name,
              p.code::int AS year, o.numeric_value::text AS value
       FROM sababuka.observations o
       JOIN sababuka.data_batches b ON b.id = o.batch_id AND b.status IN ('approved', 'published')
       JOIN sababuka.indicator_versions iv ON iv.id = o.indicator_version_id AND iv.status = 'active'
       JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.is_active = true
       JOIN sababuka.categories c ON c.id = i.category_id AND c.is_active = true AND c.review_status = 'approved'
       JOIN sababuka.periods p ON p.id = o.period_id AND p.period_type = 'annual' AND p.code ~ '^[0-9]{4}$'
       JOIN sababuka.units u ON u.id = iv.unit_id
       LEFT JOIN sababuka.geographies g ON g.id = o.geography_id
       WHERE o.numeric_value IS NOT NULL AND o.quality_status IN ('valid', 'warning')
         AND ($1::uuid IS NULL OR i.id = $1::uuid)
         AND EXISTS (SELECT 1 FROM sababuka.publication_items pi JOIN sababuka.publications pub ON pub.id = pi.publication_id AND pub.status = 'active' WHERE pi.observation_id = o.id)
         AND NOT EXISTS (SELECT 1 FROM sababuka.observation_publication_blocks nb WHERE nb.observation_id = o.id AND nb.reason = 'not_chosen')
       ORDER BY i.id, p.code`,
      [query.indicatorId ?? null],
    );
    const opdRows = await this.db.query<QueryResultRow & { indicator_id: string; label: string; is_primary: boolean }>(
      `SELECT r.indicator_id::text, COALESCE(o.short_name, o.name) AS label, r.is_primary
       FROM sababuka.indicator_responsible_opd r JOIN sababuka.organizations o ON o.id = r.organization_id
       UNION ALL
       SELECT i.id::text, COALESCE(o.short_name, o.name), true
       FROM sababuka.indicators i JOIN sababuka.organizations o ON o.id = i.owner_organization_id
       WHERE i.origin_type <> 'bank_data' AND o.code NOT IN ('KAPUAS')`,
    );
    const opdMap = new Map<string, Array<{ label: string; primary: boolean }>>();
    for (const row of opdRows.rows) {
      const list = opdMap.get(row.indicator_id) ?? [];
      if (!list.some((entry) => entry.label === row.label)) list.push({ label: row.label, primary: row.is_primary });
      opdMap.set(row.indicator_id, list);
    }

    const groups = new Map<string, ObservationRow[]>();
    for (const row of rows.rows) groups.set(row.indicator_id, [...(groups.get(row.indicator_id) ?? []), row]);

    const insights: Insight[] = [];
    for (const [indicatorId, items] of groups) {
      const first = items[0]!;
      const unit = first.unit_symbol || first.unit_name || "";
      const regency = new Map<number, number>();
      const districtSeries = new Map<string, Map<number, number>>();
      for (const item of items) {
        const value = Number(item.value);
        if (item.geo_level === "district" && item.geo_name) {
          const series = districtSeries.get(item.geo_name) ?? new Map<number, number>();
          series.set(item.year, value); districtSeries.set(item.geo_name, series);
        } else regency.set(item.year, value);
      }
      let basis: Insight["basis"] = "kabupaten";
      let points: SeriesPoint[] = [...regency.entries()].map(([year, value]) => ({ year, value }));
      if (points.length < 2 && districtSeries.size >= 10 && !unit.includes("%") && !NON_ADDITIVE.test(first.name)) {
        const totals = new Map<number, { sum: number; count: number }>();
        for (const series of districtSeries.values()) for (const [year, value] of series) { const entry = totals.get(year) ?? { sum: 0, count: 0 }; entry.sum += value; entry.count += 1; totals.set(year, entry); }
        const complete = Math.max(...[...totals.values()].map((entry) => entry.count));
        points = [...totals.entries()].filter(([, entry]) => entry.count >= Math.ceil(complete * 0.9)).map(([year, entry]) => ({ year, value: entry.sum }));
        basis = "total_kecamatan";
      }
      const direction = first.direction ?? inferDirection(first.name);
      const analysis = analyzeSeries(points, direction);
      if (!analysis || analysis.years < 3) continue;

      const latestYears = [...new Set([...districtSeries.values()].flatMap((series) => [...series.keys()]))].sort((a, b) => b - a);
      const districtYear = latestYears[0];
      const districts = districtYear === undefined ? null : analyzeDistricts([...districtSeries.entries()].filter(([, series]) => series.has(districtYear)).map(([name, series]) => {
        const earlier = [...series.keys()].filter((year) => year < districtYear).sort((a, b) => b - a)[0];
        return { name: name.replace(/^Kecamatan\s+/u, ""), value: series.get(districtYear)!, previous: earlier === undefined ? null : series.get(earlier)! };
      }));
      const districtLatest = districtYear === undefined ? null : { year: districtYear, items: [...districtSeries.entries()].filter(([, series]) => series.has(districtYear)).map(([name, series]) => {
        const earlier = [...series.keys()].filter((year) => year < districtYear).sort((a, b) => b - a)[0];
        return { name: name.replace(/^Kecamatan\s+/u, ""), value: series.get(districtYear)!, previous: earlier === undefined ? null : series.get(earlier)! };
      }) };
      const opds = (opdMap.get(indicatorId) ?? []).sort((a, b) => Number(b.primary) - Number(a.primary)).slice(0, 2).map((entry) => entry.label);
      const narrative = buildNarrative({ name: first.name, unit, analysis, districts, opds, direction });
      insights.push({
        indicator_id: indicatorId, code: first.code, name: first.name, category: first.category_name, source_kind: sourceKind(first.origin_type, first.code),
        unit, latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend,
        assessment: analysis.assessment, score: analysis.score, ...narrative, opds, direction_inferred: !first.direction && direction !== null, source_label: items.find((entry) => entry.source_name)?.source_name ?? (sourceKind(first.origin_type, first.code) === "rpjmd" ? "RPJMD Kabupaten Kapuas" : "Sumber resmi"),
        series: points.sort((a, b) => a.year - b.year).slice(-10), analysis, districts, district_latest: districtLatest, basis,
      });
    }

    const needle = query.q?.trim().toLowerCase();
    const filtered = insights
      .filter((item) => !query.source || item.source_kind === query.source)
      .filter((item) => !query.assessment || item.assessment === query.assessment)
      .filter((item) => !needle || `${item.name} ${item.category}`.toLowerCase().includes(needle))
      .sort((a, b) => b.score - a.score);
    return {
      generated_at: new Date().toISOString(),
      analyzed: insights.length,
      summary: {
        membaik: insights.filter((item) => item.assessment === "membaik").length,
        memburuk: insights.filter((item) => item.assessment === "memburuk").length,
        naik: insights.filter((item) => item.trend === "naik").length,
        turun: insights.filter((item) => item.trend === "turun").length,
        anomali: insights.filter((item) => item.analysis.anomaly?.is_anomaly).length,
      },
      insights: filtered.slice(0, query.limit),
    };
  }
}
