/** Mesin analisis tren Sababuka: semua angka dihitung pasti di sini; AI/narasi hanya merangkai hasilnya. */

export interface SeriesPoint { year: number; value: number }
export type Direction = "increase" | "decrease" | "maintain" | null;
export type TrendLabel = "naik" | "turun" | "stabil" | "fluktuatif";
export type Assessment = "membaik" | "memburuk" | "netral";

export interface SeriesAnalysis {
  years: number;
  first_year: number;
  latest_year: number;
  latest_value: number;
  previous_year: number | null;
  previous_value: number | null;
  change: number | null;
  change_pct: number | null;
  cagr_pct: number | null;
  slope_per_year: number;
  slope_pct_of_mean: number;
  trend: TrendLabel;
  assessment: Assessment;
  streak: { direction: "naik" | "turun" | null; length: number };
  anomaly: { z_score: number; is_anomaly: boolean } | null;
  score: number;
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const stdev = (values: number[]) => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
};

export function olsSlope(points: SeriesPoint[]): number {
  if (points.length < 2) return 0;
  const xs = points.map((point) => point.year);
  const ys = points.map((point) => point.value);
  const mx = mean(xs); const my = mean(ys);
  const numerator = xs.reduce((sum, x, index) => sum + (x - mx) * (ys[index]! - my), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Hapus duplikat tahun (ambil nilai terakhir) dan urutkan. */
export function normalizeSeries(points: SeriesPoint[]): SeriesPoint[] {
  const byYear = new Map<number, number>();
  for (const point of points) if (Number.isFinite(point.value)) byYear.set(point.year, point.value);
  return [...byYear.entries()].map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year);
}

export function analyzeSeries(input: SeriesPoint[], direction: Direction = null): SeriesAnalysis | null {
  const points = normalizeSeries(input);
  if (points.length < 2) return null;
  const latest = points[points.length - 1]!;
  const previous = points[points.length - 2]!;
  const change = latest.value - previous.value;
  const changePct = previous.value !== 0 ? (change / Math.abs(previous.value)) * 100 : null;
  const span = latest.year - points[0]!.year;
  const first = points[0]!;
  const cagr = span >= 2 && first.value > 0 && latest.value > 0 ? ((latest.value / first.value) ** (1 / span) - 1) * 100 : null;

  const recent = points.slice(-6);
  const slope = olsSlope(recent);
  const avg = mean(recent.map((point) => point.value));
  const slopePct = avg !== 0 ? (slope / Math.abs(avg)) * 100 : 0;

  // Rangkaian naik/turun berturut-turut dari tahun terbaru ke belakang.
  let streakDirection: "naik" | "turun" | null = null; let streakLength = 0;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const step = points[index]!.value - points[index - 1]!.value;
    const current: "naik" | "turun" | null = step > 0 ? "naik" : step < 0 ? "turun" : null;
    if (!current) break;
    if (streakDirection === null) streakDirection = current;
    if (current !== streakDirection) break;
    streakLength += 1;
  }

  const diffs = points.slice(1).map((point, index) => point.value - points[index]!.value);
  const signChanges = diffs.slice(1).filter((diff, index) => Math.sign(diff) !== 0 && Math.sign(diffs[index]!) !== 0 && Math.sign(diff) !== Math.sign(diffs[index]!)).length;
  const fluctuating = diffs.length >= 4 && signChanges >= Math.ceil((diffs.length - 1) * 0.7);
  let trend: TrendLabel;
  if (Math.abs(slopePct) < 1) trend = "stabil";
  else if (fluctuating) trend = "fluktuatif";
  else trend = slope > 0 ? "naik" : "turun";

  let assessment: Assessment = "netral";
  if (direction === "increase" && trend !== "stabil" && trend !== "fluktuatif") assessment = slope > 0 ? "membaik" : "memburuk";
  else if (direction === "decrease" && trend !== "stabil" && trend !== "fluktuatif") assessment = slope < 0 ? "membaik" : "memburuk";

  // Anomali: perubahan terakhir dibanding sebaran perubahan historis.
  let anomaly: SeriesAnalysis["anomaly"] = null;
  if (diffs.length >= 4) {
    const history = diffs.slice(0, -1);
    const spread = stdev(history);
    const z = spread > 0 ? (diffs[diffs.length - 1]! - mean(history)) / spread : 0;
    anomaly = { z_score: Math.round(z * 100) / 100, is_anomaly: Math.abs(z) >= 2 };
  }

  // Skor perhatian: besar perubahan terakhir + kemiringan + anomali + rangkaian; data pendek diturunkan bobotnya.
  const reliability = Math.min(1, points.length / 6);
  const score = reliability * (Math.min(Math.abs(changePct ?? 0), 100) * 0.5 + Math.min(Math.abs(slopePct), 50) + (anomaly?.is_anomaly ? 25 : 0) + Math.min(streakLength, 5) * 3 + (assessment === "memburuk" ? 10 : 0));

  return {
    years: points.length, first_year: first.year, latest_year: latest.year, latest_value: latest.value,
    previous_year: previous.year, previous_value: previous.value, change, change_pct: changePct, cagr_pct: cagr,
    slope_per_year: slope, slope_pct_of_mean: slopePct, trend, assessment,
    streak: { direction: streakDirection, length: streakLength }, anomaly, score: Math.round(score * 10) / 10,
  };
}

export interface DistrictValue { name: string; value: number; previous?: number | null }
export interface DistrictAnalysis {
  count: number;
  highest: DistrictValue[];
  lowest: DistrictValue[];
  spread_ratio: number | null;
  biggest_rise: (DistrictValue & { change_pct: number }) | null;
  biggest_fall: (DistrictValue & { change_pct: number }) | null;
}

export function analyzeDistricts(values: DistrictValue[]): DistrictAnalysis | null {
  const usable = values.filter((item) => Number.isFinite(item.value));
  if (usable.length < 3) return null;
  const sorted = [...usable].sort((a, b) => b.value - a.value);
  const min = sorted[sorted.length - 1]!.value; const max = sorted[0]!.value;
  const changes = usable.filter((item) => item.previous !== null && item.previous !== undefined && item.previous !== 0)
    .map((item) => ({ ...item, change_pct: ((item.value - item.previous!) / Math.abs(item.previous!)) * 100 }))
    .sort((a, b) => b.change_pct - a.change_pct);
  return {
    count: usable.length, highest: sorted.slice(0, 3), lowest: sorted.slice(-3).reverse(),
    spread_ratio: min > 0 ? Math.round((max / min) * 10) / 10 : null,
    biggest_rise: changes.length && changes[0]!.change_pct > 0 ? changes[0]! : null,
    biggest_fall: changes.length && changes[changes.length - 1]!.change_pct < 0 ? changes[changes.length - 1]! : null,
  };
}

const idNumber = (value: number, digits = 1) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);
export const formatPct = (value: number | null) => value === null ? "-" : `${value > 0 ? "+" : ""}${idNumber(value)}%`;

export interface InsightContext { name: string; unit: string; analysis: SeriesAnalysis; districts: DistrictAnalysis | null; opds: string[]; direction: Direction }

/** Ringkasan kalimat dan saran tindak lanjut untuk Bupati, murni dari angka hasil hitung. */
export function buildNarrative(context: InsightContext): { headline: string; detail: string; recommendation: string } {
  const { analysis, districts, opds, name, unit } = context;
  const opdText = opds.length ? opds.join(" dan ") : "OPD terkait";
  const unitText = unit ? ` ${unit}` : "";
  const moved = analysis.change_pct === null ? "" : ` (${formatPct(analysis.change_pct)} dari ${analysis.previous_year})`;
  const lastStep = analysis.change === null ? 0 : Math.sign(analysis.change);
  const conflicting = (analysis.trend === "naik" && lastStep < 0) || (analysis.trend === "turun" && lastStep > 0);
  const verb = conflicting ? "berfluktuasi" : analysis.trend === "naik" ? "meningkat" : analysis.trend === "turun" ? "menurun" : analysis.trend === "fluktuatif" ? "berfluktuasi" : "relatif stabil";
  const headline = `${name} ${verb}: ${idNumber(analysis.latest_value, 2)}${unitText} pada ${analysis.latest_year}${moved}.`;
  const parts: string[] = [];
  if (analysis.streak.length >= 2 && analysis.streak.direction) parts.push(`${analysis.streak.direction === "naik" ? "Naik" : "Turun"} ${analysis.streak.length} tahun berturut-turut.`);
  if (analysis.cagr_pct !== null && analysis.years >= 4) parts.push(`Laju rata-rata ${formatPct(analysis.cagr_pct)} per tahun sejak ${analysis.first_year}.`);
  if (analysis.anomaly?.is_anomaly) parts.push("Perubahan terakhir tergolong tidak biasa dibanding riwayat sebelumnya.");
  if (districts?.biggest_fall && analysis.trend === "turun") parts.push(`Penurunan terbesar di Kecamatan ${districts.biggest_fall.name} (${formatPct(districts.biggest_fall.change_pct)}).`);
  else if (districts?.biggest_rise) parts.push(`Kenaikan terbesar di Kecamatan ${districts.biggest_rise.name} (${formatPct(districts.biggest_rise.change_pct)}).`);
  if (districts?.spread_ratio && districts.spread_ratio >= 3) parts.push(`Kesenjangan antarkecamatan lebar: tertinggi ${districts.highest[0]!.name}, terendah ${districts.lowest[0]!.name} (${districts.spread_ratio}x).`);
  const detail = parts.join(" ") || "Belum ada pola khusus selain perubahan tahunan di atas.";

  let recommendation: string;
  if (analysis.assessment === "memburuk") {
    const where = districts?.biggest_fall ? ` terutama di Kecamatan ${districts.biggest_fall.name}` : districts?.lowest[0] ? ` terutama di Kecamatan ${districts.lowest[0].name}` : "";
    recommendation = `Minta ${opdText} menjelaskan penyebab kemunduran${where} dan menyiapkan langkah pemulihan dengan target tahun berikutnya.`;
  } else if (analysis.assessment === "membaik") {
    recommendation = `Pertahankan capaian: minta ${opdText} merinci program yang berhasil agar dapat direplikasi, dan periksa kecamatan yang tertinggal${districts?.lowest[0] ? ` (${districts.lowest[0].name})` : ""}.`;
  } else if (analysis.trend === "fluktuatif" || analysis.anomaly?.is_anomaly) {
    recommendation = `Minta ${opdText} memeriksa kualitas pencatatan dan faktor musiman sebelum mengambil keputusan berbasis angka ini.`;
  } else {
    recommendation = `Pantau terus bersama ${opdText}; tidak ada tindakan mendesak dari pola saat ini.`;
  }
  return { headline, detail, recommendation };
}
