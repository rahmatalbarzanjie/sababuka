import { plain } from "./text";

export type Assessment = "membaik" | "memburuk" | "netral";
export interface DistrictValue { name: string; value: number; previous: number | null }
export interface Insight {
  indicator_id: string; name: string; category: string; unit: string; latest_year: number; latest_value: number;
  change_pct: number | null; trend: "naik" | "turun" | "stabil" | "fluktuatif"; assessment: Assessment;
  limited?: boolean; source_url?: string | null;
  score: number; headline: string; detail: string; recommendation: string; opds: string[]; source_label: string; source_kind: string;
  series: Array<{ year: number; value: number }>;
  analysis: { anomaly: { is_anomaly: boolean } | null; change_pct: number | null; previous_year: number | null; cagr_pct: number | null; years: number; first_year: number; streak: { direction: "naik" | "turun" | null; length: number; since?: number | null } };
  district_latest: { year: number; items: DistrictValue[] } | null;
  links: Array<{ relation: "primary" | "supporting" | "comparison"; notes: string | null; indicator_id: string; name: string; unit: string; latest_year: number; latest_value: number; change_pct: number | null; trend: "naik" | "turun" | "stabil" | "fluktuatif"; source_label: string }>;
}

export const pct = (value: number | null) => value === null ? "-" : `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
export const num = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
export const sector = (category: string) => plain(category.replace(/^Bank Data · /u, ""));
export const toneOf = (assessment: Assessment) => assessment === "membaik" ? "good" : assessment === "memburuk" ? "bad" : "neutral";
export const statusText: Record<Assessment, string> = { membaik: "Membaik", memburuk: "Memburuk", netral: "Belum dinilai" };
export const statusOf = (item: Pick<Insight, "limited" | "assessment">) => item.limited ? "Data belum cukup" : statusText[item.assessment];
export const isVerified = (kind: string) => kind === "rpjmd" || kind === "opd";
export const indicatorPath = (id: string) => `/dashboard/indikator/${id}`;
export const askPath = (question: string) => `/assistant?q=${encodeURIComponent(question)}`;
export const askAbout = (item: Pick<Insight, "name">) => `Jelaskan kondisi ${plain(item.name)}, penyebab yang mungkin, OPD yang perlu bertindak, dan rekomendasinya.`;
