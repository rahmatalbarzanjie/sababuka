import type { Database } from "../database.js";
import { AchievementService, type AchievementItem } from "./achievement-service.js";
import { InsightService, type Insight } from "./insight-service.js";

export interface AssistantOverview {
  /** Tanggal publikasi aktif terbaru (YYYY-MM-DD) atau null bila belum ada. */
  as_of: string | null;
  bertarget: number;
  tercapai: number;
  belum_tercapai: number;
  belum_ada_realisasi: number;
  /** Persen tercapai dari indikator yang sudah punya realisasi dan dapat dinilai; null bila belum ada yang dinilai. */
  persen_tercapai: number | null;
  indikator_dianalisis: number;
  membaik: number;
  memburuk: number;
}

/** Ringkasan kondisi RPJMD untuk sambutan chat Bupati, dihitung dari data terbit yang sama dengan jawaban asisten. */
export function buildOverview(insights: Insight[], achievement: AchievementItem[], asOf: string | null): AssistantOverview {
  const count = (status: AchievementItem["status"]) => achievement.filter((item) => item.status === status).length;
  const tercapai = count("tercapai");
  const belum = count("belum_tercapai");
  const judged = tercapai + belum;
  const kinerja = insights.filter((item) => item.layer === "kinerja");
  return {
    as_of: asOf,
    bertarget: achievement.length,
    tercapai,
    belum_tercapai: belum,
    belum_ada_realisasi: count("belum_ada_data"),
    persen_tercapai: judged > 0 ? Math.round((tercapai / judged) * 100) : null,
    indikator_dianalisis: kinerja.length,
    membaik: kinerja.filter((item) => item.assessment === "membaik").length,
    memburuk: kinerja.filter((item) => item.assessment === "memburuk").length,
  };
}

export async function loadOverview(db: Database): Promise<AssistantOverview> {
  const [insights, achievement, latest] = await Promise.all([
    new InsightService(db).all(),
    new AchievementService(db).list().then((result) => result.items),
    db.query<{ as_of: string | null }>(`SELECT (max(effective_at) AT TIME ZONE 'Asia/Jakarta')::date::text AS as_of FROM sababuka.publications WHERE status = 'active'`),
  ]);
  return buildOverview(insights, achievement, latest.rows[0]?.as_of ?? null);
}
