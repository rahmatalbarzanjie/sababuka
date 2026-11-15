import type { Insight } from "./insight-service.js";
import { formatPct } from "./trend-engine.js";

const STOP = new Set(["apa", "apakah", "berapa", "bagaimana", "gimana", "dan", "atau", "yang", "dari", "untuk", "pada", "di", "ke", "tahun", "data", "capaian", "indikator", "tampilkan", "jelaskan", "nilai", "tolong", "dong", "saya", "kita", "kapuas", "kabupaten", "ini", "itu", "ada", "saja", "mana", "siapa", "sih", "lagi", "terbaru", "sekarang", "tren", "perkembangan", "kondisi", "rekomendasi", "saran", "kecamatan", "wilayah", "opd", "dinas", "bertanggung", "jawab", "penanggung", "dengan", "oleh", "akan", "bisa", "mohon", "lihat", "beri", "berikan"]);

export const tokenize = (value: string) => [...new Set(value.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/gu, " ").split(/\s+/u).filter((word) => word.length > 2 && !STOP.has(word) && !/^\d{4}$/u.test(word)))];

export interface Intent {
  overview: boolean; district: boolean; opd: boolean; recommendation: boolean;
  worsening: boolean; improving: boolean; year: number | null; tokens: string[];
}

export function parseIntent(question: string): Intent {
  const text = question.toLocaleLowerCase("id-ID");
  const year = text.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/u);
  const tokens = tokenize(question);
  return {
    overview: /ringkas|rangkum|gambaran|overview|laporan|apa saja|perlu perhatian|prioritas|kabar|situasi|kondisi (umum|kabupaten)/u.test(text) || tokens.length === 0,
    district: /kecamatan|wilayah|daerah mana|peta|sebaran/u.test(text),
    opd: /\bopd\b|dinas|bertanggung|penanggung|siapa yang/u.test(text),
    recommendation: /rekomendasi|saran|tindak lanjut|harus|sebaiknya|langkah|solusi/u.test(text),
    worsening: /turun|menurun|memburuk|buruk|masalah|mundur|naik tajam/u.test(text),
    improving: /membaik|meningkat|bagus|berhasil|maju/u.test(text),
    year: year ? Number(year[1]) : null,
    tokens,
  };
}

/** Cocokkan kata pertanyaan dengan nama indikator/kategori/OPD. Kata yang jarang muncul diberi bobot lebih. */
export function matchInsights(tokens: string[], insights: Insight[], limit = 3): Array<{ insight: Insight; score: number }> {
  if (!tokens.length) return [];
  const docs = insights.map((insight) => ({ insight, words: tokenize(`${insight.name} ${insight.category} ${insight.opds.join(" ")}`) }));
  const df = new Map<string, number>();
  for (const doc of docs) for (const token of tokens) if (doc.words.some((word) => word.includes(token) || token.includes(word))) df.set(token, (df.get(token) ?? 0) + 1);
  const scored = docs.map((doc) => {
    let score = 0; let hits = 0;
    for (const token of tokens) {
      if (!doc.words.some((word) => word === token)) { if (doc.words.some((word) => word.includes(token) || token.includes(word))) { score += 0.5 * Math.log(1 + docs.length / (df.get(token) ?? 1)); hits += 0.5; } continue; }
      score += Math.log(1 + docs.length / (df.get(token) ?? 1)); hits += 1;
    }
    const coverage = hits / tokens.length;
    return { insight: doc.insight, score: score * (0.5 + coverage) + doc.insight.score * 0.01 };
  }).filter((item) => item.score > 0.8 && tokens.some((token) => tokenize(`${item.insight.name} ${item.insight.category}`).some((word) => word.includes(token) || token.includes(word))));
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

const num = (value: number, digits = 2) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);

export interface Visual {
  kind: "trend" | "districts";
  title: string; unit: string;
  points?: Array<{ year: number; value: number }>;
  year?: number; items?: Array<{ name: string; value: number }>;
}
export interface AssistantReply { facts: unknown; answer: string; visuals: Visual[]; suggestions: string[]; sources: Array<{ label: string; indicator: string; year: number; source: string }>; sufficiency: "sufficient" | "partial" | "insufficient" }

const factOf = (insight: Insight) => ({
  indikator: insight.name, kategori: insight.category, satuan: insight.unit, tahun_terbaru: insight.latest_year,
  nilai_terbaru: num(insight.latest_value), perubahan_persen: insight.change_pct === null ? null : formatPct(insight.change_pct),
  tren: insight.trend, penilaian: insight.assessment, ringkasan: insight.headline, rincian: insight.detail, saran: insight.recommendation,
  opd: insight.opds, sumber: insight.source_label, riwayat: insight.series.map((point) => `${point.year}: ${num(point.value)}`),
  kecamatan: insight.districts ? { tertinggi: insight.districts.highest.map((item) => `${item.name}: ${num(item.value)}`), terendah: insight.districts.lowest.map((item) => `${item.name}: ${num(item.value)}`) } : null,
});
const sourceOf = (insight: Insight) => ({ label: `${insight.name} · ${insight.latest_year}`, indicator: insight.name, year: insight.latest_year, source: insight.source_label });

export function buildReply(question: string, insights: Insight[]): AssistantReply {
  const intent = parseIntent(question);
  const matches = intent.overview && !intent.tokens.length ? [] : matchInsights(intent.tokens, insights);
  const total = insights.length;

  if (!matches.length) {
    const concerning = insights.filter((item) => item.assessment === "memburuk" || item.analysis.anomaly?.is_anomaly).sort((a, b) => b.score - a.score).slice(0, 4);
    const improving = insights.filter((item) => item.assessment === "membaik").length;
    if (!insights.length) return { facts: null, answer: "Belum ada data terpublikasi yang cukup untuk dianalisis.", visuals: [], suggestions: [], sources: [], sufficiency: "insufficient" };
    if (!intent.overview) {
      const sample = [...insights].sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.name);
      return { facts: null, answer: `Saya belum menemukan indikator yang cocok dengan pertanyaan itu di ${total} indikator yang tersedia. Coba sebutkan nama indikatornya, misalnya: ${sample.join("; ")}.`, visuals: [], suggestions: sample.map((name) => `Bagaimana tren ${name}?`), sources: [], sufficiency: "insufficient" };
    }
    const lines = concerning.map((item) => `• ${item.headline} ${item.opds.length ? `(${item.opds.join(", ")})` : ""}`);
    const answer = `Dari ${total} indikator yang dianalisis, ${improving} menunjukkan perbaikan dan ${insights.filter((item) => item.assessment === "memburuk").length} memburuk. ${concerning.length ? `Yang paling perlu perhatian:\n${lines.join("\n")}` : "Tidak ada indikator yang menunjukkan kemunduran tajam saat ini."}`;
    return { facts: { mode: "ringkasan", total_indikator: total, membaik: improving, memburuk: insights.filter((item) => item.assessment === "memburuk").length, perlu_perhatian: concerning.map(factOf) }, answer, visuals: [], suggestions: concerning.slice(0, 3).map((item) => `Apa rekomendasi untuk ${item.name}?`), sources: concerning.map(sourceOf), sufficiency: "partial" };
  }

  const top = matches[0]!.insight;
  const parts: string[] = [];
  const visuals: Visual[] = [{ kind: "trend", title: top.name, unit: top.unit, points: top.series }];
  if (intent.year) {
    const at = top.series.find((point) => point.year === intent.year);
    const before = top.series.find((point) => point.year === intent.year! - 1);
    parts.push(at ? `${top.name} pada ${intent.year}: ${num(at.value)}${top.unit ? ` ${top.unit}` : ""}${before && before.value !== 0 ? ` (${formatPct(((at.value - before.value) / Math.abs(before.value)) * 100)} dari ${intent.year - 1})` : ""}.` : `Tidak ada data ${top.name} untuk ${intent.year}. Data tersedia ${top.analysis.first_year}-${top.analysis.latest_year}.`);
  }
  parts.push(top.headline);
  if (top.detail) parts.push(top.detail);
  if (top.opds.length) parts.push(`OPD penanggung jawab: ${top.opds.join(", ")}.`);
  if (intent.district && top.districts) {
    const d = top.districts;
    parts.push(`Per kecamatan (${top.latest_year}): tertinggi ${d.highest.map((item) => `${item.name} (${num(item.value)})`).join(", ")}; terendah ${d.lowest.map((item) => `${item.name} (${num(item.value)})`).join(", ")}.`);
    visuals.push({ kind: "districts", title: `${top.name} per kecamatan`, unit: top.unit, year: top.latest_year, items: [...d.highest, ...d.lowest.slice().reverse()].filter((item, index, all) => all.findIndex((other) => other.name === item.name) === index).map((item) => ({ name: item.name, value: item.value })) });
  } else if (intent.district && !top.districts) parts.push("Data per kecamatan untuk indikator ini belum tersedia.");
  if (intent.recommendation || top.assessment === "memburuk" || top.analysis.anomaly?.is_anomaly) parts.push(`Tindak lanjut: ${top.recommendation}`);
  const others = matches.slice(1);
  const suggestions = [
    top.districts && !intent.district ? `Bagaimana sebaran ${top.name} per kecamatan?` : null,
    !intent.recommendation ? `Apa rekomendasi untuk ${top.name}?` : null,
    ...others.map((item) => `Bagaimana tren ${item.insight.name}?`),
  ].filter((value): value is string => Boolean(value)).slice(0, 3);
  return { facts: { mode: "indikator", tahun_ditanyakan: intent.year, indikator: matches.map((item) => factOf(item.insight)) }, answer: parts.join(" "), visuals, suggestions, sources: [sourceOf(top), ...others.map((item) => sourceOf(item.insight))], sufficiency: top.analysis.years >= 4 ? "sufficient" : "partial" };
}
