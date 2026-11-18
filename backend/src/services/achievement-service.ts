import type { Database, QueryResultRow } from "../database.js";
import { inferDirection } from "./direction-inference.js";
import { plainDash } from "./plain-text.js";

export type AchievementStatus = "tercapai" | "belum_tercapai" | "belum_ada_data" | "tanpa_arah" | "tanpa_target";

export interface AchievementItem {
  indicator_id: string; name: string; sector: string; unit: string; source_kind: "rpjmd" | "opd";
  direction: "increase" | "decrease" | "maintain" | null;
  latest_year: number | null; latest_value: number | null; target_year: number | null; target_value: number | null;
  gap: number | null; gap_pct: number | null; status: AchievementStatus; opds: string[]; follow_up: string;
}

interface VersionRow extends QueryResultRow {
  indicator_id: string; name: string; category_name: string; origin_type: string; direction: "increase" | "decrease" | "maintain" | null;
  unit_symbol: string | null; unit_name: string | null; latest_year: number | null; latest_value: string | null; version_id: string;
}

const MAX_TARGET_YEAR = 2029;
const fmt = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** Capaian indikator RPJMD dan OPD terhadap target tahunan: nilai terbit terbaru dibandingkan target pada tahun yang sama. */
export class AchievementService {
  constructor(private readonly db: Database) {}

  async list() {
    const versions = await this.db.query<VersionRow>(
      `WITH latest AS (
         SELECT DISTINCT ON (iv.id) iv.id AS version_id, regexp_replace(p.code, '\\D', '', 'g')::int AS year, o.numeric_value AS value
         FROM sababuka.observations o
         JOIN sababuka.indicator_versions iv ON iv.id = o.indicator_version_id AND iv.status = 'active'
         JOIN sababuka.periods p ON p.id = o.period_id AND p.period_type = 'annual'
         WHERE o.geography_id IS NULL AND o.numeric_value IS NOT NULL AND o.quality_status IN ('valid', 'warning')
           AND EXISTS (SELECT 1 FROM sababuka.publication_items pi JOIN sababuka.publications pub ON pub.id = pi.publication_id AND pub.status = 'active' WHERE pi.observation_id = o.id)
           AND NOT EXISTS (SELECT 1 FROM sababuka.observation_publication_blocks nb WHERE nb.observation_id = o.id AND nb.reason = 'not_chosen')
         ORDER BY iv.id, p.code DESC
       )
       SELECT i.id::text AS indicator_id, i.name, c.name AS category_name, i.origin_type, iv.direction, iv.id::text AS version_id,
              u.symbol AS unit_symbol, u.name AS unit_name, l.year AS latest_year, l.value::text AS latest_value
       FROM sababuka.indicator_versions iv
       JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.is_active = true AND i.origin_type <> 'bank_data'
       JOIN sababuka.categories c ON c.id = i.category_id
       JOIN sababuka.units u ON u.id = iv.unit_id
       LEFT JOIN latest l ON l.version_id = iv.id
       WHERE iv.status = 'active' AND EXISTS (SELECT 1 FROM sababuka.targets t WHERE t.indicator_version_id = iv.id AND t.geography_id IS NULL AND t.numeric_value IS NOT NULL)`,
    );
    const targetRows = await this.db.query<QueryResultRow & { version_id: string; year: number; value: string }>(
      `SELECT t.indicator_version_id::text AS version_id, regexp_replace(p.code, '\\D', '', 'g')::int AS year, t.numeric_value::text AS value
       FROM sababuka.targets t JOIN sababuka.periods p ON p.id = t.period_id AND p.period_type = 'annual'
       WHERE t.geography_id IS NULL AND t.numeric_value IS NOT NULL AND t.dimension_values = '{}'::jsonb`,
    );
    const opdRows = await this.db.query<QueryResultRow & { indicator_id: string; label: string; is_primary: boolean }>(
      `SELECT r.indicator_id::text, COALESCE(o.short_name, o.name) AS label, r.is_primary
       FROM sababuka.indicator_responsible_opd r JOIN sababuka.organizations o ON o.id = r.organization_id
       UNION ALL
       SELECT i.id::text, COALESCE(o.short_name, o.name), true
       FROM sababuka.indicators i JOIN sababuka.organizations o ON o.id = i.owner_organization_id
       WHERE i.origin_type <> 'bank_data' AND o.code NOT IN ('KAPUAS')`,
    );
    const targets = new Map<string, Map<number, number>>();
    for (const row of targetRows.rows) { const byYear = targets.get(row.version_id) ?? new Map<number, number>(); byYear.set(row.year, Number(row.value)); targets.set(row.version_id, byYear); }
    const opdMap = new Map<string, Array<{ label: string; primary: boolean }>>();
    for (const row of opdRows.rows) {
      const list = opdMap.get(row.indicator_id) ?? [];
      if (!list.some((entry) => entry.label === row.label)) list.push({ label: row.label, primary: row.is_primary });
      opdMap.set(row.indicator_id, list);
    }
    const currentYear = new Date().getFullYear();
    const items: AchievementItem[] = versions.rows.map((row) => {
      const byYear = targets.get(row.version_id) ?? new Map<number, number>();
      const direction = row.direction ?? inferDirection(row.name);
      const latestYear = row.latest_year;
      const latestValue = row.latest_value === null ? null : Number(row.latest_value);
      const entries = (opdMap.get(row.indicator_id) ?? []).sort((a, b) => Number(b.primary) - Number(a.primary));
      const opds = entries.map((entry) => entry.label);
      const joinNames = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}` : names[0] ?? "";
      const leadNames = entries.filter((entry) => entry.primary).map((entry) => entry.label);
      const opdText = joinNames(leadNames.length > 0 ? leadNames : opds.slice(0, 1)) || "OPD penanggung jawab";
      const supportNames = opds.filter((label) => !leadNames.includes(label));
      const supportText = leadNames.length > 0 && supportNames.length > 0 ? ` Dukungan: ${joinNames(supportNames)}.` : "";
      const unit = plainDash(row.unit_symbol || row.unit_name || "");
      const base = { indicator_id: row.indicator_id, name: plainDash(row.name), sector: plainDash(row.category_name), unit, source_kind: row.origin_type === "rpjmd_master" ? "rpjmd" as const : "opd" as const, direction, opds };
      const referenceYear = Math.min(Math.max(currentYear, Math.min(...byYear.keys())), MAX_TARGET_YEAR);
      if (latestYear === null || latestValue === null) {
        const targetYear = byYear.has(referenceYear) ? referenceYear : Math.min(...byYear.keys());
        return { ...base, latest_year: null, latest_value: null, target_year: targetYear, target_value: byYear.get(targetYear) ?? null, gap: null, gap_pct: null, status: "belum_ada_data", follow_up: `Realisasi belum terbit. ${opdText} perlu mengisi capaian di Pelaporan Realisasi dan BAPPERIDA memverifikasinya, agar target ${targetYear} dapat dinilai.` };
      }
      const target = byYear.get(latestYear);
      if (target === undefined) return { ...base, latest_year: latestYear, latest_value: latestValue, target_year: null, target_value: null, gap: null, gap_pct: null, status: "tanpa_target", follow_up: `Data terbaru ${latestYear} belum memiliki target tahunan. BAPPERIDA perlu menetapkan target agar capaian dapat dinilai.` };
      const gap = latestValue - target;
      const gapPct = target !== 0 ? (gap / Math.abs(target)) * 100 : null;
      if (direction === null) return { ...base, latest_year: latestYear, latest_value: latestValue, target_year: latestYear, target_value: target, gap, gap_pct: gapPct, status: "tanpa_arah", follow_up: "Arah baik-buruk indikator belum ditetapkan. BAPPERIDA perlu menetapkannya di Matriks Indikator agar capaian dapat dinilai." };
      const achieved = direction === "increase" ? gap >= 0 : direction === "decrease" ? gap <= 0 : Math.abs(gapPct ?? 0) <= 2;
      return {
        ...base, latest_year: latestYear, latest_value: latestValue, target_year: latestYear, target_value: target, gap, gap_pct: gapPct,
        status: achieved ? "tercapai" as const : "belum_tercapai" as const,
        follow_up: achieved
          ? `Target ${latestYear} tercapai (${fmt(latestValue)} dari target ${fmt(target)}). ${opdText} perlu menjaga capaian dan mendokumentasikan praktik yang berhasil.`
          : `Selisih ${fmt(Math.abs(gap))}${unit ? ` ${unit}` : ""} dari target ${latestYear} (${fmt(latestValue)} dari ${fmt(target)}). ${opdText} perlu menyampaikan rencana percepatan beserta penyebab selisih kepada Bupati, dan BAPPERIDA memantau setiap triwulan.${supportText}`,
      };
    });
    const count = (status: AchievementStatus) => items.filter((item) => item.status === status).length;
    return {
      generated_at: new Date().toISOString(), current_year: currentYear,
      summary: { total: items.length, tercapai: count("tercapai"), belum_tercapai: count("belum_tercapai"), belum_ada_data: count("belum_ada_data"), tanpa_arah: count("tanpa_arah"), tanpa_target: count("tanpa_target") },
      items,
    };
  }
}
