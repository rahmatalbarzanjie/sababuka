import type { Database, QueryResultRow } from "../database.js";
import { inferDirection } from "./direction-inference.js";
import { plainDash } from "./plain-text.js";
import { analyzeDistricts, analyzeSeries, buildNarrative, type DistrictAnalysis, type Direction, type SeriesAnalysis, type SeriesPoint } from "./trend-engine.js";

export interface InsightQuery { limit: number; source?: string | undefined; assessment?: string | undefined; q?: string | undefined; indicatorId?: string | undefined; layer?: "kinerja" | "konteks" | undefined }

interface ObservationRow extends QueryResultRow {
  indicator_id: string; code: string; name: string; origin_type: string; category_name: string; direction: Direction;
  unit_symbol: string | null; unit_name: string | null; source_name: string | null; source_url: string | null; geo_level: string | null; geo_name: string | null; year: number; value: string;
}

export interface LinkedSeries { relation: "primary" | "supporting" | "comparison"; notes: string | null; indicator_id: string; name: string; unit: string; latest_year: number; latest_value: number; change_pct: number | null; trend: SeriesAnalysis["trend"]; source_label: string }

export interface Insight {
  layer: "kinerja" | "konteks"; links: LinkedSeries[]; limited: boolean; source_url: string | null;
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
              u.symbol AS unit_symbol, u.name AS unit_name, o.source_name, o.source_url, g.level AS geo_level, g.name AS geo_name,
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
      const measured = analyzeSeries(points, direction);
      // Seri konteks (Bank Data) tetap ketat; indikator kinerja dengan data kurang dari 3 tahun tetap ditampilkan tanpa penilaian.
      const limited = !measured || measured.years < 3;
      if (limited && first.origin_type === "bank_data") continue;
      const ordered = [...points].sort((a, b) => a.year - b.year);
      const lastPoint = ordered[ordered.length - 1];
      if (!lastPoint) continue;
      const analysis: NonNullable<typeof measured> = limited
        ? { ...(measured ?? { years: ordered.length, first_year: ordered[0]!.year, latest_year: lastPoint.year, latest_value: lastPoint.value, previous_year: null, previous_value: null, change: null, change_pct: null, cagr_pct: null, slope_per_year: 0, slope_pct_of_mean: 0, trend: "stabil" as const, streak: { direction: null, length: 0 }, anomaly: null }), assessment: "netral", score: 0, anomaly: null }
        : measured!;

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
      const opds = (opdMap.get(indicatorId) ?? []).sort((a, b) => Number(b.primary) - Number(a.primary)).map((entry) => entry.label);
      const narrative = limited
        ? { headline: "Data belum cukup untuk tren", detail: `Baru ada ${analysis.years} tahun data (terbaru ${analysis.latest_year}). Tren dan penilaian memerlukan minimal 3 tahun data.`, recommendation: "Lengkapi data tahun-tahun sebelumnya agar tren dapat dinilai." }
        : buildNarrative({ name: plainDash(first.name), unit, analysis, districts, opds, direction });
      insights.push({
        layer: first.origin_type === "bank_data" ? "konteks" : "kinerja", links: [], limited, source_url: [...items].reverse().find((entry) => entry.source_url?.toLowerCase().startsWith("http"))?.source_url ?? null,
        indicator_id: indicatorId, code: first.code, name: plainDash(first.name), category: plainDash(first.category_name), source_kind: sourceKind(first.origin_type, first.code),
        unit, latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend,
        assessment: analysis.assessment, score: analysis.score, ...narrative, opds, direction_inferred: !first.direction && direction !== null, source_label: plainDash(items.find((entry) => entry.source_name)?.source_name ?? "") || (sourceKind(first.origin_type, first.code) === "rpjmd" ? "RPJMD Kabupaten Kapuas" : "Sumber resmi"),
        series: points.sort((a, b) => a.year - b.year).slice(-10), analysis, districts, district_latest: districtLatest, basis,
      });
    }

    // Tautan manual Seri Data ke indikator RPJMD: seri yang dapat dianalisis dilampirkan sebagai data pendukung/pembanding.
    const byId = new Map(insights.map((item) => [item.indicator_id, item]));
    const linkRows = await this.db.query<QueryResultRow & { rpjmd_id: string; series_id: string; relation_type: LinkedSeries["relation"]; notes: string | null }>(
      `SELECT rpjmd_indicator_id::text AS rpjmd_id, series_indicator_id::text AS series_id, relation_type, notes FROM sababuka.indicator_series_links ORDER BY relation_type, created_at`,
    );
    for (const link of linkRows.rows) {
      const owner = byId.get(link.rpjmd_id); const series = byId.get(link.series_id);
      if (!owner || !series) continue;
      owner.links.push({ relation: link.relation_type, notes: link.notes ? plainDash(link.notes) : null, indicator_id: series.indicator_id, name: series.name, unit: series.unit, latest_year: series.latest_year, latest_value: series.latest_value, change_pct: series.change_pct, trend: series.trend, source_label: series.source_label });
    }

    const scoped = query.layer ? insights.filter((item) => item.layer === query.layer) : insights;
    const needle = query.q?.trim().toLowerCase();
    const filtered = scoped
      .filter((item) => !query.source || item.source_kind === query.source)
      .filter((item) => !query.assessment || item.assessment === query.assessment)
      .filter((item) => !needle || `${item.name} ${item.category}`.toLowerCase().includes(needle))
      .sort((a, b) => b.score - a.score);
    return {
      generated_at: new Date().toISOString(),
      analyzed: scoped.length,
      context: { series: insights.filter((item) => item.layer === "konteks").length, linked: insights.filter((item) => item.layer === "kinerja" && item.links.length > 0).length },
      summary: {
        membaik: scoped.filter((item) => item.assessment === "membaik").length,
        memburuk: scoped.filter((item) => item.assessment === "memburuk").length,
        naik: scoped.filter((item) => item.trend === "naik").length,
        turun: scoped.filter((item) => item.trend === "turun").length,
        anomali: scoped.filter((item) => item.analysis.anomaly?.is_anomaly).length,
      },
      insights: filtered.slice(0, query.limit),
    };
  }
}
