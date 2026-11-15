import { ArrowDownRight, ArrowUpRight, Building2, Lightbulb, Minus } from "lucide-react";
import { api } from "../api";
import { Badge, ErrorState, PageLoading, useAsync } from "../components";
import { Sparkline } from "../components/InsightVisuals";
import { AssistantChat } from "./AssistantPage";

interface Insight {
  indicator_id: string; name: string; category: string; unit: string; latest_year: number; latest_value: number;
  change_pct: number | null; trend: "naik" | "turun" | "stabil" | "fluktuatif"; assessment: "membaik" | "memburuk" | "netral";
  score: number; headline: string; detail: string; recommendation: string; opds: string[]; source_label: string;
  series: Array<{ year: number; value: number }>; analysis: { anomaly: { is_anomaly: boolean } | null };
}
interface InsightsResponse { generated_at: string; analyzed: number; summary: { membaik: number; memburuk: number; naik: number; turun: number; anomali: number }; insights: Insight[] }

const pct = (value: number | null) => value === null ? "-" : `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

function InsightCard({ item }: { item: Insight }) {
  const tone = item.assessment === "membaik" ? "good" : item.assessment === "memburuk" ? "bad" : "neutral";
  const Icon = item.trend === "naik" ? ArrowUpRight : item.trend === "turun" ? ArrowDownRight : Minus;
  return <article className={`insight-card ${tone}`}>
    <header><span className="insight-trend"><Icon aria-hidden /></span><div><small>{item.category.replace(/^Bank Data · /u, "")}</small><h3>{item.name}</h3></div><Badge tone={tone === "good" ? "success" : tone === "bad" ? "warning" : "neutral"}>{pct(item.change_pct)}</Badge></header>
    <div className="insight-body"><Sparkline points={item.series} tone={tone} /><p>{item.headline}</p></div>
    {item.detail && <p className="insight-detail">{item.detail}</p>}
    <p className="insight-reco"><Lightbulb aria-hidden /><span>{item.recommendation}</span></p>
    <footer>{item.opds.length > 0 && <span><Building2 aria-hidden />{item.opds.join(", ")}</span>}<small>Sumber: {item.source_label}</small></footer>
  </article>;
}

export function BerandaPage() {
  const data = useAsync(() => api<InsightsResponse>("/executive/insights?limit=100"), []);
  if (data.loading) return <PageLoading />;
  if (data.error || !data.data) return <ErrorState title="Ringkasan belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const { summary, insights, analyzed } = data.data;
  const attention = insights.filter((item) => item.assessment === "memburuk" || item.analysis.anomaly?.is_anomaly).slice(0, 6);
  const better = insights.filter((item) => item.assessment === "membaik").slice(0, 3);
  return <div className="beranda">
    <section className="beranda-summary">
      <h2>Kondisi Kabupaten Kapuas hari ini</h2>
      <p>Sababuka menganalisis <strong>{analyzed.toLocaleString("id-ID")}</strong> indikator dari data resmi. <strong>{summary.membaik}</strong> menunjukkan perbaikan, <strong>{summary.memburuk}</strong> memburuk, dan <strong>{summary.anomali}</strong> menunjukkan perubahan tidak biasa. Berikut yang perlu Anda ketahui, lengkap dengan OPD penanggung jawab dan tindak lanjut.</p>
    </section>
    <section aria-labelledby="perhatian"><h2 id="perhatian" className="beranda-heading">Perlu perhatian</h2>
      {attention.length ? <div className="insight-grid">{attention.map((item) => <InsightCard key={item.indicator_id} item={item} />)}</div> : <p className="beranda-empty">Tidak ada indikator yang memburuk atau berubah tidak wajar.</p>}
    </section>
    {better.length > 0 && <section aria-labelledby="membaik"><h2 id="membaik" className="beranda-heading">Perkembangan baik</h2><div className="insight-grid">{better.map((item) => <InsightCard key={item.indicator_id} item={item} />)}</div></section>}
    <section aria-labelledby="tanya"><h2 id="tanya" className="beranda-heading">Tanya Sababuka</h2><AssistantChat compact /></section>
  </div>;
}
