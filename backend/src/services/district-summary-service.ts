import type { Database, QueryResultRow } from "../database.js";
import { inferDirection } from "./direction-inference.js";
import { plainDash } from "./plain-text.js";

/**
 * Ringkasan status indikator per kecamatan.
 *
 * Rumahan ini membaca SEMUA nilai terbit berdimensi kecamatan, apa pun asalnya (Bank Data BPS sekarang, indikator RPJMD atau
 * usulan OPD kelak). Begitu sebuah indikator memiliki nilai per kecamatan, ia otomatis ikut dihitung dan tampil di peta.
 *  - Bila ada target tingkat kecamatan untuk periode itu, statusnya "tercapai" atau "belum_tercapai".
 *  - Tanpa target, statusnya posisi relatif terhadap 17 kecamatan: "unggul", "sedang", "perhatian" (kuartil atas dan bawah
 *    menurut arah baik-buruk), atau "tanpa_arah" bila arah indikator belum ditetapkan.
 */
export type DistrictStatus = "tercapai" | "belum_tercapai" | "unggul" | "sedang" | "perhatian" | "tanpa_arah";
export type DistrictTrend = "membaik" | "memburuk" | "stabil" | null;

export interface DistrictCell {
  indicator_id: string; name: string; sector: string; unit: string; source_kind: "rpjmd" | "opd" | "bank_data"; direction: "increase" | "decrease" | "maintain" | null;
  year: number; value: number; previous: number | null; change_pct: number | null; trend: DistrictTrend;
  rank: number; of: number; median: number; target: number | null; status: DistrictStatus; source_label: string;
}

export interface DistrictSummary {
  name: string; indicators: number;
  counts: Record<DistrictStatus, number>;
  /** Persentase indikator berarah yang berada di kuartil bawah (perhatian) atau belum mencapai target. Null bila tidak ada yang berarah. */
  attention_index: number | null;
}

interface Row extends QueryResultRow {
  indicator_id: string; name: string; category_name: string; origin_type: string; direction: DistrictCell["direction"];
  unit_symbol: string | null; unit_name: string | null; source_name: string | null; geo_name: string; year: number; value: string; target: string | null;
}

const MIN_DISTRICTS = 8;
const STABLE_PCT = 2;
const STATUSES: DistrictStatus[] = ["tercapai", "belum_tercapai", "unggul", "sedang", "perhatian", "tanpa_arah"];
const TTL_MS = 300_000;

const cleanName = (name: string) => plainDash(name.replace(/^Kecamatan\s+/u, "")).trim();
const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };

/** Menghitung sel indikator-kecamatan dari nilai satu tahun. Fungsi murni agar mudah diuji. */
export function buildCells(input: {
  indicator: Pick<DistrictCell, "indicator_id" | "name" | "sector" | "unit" | "source_kind" | "direction" | "source_label">;
  year: number; current: Map<string, { value: number; target: number | null }>; previous: Map<string, number>;
}): Map<string, DistrictCell> {
  const { indicator, year, current } = input;
  const entries = [...current.entries()];
  const of = entries.length;
  const med = median(entries.map(([, v]) => v.value));
  const directional = indicator.direction === "increase" || indicator.direction === "decrease";
  // Skor kebaikan: makin besar makin baik. Dipakai untuk peringkat dan kuartil.
  const goodness = (value: number) => (indicator.direction === "decrease" ? -value : value);
  const ordered = [...entries].sort((a, b) => goodness(b[1].value) - goodness(a[1].value));
  const rankOf = new Map<string, number>();
  ordered.forEach(([name, v], index) => {
    const prev = ordered[index - 1];
    rankOf.set(name, prev && goodness(prev[1].value) === goodness(v.value) ? rankOf.get(prev[0])! : index + 1);
  });
  const cells = new Map<string, DistrictCell>();
  for (const [name, entry] of entries) {
    const rank = rankOf.get(name)!;
    const previous = input.previous.get(name) ?? null;
    const changePct = previous !== null && previous !== 0 ? ((entry.value - previous) / Math.abs(previous)) * 100 : null;
    let trend: DistrictTrend = null;
    if (changePct !== null) {
      if (Math.abs(changePct) <= STABLE_PCT) trend = "stabil";
      else if (directional) trend = (changePct > 0) === (indicator.direction === "increase") ? "membaik" : "memburuk";
    }
    let status: DistrictStatus;
    if (entry.target !== null) {
      const gap = entry.value - entry.target;
      const pct = entry.target !== 0 ? (gap / Math.abs(entry.target)) * 100 : 0;
      if (indicator.direction === null) status = "tanpa_arah";
      else status = (indicator.direction === "increase" ? gap >= 0 : indicator.direction === "decrease" ? gap <= 0 : Math.abs(pct) <= STABLE_PCT) ? "tercapai" : "belum_tercapai";
    } else if (!directional) status = "tanpa_arah";
    else if (of < 4) status = "sedang";
    else {
      const quartile = Math.max(1, Math.floor(of / 4));
      status = rank <= quartile ? "unggul" : rank > of - quartile ? "perhatian" : "sedang";
    }
    cells.set(name, { ...indicator, year, value: entry.value, previous, change_pct: changePct, trend, rank, of, median: med, target: entry.target, status });
  }
  return cells;
}

export function summarize(name: string, cells: DistrictCell[]): DistrictSummary {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<DistrictStatus, number>;
  for (const cell of cells) counts[cell.status] += 1;
  const judged = counts.tercapai + counts.belum_tercapai + counts.unggul + counts.sedang + counts.perhatian;
  const attention = counts.belum_tercapai + counts.perhatian;
  return { name, indicators: cells.length, counts, attention_index: judged ? Math.round((attention / judged) * 1000) / 10 : null };
}

let cache: { at: number; value: Map<string, DistrictCell[]> } | null = null;

export class DistrictSummaryService {
  constructor(private readonly db: Database) {}

  private async matrix(): Promise<Map<string, DistrictCell[]>> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
    const rows = await this.db.query<Row>(
      `WITH blocked AS MATERIALIZED (SELECT observation_id FROM sababuka.observation_publication_blocks WHERE reason = 'not_chosen')
       SELECT i.id::text AS indicator_id, i.name, c.name AS category_name, i.origin_type, iv.direction,
              u.symbol AS unit_symbol, u.name AS unit_name, o.source_name, g.name AS geo_name, p.code::int AS year,
              o.numeric_value::text AS value, t.numeric_value::text AS target
       FROM sababuka.observations o
       JOIN sababuka.data_batches b ON b.id = o.batch_id AND b.status IN ('approved', 'published')
       JOIN sababuka.indicator_versions iv ON iv.id = o.indicator_version_id AND iv.status = 'active'
       JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.is_active = true
       JOIN sababuka.categories c ON c.id = i.category_id AND c.is_active = true AND c.review_status = 'approved'
       JOIN sababuka.periods p ON p.id = o.period_id AND p.period_type = 'annual' AND p.code ~ '^[0-9]{4}$'
       JOIN sababuka.units u ON u.id = iv.unit_id
       JOIN sababuka.geographies g ON g.id = o.geography_id AND g.level = 'district'
       LEFT JOIN sababuka.targets t ON t.indicator_version_id = iv.id AND t.period_id = o.period_id AND t.geography_id = o.geography_id
         AND t.dimension_values = '{}'::jsonb AND t.numeric_value IS NOT NULL
       WHERE o.numeric_value IS NOT NULL AND o.quality_status IN ('valid', 'warning')
         AND EXISTS (SELECT 1 FROM sababuka.publication_items pi JOIN sababuka.publications pub ON pub.id = pi.publication_id AND pub.status = 'active' WHERE pi.observation_id = o.id)
         AND NOT EXISTS (SELECT 1 FROM blocked nb WHERE nb.observation_id = o.id)
       ORDER BY i.id, p.code`,
    );
    const byIndicator = new Map<string, Row[]>();
    for (const row of rows.rows) byIndicator.set(row.indicator_id, [...(byIndicator.get(row.indicator_id) ?? []), row]);

    const matrix = new Map<string, DistrictCell[]>();
    for (const items of byIndicator.values()) {
      const first = items[0]!;
      const byYear = new Map<number, Map<string, { value: number; target: number | null }>>();
      for (const item of items) {
        const year = byYear.get(item.year) ?? new Map<string, { value: number; target: number | null }>();
        year.set(cleanName(item.geo_name), { value: Number(item.value), target: item.target === null ? null : Number(item.target) });
        byYear.set(item.year, year);
      }
      const years = [...byYear.keys()].sort((a, b) => b - a);
      const latest = years.find((year) => byYear.get(year)!.size >= MIN_DISTRICTS);
      if (latest === undefined) continue;
      const earlier = years.find((year) => year < latest && byYear.get(year)!.size >= MIN_DISTRICTS);
      const previous = new Map<string, number>(earlier === undefined ? [] : [...byYear.get(earlier)!.entries()].map(([name, entry]) => [name, entry.value]));
      const indicator = {
        indicator_id: first.indicator_id, name: plainDash(first.name), sector: plainDash(first.category_name), unit: plainDash(first.unit_symbol || first.unit_name || ""),
        source_kind: (first.origin_type === "rpjmd_master" ? "rpjmd" : first.origin_type === "opd_manual" ? "opd" : "bank_data") as DistrictCell["source_kind"],
        direction: first.direction ?? inferDirection(first.name), source_label: plainDash(items.find((entry) => entry.source_name)?.source_name ?? "") || "Sumber resmi",
      };
      for (const [name, cell] of buildCells({ indicator, year: latest, current: byYear.get(latest)!, previous })) matrix.set(name, [...(matrix.get(name) ?? []), cell]);
    }
    cache = { at: Date.now(), value: matrix };
    return matrix;
  }

  async list() {
    const matrix = await this.matrix();
    const districts = [...matrix.entries()].map(([name, cells]) => summarize(name, cells)).sort((a, b) => a.name.localeCompare(b.name, "id"));
    const all = [...matrix.values()].flat();
    const ids = new Set(all.map((cell) => cell.indicator_id));
    return {
      generated_at: new Date().toISOString(),
      coverage: {
        indicators: ids.size,
        with_target: new Set(all.filter((cell) => cell.target !== null).map((cell) => cell.indicator_id)).size,
        by_source: { rpjmd: new Set(all.filter((c) => c.source_kind === "rpjmd").map((c) => c.indicator_id)).size, opd: new Set(all.filter((c) => c.source_kind === "opd").map((c) => c.indicator_id)).size, bank_data: new Set(all.filter((c) => c.source_kind === "bank_data").map((c) => c.indicator_id)).size },
      },
      districts,
    };
  }

  async detail(name: string) {
    const matrix = await this.matrix();
    const key = [...matrix.keys()].find((candidate) => candidate.toLowerCase() === cleanName(name).toLowerCase());
    if (!key) return null;
    const cells = matrix.get(key)!;
    const order: Record<DistrictStatus, number> = { belum_tercapai: 0, perhatian: 1, tanpa_arah: 4, sedang: 3, unggul: 5, tercapai: 6 };
    return { summary: summarize(key, cells), items: [...cells].sort((a, b) => order[a.status] - order[b.status] || b.of - a.of || a.name.localeCompare(b.name, "id")) };
  }
}
