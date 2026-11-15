import { plain } from "../text";

export interface TrendPoint { year: number; value: number }
export interface DistrictItem { name: string; value: number }

const fmt = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });

export function Sparkline({ points, tone = "neutral" }: { points: TrendPoint[]; tone?: "good" | "bad" | "neutral" }) {
  if (points.length < 2) return null;
  const width = 120; const height = 36; const pad = 3;
  const min = Math.min(...points.map((point) => point.value)); const max = Math.max(...points.map((point) => point.value));
  const span = max - min || 1;
  const x = (index: number) => pad + (index / (points.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;
  return <svg className={`insight-spark ${tone}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tren ${points[0]!.year} sampai ${last.year}`}><path d={path} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><circle cx={x(points.length - 1)} cy={y(last.value)} r="3" /></svg>;
}

export function TrendChart({ points, unit, title, tone = "neutral" }: { points: TrendPoint[]; unit: string; title: string; tone?: "good" | "bad" | "neutral" }) {
  if (points.length < 2) return null;
  const width = 480; const height = 170; const left = 30; const right = 30; const top = 18; const bottom = 26;
  const min = Math.min(...points.map((point) => point.value)); const max = Math.max(...points.map((point) => point.value));
  const span = max - min || 1;
  const x = (index: number) => left + (index / (points.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - min) / span) * (height - top - bottom);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${height - bottom} L${x(0).toFixed(1)},${height - bottom} Z`;
  return <figure className={`insight-chart ${tone}`}><figcaption>{plain(title)}{unit ? ` (${plain(unit)})` : ""}</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafik tren ${title}`}>
      <path d={area} className="area" /><path d={path} className="line" fill="none" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((point, index) => <g key={point.year}><circle cx={x(index)} cy={y(point.value)} r="3.5" /><text x={x(index)} y={height - 8} textAnchor="middle" className="axis">{point.year}</text>{(index === 0 || index === points.length - 1 || points.length <= 6) && <text x={x(index)} y={y(point.value) - 8} textAnchor="middle" className="value">{fmt(point.value)}</text>}</g>)}
    </svg></figure>;
}

export function DistrictBars({ items, unit, title }: { items: DistrictItem[]; unit: string; title: string }) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((item) => item.value)) || 1;
  return <figure className="insight-bars"><figcaption>{title}{unit ? ` (${unit})` : ""}</figcaption>
    {sorted.map((item) => <div key={item.name}><span>{item.name}</span><div role="presentation"><i style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} /></div><b>{fmt(item.value)}</b></div>)}</figure>;
}
