import type { AchievementItem } from "./achievement-service.js";
import type { Insight } from "./insight-service.js";

/** Bobot skor gabungan kondisi OPD. Ditulis di hasil alat agar Bupati dapat menelusuri dasar penilaian. */
export const OPD_SCORE_WEIGHTS = { capaian_target: 50, arah_tren: 30, kelengkapan_realisasi: 20 } as const;
const MIN_TARGETED = 3;

export type OpdCondition = "baik" | "cukup" | "perlu_perhatian" | "perlu_pembinaan" | "belum_dapat_dinilai";

export interface OpdPerformance {
  nama: string;
  indikator_bertarget: number;
  tercapai: number;
  belum_tercapai: number;
  belum_ada_realisasi: number;
  /** Persen tercapai dari indikator yang sudah punya realisasi dan arah baik-buruk jelas. */
  persen_tercapai: number | null;
  indikator_ber_tren: number;
  membaik: number;
  memburuk: number;
  /** Persen indikator bertarget yang realisasinya sudah terbit. */
  kelengkapan_realisasi: number | null;
  skor: number | null;
  kondisi: OpdCondition;
  tertinggal: Array<{ nama: string; tahun: number | null; realisasi: number | null; target: number | null; selisih_persen: number | null }>;
  memburuk_daftar: string[];
  belum_diisi: string[];
}

const round = (value: number) => Math.round(value);

function conditionOf(score: number | null): OpdCondition {
  if (score === null) return "belum_dapat_dinilai";
  if (score >= 75) return "baik";
  if (score >= 55) return "cukup";
  if (score >= 35) return "perlu_perhatian";
  return "perlu_pembinaan";
}

/**
 * Kondisi dan perkembangan tiap OPD (penanggung jawab utama) dari data yang sudah disetujui dan terbit:
 * capaian terhadap target tahun yang sama, arah tren indikator, dan kelengkapan realisasi.
 * Bukan penilaian kinerja resmi; hanya OPD dengan minimal 3 indikator bertarget dan minimal satu indikator yang sudah terealisasi yang diberi skor.
 */
export function opdPerformance(insights: Insight[], achievement: AchievementItem[]): OpdPerformance[] {
  const groups = new Map<string, OpdPerformance>();
  const entry = (name: string) => {
    let current = groups.get(name);
    if (!current) {
      current = { nama: name, indikator_bertarget: 0, tercapai: 0, belum_tercapai: 0, belum_ada_realisasi: 0, persen_tercapai: null, indikator_ber_tren: 0, membaik: 0, memburuk: 0, kelengkapan_realisasi: null, skor: null, kondisi: "belum_dapat_dinilai", tertinggal: [], memburuk_daftar: [], belum_diisi: [] };
      groups.set(name, current);
    }
    return current;
  };

  for (const item of achievement) {
    const name = item.opds[0];
    if (!name) continue;
    const opd = entry(name);
    opd.indikator_bertarget += 1;
    if (item.status === "tercapai") opd.tercapai += 1;
    if (item.status === "belum_tercapai") opd.belum_tercapai += 1;
    if (item.status === "belum_ada_data") { opd.belum_ada_realisasi += 1; opd.belum_diisi.push(item.name); }
  }
  for (const insight of insights) {
    const name = insight.opds[0];
    if (!name || insight.layer !== "kinerja") continue;
    const opd = entry(name);
    if (insight.assessment === "membaik") { opd.membaik += 1; opd.indikator_ber_tren += 1; }
    if (insight.assessment === "memburuk") { opd.memburuk += 1; opd.indikator_ber_tren += 1; opd.memburuk_daftar.push(insight.name); }
  }
  for (const opd of groups.values()) {
    const judged = opd.tercapai + opd.belum_tercapai;
    opd.persen_tercapai = judged > 0 ? round((opd.tercapai / judged) * 100) : null;
    opd.kelengkapan_realisasi = opd.indikator_bertarget > 0 ? round(((opd.indikator_bertarget - opd.belum_ada_realisasi) / opd.indikator_bertarget) * 100) : null;
    const parts: Array<{ weight: number; value: number }> = [];
    if (opd.persen_tercapai !== null) parts.push({ weight: OPD_SCORE_WEIGHTS.capaian_target, value: opd.persen_tercapai });
    if (opd.indikator_ber_tren > 0) parts.push({ weight: OPD_SCORE_WEIGHTS.arah_tren, value: (opd.membaik / opd.indikator_ber_tren) * 100 });
    if (opd.kelengkapan_realisasi !== null) parts.push({ weight: OPD_SCORE_WEIGHTS.kelengkapan_realisasi, value: opd.kelengkapan_realisasi });
    const weights = parts.reduce((sum, part) => sum + part.weight, 0);
    // Tanpa satu pun indikator yang sudah terealisasi dan dinilai, OPD belum dapat diberi skor (belum ada dasar penilaian capaian).
    opd.skor = opd.indikator_bertarget >= MIN_TARGETED && opd.persen_tercapai !== null && weights > 0 ? round(parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weights) : null;
    opd.kondisi = conditionOf(opd.skor);
    opd.tertinggal = achievement
      .filter((item) => item.opds[0] === opd.nama && item.status === "belum_tercapai")
      .sort((a, b) => Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0))
      .slice(0, 3)
      .map((item) => ({ nama: item.name, tahun: item.latest_year, realisasi: item.latest_value, target: item.target_value, selisih_persen: item.gap_pct === null ? null : Math.round(Math.abs(item.gap_pct) * 10) / 10 }));
    opd.memburuk_daftar = opd.memburuk_daftar.slice(0, 3);
    opd.belum_diisi = opd.belum_diisi.slice(0, 3);
  }
  return [...groups.values()].sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1) || b.indikator_bertarget - a.indikator_bertarget);
}

export const conditionLabel: Record<OpdCondition, string> = { baik: "baik", cukup: "cukup", perlu_perhatian: "perlu perhatian", perlu_pembinaan: "perlu pembinaan", belum_dapat_dinilai: "belum dapat dinilai" };
