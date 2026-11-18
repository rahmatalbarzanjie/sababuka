import { useEffect, useRef, useState } from "react";
import { plain } from "../text";
import type { TrendPoint } from "./InsightVisuals";

const full = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
const compact = (value: number) => Math.abs(value) >= 10_000 ? value.toLocaleString("id-ID", { notation: "compact", maximumFractionDigits: 1 }) : full(value);

/**
 * Grafik tren untuk halaman detail: digambar sesuai lebar sebenarnya agar huruf tetap terbaca di ponsel, sumbu vertikal berlabel,
 * dan tiap titik dapat difokus atau disentuh untuk membaca nilainya.
 */
export function DetailTrend({ points, unit, tone = "neutral" }: { points: TrendPoint[]; unit: string; tone?: "good" | "bad" | "neutral" }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const element = box.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)));
    observer.observe(element); setWidth(Math.round(element.clientWidth));
    return () => observer.disconnect();
  }, []);
  if (points.length < 2) return null;
  const narrow = width > 0 && width < 480;
  const height = narrow ? 210 : 250; const left = 52; const right = 20; const top = 24; const bottom = 34;
  const min = Math.min(...points.map((point) => point.value)); const max = Math.max(...points.map((point) => point.value));
  const span = max - min || 1;
  const x = (index: number) => left + (index / (points.length - 1)) * Math.max(1, width - left - right);
  const y = (value: number) => top + (1 - (value - min) / span) * (height - top - bottom);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${height - bottom} L${x(0).toFixed(1)},${height - bottom} Z`;
  const ticks = [max, (max + min) / 2, min];
  const yearStep = points.length > (narrow ? 5 : 9) ? Math.ceil(points.length / (narrow ? 5 : 9)) : 1;
  const labelAll = points.length <= (narrow ? 4 : 8);
  return <figure className={`insight-chart detail-trend ${tone}`}>
    <div ref={box} className="detail-trend-box">
      {width > 0 && <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="group" aria-label={`Grafik tren ${points[0]!.year} sampai ${points[points.length - 1]!.year}, satuan ${plain(unit)}`}>
        {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="grid" /><text x={left - 8} y={y(tick) + 4} textAnchor="end" className="axis">{compact(tick)}</text></g>)}
        <path d={area} className="area" /><path d={path} className="line" fill="none" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((point, index) => <g key={point.year}>
          {(index % yearStep === 0 || index === points.length - 1) && <text x={x(index)} y={height - 10} textAnchor="middle" className="axis">{point.year}</text>}
          {(labelAll || index === points.length - 1 || index === 0) && <text x={x(index)} y={y(point.value) - 9} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} className="value">{compact(point.value)}</text>}
          <circle cx={x(index)} cy={y(point.value)} r={active === index ? 6 : 4} className="dot" />
          <circle cx={x(index)} cy={y(point.value)} r={18} className="hit" tabIndex={0} role="img" aria-label={`${point.year}: ${full(point.value)} ${plain(unit)}`}
            onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(index === active ? null : index)}><title>{`${point.year}: ${full(point.value)} ${plain(unit)}`}</title></circle>
        </g>)}
      </svg>}
    </div>
    <figcaption aria-live="polite">{active !== null ? <strong>{points[active]!.year}: {full(points[active]!.value)} {plain(unit)}</strong> : <span>Sentuh atau arahkan ke titik untuk membaca nilainya.</span>}{min > 0 && <span className="chart-note"> Sumbu vertikal tidak dimulai dari nol, jadi bandingkan angkanya, bukan hanya kemiringan garis.</span>}</figcaption>
  </figure>;
}
