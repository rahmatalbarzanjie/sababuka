import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Lightbulb, Map as MapIcon, Scale, TrendingUp, UsersRound } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, Notice, PageLoading, useAsync } from "../components";

interface AnalysisPoint { observation_id: string; period_label: string; period_end: string; value: number; target: number | null; source_name: string; source_url: string | null; organization_name: string; publication_title: string; }
interface AnalysisSeries { indicator_id: string; indicator_code: string; indicator_name: string; category_name: string; policy_focus_name: string | null; direction: "increase" | "decrease" | "maintain" | null; unit: string; unit_symbol: string | null; geography_id: string | null; geography_code: string | null; geography_name: string; geography_level: string; points: AnalysisPoint[]; trend: "up" | "down" | "stable" | "insufficient"; performance: "improving" | "worsening" | "stable" | "unclassified" | "insufficient"; }
interface AnalysisItem { observation_id: string; indicator_id: string; indicator_code: string; indicator_name: string; category_name: string; policy_focus_name: string | null; period_label: string; period_end: string; geography_name: string | null; numeric_value: string | null; text_value: string | null; target_value: string | null; unit: string; unit_symbol: string | null; source_name: string; source_url: string | null; organization_name: string; publication_title: string; }
interface Reconciliation { indicator_id: string; indicator_code: string; indicator_name: string; period_label: string; geography_name: string; status: string; sources: Array<{ source_name: string; organization_name: string; value: number | null; text_value: string | null; source_url: string | null; publication_title: string; quality_note?: string | null }>; }
interface Recommendation { severity: "high" | "medium" | "info"; indicator_id: string; title: string; evidence: string; meaning: string; action: string; }
interface AnalysisData { generated_at: string; methodology: { trend: string; region: string; consistency: string; decision: string; causality_guard: string }; items: AnalysisItem[]; series: AnalysisSeries[]; reconciliation: Reconciliation[]; recommendations: Recommendation[]; }
interface GeoFeature { type: "Feature"; properties: Record<string, unknown>; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] }; }
interface GeoCollection { type: "FeatureCollection"; features: GeoFeature[]; }

const districtNames = ["Basarang", "Bataguh", "Dadahup", "Kapuas Barat", "Kapuas Hilir", "Kapuas Hulu", "Kapuas Kuala", "Kapuas Murung", "Kapuas Tengah", "Kapuas Timur", "Mandau Talawang", "Mantangai", "Pasak Talawang", "Pulau Petak", "Selat", "Tamban Catur", "Timpah"];
const normalize = (value: string) => value.toLowerCase().replace(/^kecamatan\s+/u, "").replace(/[^a-z0-9]+/gu, " ").trim();
const formatValue = (value: number | string | null, unit?: string | null) => {
  const visibleUnit = unit && unit.toLowerCase() !== "angka" ? unit : "";
  return value === null ? "-" : `${typeof value === "number" ? value.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : value}${visibleUnit ? ` ${visibleUnit}` : ""}`;
};
const performanceLabel = (value: AnalysisSeries["performance"]) => value === "improving" ? "Membaik" : value === "worsening" ? "Memburuk" : value === "stable" ? "Stabil" : value === "insufficient" ? "Belum cukup periode" : "Arah belum ditetapkan";
const performanceTone = (value: AnalysisSeries["performance"]): "success" | "danger" | "warning" | "neutral" => value === "improving" ? "success" : value === "worsening" ? "danger" : value === "stable" ? "neutral" : "warning";

function useAnalysis() {
  return useAsync(() => Promise.all([
    api<AnalysisData>("/executive/analysis"),
    fetch("/kapuas-kecamatan.geojson").then((response) => response.ok ? response.json() as Promise<GeoCollection> : Promise.reject(new Error("Peta wilayah belum tersedia."))),
  ]).then(([analysis, geography]) => ({ analysis, geography })), []);
}

function Methodology({ data }: { data: AnalysisData }) {
  const methods = [["1", "Baca tren", data.methodology.trend, TrendingUp], ["2", "Bandingkan wilayah", data.methodology.region, MapIcon], ["3", "Periksa konsistensi", data.methodology.consistency, GitCompareArrows], ["4", "Arahkan keputusan", data.methodology.decision, Lightbulb]] as const;
  return <details className="panel decision-methodology"><summary><span><strong>Cara membaca analisis</strong><small>Tren → perbandingan wilayah → konsistensi sumber → rekomendasi</small></span><span>Lihat metode</span></summary><div className="decision-method-grid">{methods.map(([number, title, description, Icon]) => <article key={number}><span className="decision-method-icon"><Icon /></span><small>LANGKAH {number}</small><h3>{title}</h3><p>{description}</p></article>)}</div><Notice tone="warning"><strong>Batas analisis:</strong> {data.methodology.causality_guard}</Notice></details>;
}

function featureName(feature: GeoFeature): string {
  const values = Object.values(feature.properties).map(String);
  return districtNames.find((name) => values.some((value) => normalize(value) === normalize(name))) ?? values.find((value) => districtNames.some((name) => normalize(value).includes(normalize(name)))) ?? "Wilayah";
}

function polygonRings(feature: GeoFeature): number[][][] {
  return feature.geometry.type === "Polygon" ? feature.geometry.coordinates as number[][][] : (feature.geometry.coordinates as number[][][][]).flat();
}

function TrendPanel({ series }: { series: AnalysisSeries | undefined }) {
  if (!series || series.points.length === 0) return <EmptyState title="Tren belum dapat dihitung">Minimal satu capaian terpublikasi diperlukan; dua periode diperlukan untuk menentukan arah naik atau turun.</EmptyState>;
  const values = series.points.map((point) => point.value); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const coordinates = series.points.map((point, index) => `${30 + index * (500 / Math.max(1, series.points.length - 1))},${170 - ((point.value - min) / range) * 130}`).join(" ");
  const first = series.points[0]; const latest = series.points.at(-1)!;
  const delta = series.points.length < 2 ? null : first.value === 0 ? latest.value - first.value : ((latest.value - first.value) / Math.abs(first.value)) * 100;
  return <div className="trend-panel"><div className="trend-summary"><Badge tone={performanceTone(series.performance)}>{performanceLabel(series.performance)}</Badge><strong>{series.indicator_name}</strong><small>{series.geography_name} · {series.points.length} periode</small></div><div className="trend-highlight"><span><small>Nilai terbaru</small><strong>{formatValue(latest.value, series.unit_symbol ?? series.unit)}</strong><em>{latest.period_label}</em></span><span><small>Perubahan</small><strong>{delta === null ? "Belum tersedia" : `${delta >= 0 ? "+" : ""}${delta.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${first.value === 0 ? "" : "%"}`}</strong><em>{series.points.length > 1 ? `${first.period_label}-${latest.period_label}` : "Butuh 2 periode"}</em></span></div><svg viewBox="0 0 560 220" role="img" aria-label={`Tren ${series.indicator_name}`}><polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="4" />{series.points.map((point, index) => { const [x, y] = coordinates.split(" ")[index].split(","); return <g key={point.observation_id}><circle cx={x} cy={y} r="6" /><text className="trend-point-value" x={x} y={Number(y) - 13} textAnchor="middle">{point.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</text><text x={x} y="212" textAnchor="middle">{point.period_label}</text><title>{formatValue(point.value, series.unit_symbol ?? series.unit)}</title></g>; })}</svg><div className="trend-values">{series.points.map((point) => <span key={point.observation_id}><small>{point.period_label}</small><strong>{formatValue(point.value, series.unit_symbol ?? series.unit)}</strong>{point.target !== null && <em>Target {formatValue(point.target, series.unit_symbol ?? series.unit)}</em>}</span>)}</div></div>;
}

export function AnalysisPage() {
  const result = useAnalysis(); const [indicatorId, setIndicatorId] = useState(""); const [selectedDistrict, setSelectedDistrict] = useState("");
  if (result.loading) return <PageLoading label="Menyusun analisis keputusan" />;
  if (result.error || !result.data) return <ErrorState title="Analisis belum dapat dimuat" onRetry={result.reload}>{result.error?.message ?? "Periksa koneksi lalu coba lagi."}</ErrorState>;
  const { analysis, geography } = result.data;
  const indicators = Array.from(new Map(analysis.series.map((item) => [item.indicator_id, item])).values()).sort((a, b) => a.indicator_name.localeCompare(b.indicator_name, "id"));
  const activeIndicatorId = indicatorId || indicators[0]?.indicator_id || "";
  const indicatorSeries = analysis.series.filter((item) => item.indicator_id === activeIndicatorId);
  const selectedSeries = indicatorSeries.find((item) => selectedDistrict && normalize(item.geography_name) === normalize(selectedDistrict)) ?? indicatorSeries.find((item) => item.geography_level === "regency") ?? indicatorSeries[0];
  const districts = indicatorSeries.filter((item) => item.geography_level === "district").sort((a, b) => (a.points.at(-1)?.value ?? 0) - (b.points.at(-1)?.value ?? 0));
  const reconciliations = analysis.reconciliation.filter((item) => item.indicator_id === activeIndicatorId);
  const recommendations = analysis.recommendations.filter((item) => item.indicator_id === activeIndicatorId);
  const latest = selectedSeries?.points.at(-1);
  return <div className="decision-page">
    <section className="panel decision-control"><div><span className="eyebrow">ANALISIS KONDISI WILAYAH</span><h2>Pilih indikator yang ingin dipahami</h2><p>Sistem menampilkan kondisi terbaru, perubahan, perbandingan wilayah, dan tindakan yang disarankan.</p></div><label className="field"><span>Indikator</span><select data-field="active_indicator_id" value={activeIndicatorId} onChange={(event) => { setIndicatorId(event.target.value); setSelectedDistrict(""); }}><option value="">Pilih indikator</option>{indicators.map((item) => <option key={item.indicator_id} value={item.indicator_id}>{item.indicator_name}</option>)}</select></label></section>
    {!indicators.length ? <section className="panel"><EmptyState title="Belum ada data untuk dianalisis">Aktifkan indikator, setujui capaian OPD, lalu terbitkan melalui Kurasi dan Publikasi. Struktur analisis sudah siap dan tidak menggunakan angka ilustratif.</EmptyState></section> : <>
      <section className="metric-grid decision-summary"><article className="metric-card"><span><small>Kondisi terbaru</small><strong>{formatValue(latest?.value ?? null, selectedSeries?.unit_symbol ?? selectedSeries?.unit)}</strong><em>{latest?.period_label}</em></span></article><article className="metric-card"><span><small>Arah perkembangan</small><strong>{selectedSeries ? performanceLabel(selectedSeries.performance) : "-"}</strong><em>{selectedSeries?.points.length ?? 0} periode</em></span></article><article className="metric-card"><span><small>Cakupan wilayah</small><strong>{districts.length} kecamatan</strong><em>dari 17 kecamatan</em></span></article><article className="metric-card"><span><small>Status sumber</small><strong>{reconciliations.length ? "Perlu rekonsiliasi" : "Konsisten"}</strong><em>{reconciliations.length ? "Periksa sebelum keputusan" : "Tidak ada konflik terdeteksi"}</em></span></article></section>
      <section className="decision-analysis-grid decision-primary-grid"><article className="panel"><header className="panel-heading"><div><span className="eyebrow">TREN ANTARPERIODE</span><h2>{selectedDistrict || "Kabupaten Kapuas"}</h2></div>{selectedSeries?.trend === "up" ? <ArrowUpRight /> : selectedSeries?.trend === "down" ? <ArrowDownRight /> : <TrendingUp />}</header><TrendPanel series={selectedSeries} /></article><article className="panel"><header className="panel-heading"><div><span className="eyebrow">ARTI & TINDAKAN</span><h2>Arah keputusan</h2></div><Lightbulb /></header>{!recommendations.length ? <EmptyState title="Belum ada sinyal keputusan otomatis">Butuh sedikitnya dua periode, data wilayah, atau perbedaan sumber untuk menyusun rekomendasi.</EmptyState> : <div className="recommendation-list">{recommendations.map((item, index) => <article key={`${item.indicator_id}-${index}`}><Badge tone={item.severity === "high" ? "danger" : "warning"}>{item.severity === "high" ? "Prioritas" : "Perhatian"}</Badge><h3>{item.title}</h3><p><strong>Bukti:</strong> {item.evidence}</p><p><strong>Artinya:</strong> {item.meaning}</p><p><strong>Tindakan:</strong> {item.action}</p></article>)}</div>}</article></section>
      {districts.length ? <><Notice tone="info">Peta sebaran dan ringkasan status per kecamatan ada di Dashboard Eksekutif, bagian Peta kecamatan.</Notice><section className="panel table-panel"><header className="panel-heading"><div><span className="eyebrow">WILAYAH TERTINGGAL</span><h2>Urutan kondisi kecamatan</h2><p>Urutan menggunakan nilai periode terbaru; arti baik/buruk tetap mengikuti arah indikator.</p></div><UsersRound /></header><div className="table-scroll"><table><thead><tr><th>Kecamatan</th><th>Periode</th><th>Nilai terbaru</th><th>Arah</th><th>Sumber</th></tr></thead><tbody>{districts.map((item) => <tr key={item.geography_id}><td><strong>{item.geography_name}</strong></td><td>{item.points.at(-1)?.period_label}</td><td>{formatValue(item.points.at(-1)?.value ?? null, item.unit_symbol ?? item.unit)}</td><td><Badge tone={performanceTone(item.performance)}>{performanceLabel(item.performance)}</Badge></td><td>{item.points.at(-1)?.source_name}</td></tr>)}</tbody></table></div></section></> : <Notice tone="success">Peta belum ditampilkan karena indikator ini baru memiliki data tingkat Kabupaten Kapuas. Sistem tidak akan membuat sebaran kecamatan secara asumtif.</Notice>}
    </>}
    {indicators.length > 0 && <section className="panel"><header className="panel-heading"><div><span className="eyebrow">REKONSILIASI SUMBER</span><h2>Nilai yang perlu disepakati</h2></div><Scale /></header>{!reconciliations.length ? <EmptyState title="Tidak ada masalah sumber terdeteksi">Untuk indikator terpilih, belum ada perbedaan antar-sumber yang perlu disepakati.</EmptyState> : <div className="reconciliation-list">{reconciliations.map((item) => <article key={`${item.indicator_id}-${item.period_label}-${item.geography_name}`}><Badge tone="danger">Perlu rekonsiliasi</Badge><h3>{item.indicator_name}</h3><p>{item.period_label} · {item.geography_name}</p>{item.sources.map((source) => <small key={`${source.source_name}-${source.organization_name}`}>{source.source_name}: {formatValue(source.value ?? source.text_value)}{source.quality_note ? ` · ${source.quality_note}` : ""}</small>)}</article>)}</div>}</section>}
    <Methodology data={analysis} />
  </div>;
}
