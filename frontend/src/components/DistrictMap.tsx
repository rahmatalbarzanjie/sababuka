import { useEffect, useMemo, useState, type ReactNode } from "react";

interface GeoFeature { type: "Feature"; properties: Record<string, unknown>; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] } }
interface GeoCollection { type: "FeatureCollection"; features: GeoFeature[] }
export interface DistrictValue { name: string; value: number; previous: number | null }

const districtNames = ["Basarang", "Bataguh", "Dadahup", "Kapuas Barat", "Kapuas Hilir", "Kapuas Hulu", "Kapuas Kuala", "Kapuas Murung", "Kapuas Tengah", "Kapuas Timur", "Mandau Talawang", "Mantangai", "Pasak Talawang", "Pulau Petak", "Selat", "Tamban Catur", "Timpah"];
export const normalizeName = (value: string) => value.toLowerCase().replace(/^kecamatan\s+/u, "").replace(/[^a-z0-9]+/gu, " ").trim();

function featureName(feature: GeoFeature): string {
  const values = Object.values(feature.properties).map(String);
  return districtNames.find((name) => values.some((value) => normalizeName(value) === normalizeName(name)))
    ?? values.find((value) => districtNames.some((name) => normalizeName(value).includes(normalizeName(name)))) ?? "Wilayah";
}

function rings(feature: GeoFeature): number[][][] {
  return feature.geometry.type === "Polygon" ? feature.geometry.coordinates as number[][][] : (feature.geometry.coordinates as number[][][][]).flat();
}

/** Warna berurutan: biru muda (nilai terendah) ke biru tua (nilai tertinggi). */
export function shade(ratio: number): string {
  const from = [214, 232, 247]; const to = [19, 76, 135];
  const mix = from.map((start, index) => Math.round(start + (to[index]! - start) * ratio));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

const fmt = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });

export function useKapuasGeography() {
  const [state, setState] = useState<{ data: GeoCollection | null; error: boolean }>({ data: null, error: false });
  useEffect(() => {
    let alive = true;
    fetch("/kapuas-kecamatan.geojson").then((response) => response.ok ? response.json() as Promise<GeoCollection> : Promise.reject(new Error("map")))
      .then((data) => { if (alive) setState({ data, error: false }); }).catch(() => { if (alive) setState({ data: null, error: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}

/** Peta kecamatan berwarna menurut nilai terbaru sebuah indikator; klik/fokus memilih kecamatan. */
export function DistrictMap({ geography, items, unit, selected, onSelect, colorOf, legend, valueText }: { geography: GeoCollection; items: DistrictValue[]; unit: string; selected: string | null; onSelect(name: string | null): void; /** Warna sendiri per nilai (mis. merah ke hijau). Tanpa ini peta berwarna biru berurutan. */ colorOf?(value: number): string; /** Legenda sendiri; tanpa ini tampil skala nilai terendah ke tertinggi. */ legend?: ReactNode; valueText?(value: number): string }) {
  const shape = useMemo(() => {
    const all = geography.features.flatMap(rings).flat();
    const xs = all.map((point) => point[0]!); const ys = all.map((point) => point[1]!);
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const width = 640; const pad = 10;
    const scale = (width - pad * 2) / (maxX - minX);
    const height = Math.round((maxY - minY) * scale + pad * 2);
    const project = (point: number[]) => `${(pad + (point[0]! - minX) * scale).toFixed(1)} ${(height - pad - (point[1]! - minY) * scale).toFixed(1)}`;
    const paths = geography.features.map((feature) => ({ name: featureName(feature), d: rings(feature).map((ring) => `${ring.map((point, index) => `${index ? "L" : "M"}${project(point)}`).join(" ")} Z`).join(" ") }));
    return { width, height, paths };
  }, [geography]);
  const byName = new Map(items.map((item) => [normalizeName(item.name), item]));
  const values = items.map((item) => item.value);
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  return <figure className="district-map">
    <svg viewBox={`0 0 ${shape.width} ${shape.height}`} role="img" aria-label="Peta sebaran nilai per kecamatan Kabupaten Kapuas">
      {shape.paths.map((path, index) => {
        const item = byName.get(normalizeName(path.name));
        const active = selected !== null && normalizeName(selected) === normalizeName(path.name);
        return <path key={`${path.name}-${index}`} d={path.d} fill={item ? (colorOf ? colorOf(item.value) : shade((item.value - min) / span)) : "var(--ui-rule)"} className={active ? "active" : undefined}
          tabIndex={item ? 0 : -1} role="button" aria-label={item ? `${path.name}: ${valueText ? valueText(item.value) : `${fmt(item.value)} ${unit}`}` : `${path.name}: data belum tersedia`}
          onClick={() => onSelect(active ? null : path.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(active ? null : path.name); } }}>
          <title>{path.name}: {item ? (valueText ? valueText(item.value) : `${fmt(item.value)} ${unit}`) : "belum ada data"}</title></path>;
      })}
    </svg>
    {legend ?? <figcaption className="map-legend" aria-hidden="true"><span>{fmt(min)}</span><i /><span>{fmt(max)}</span><small>{unit}</small></figcaption>}
  </figure>;
}
