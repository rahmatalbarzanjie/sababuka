import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, Spinner, useAsync } from "../components";
import { indicatorPath, num, pct } from "../insight";
import { plain } from "../text";
import { AppLink } from "./AppLink";
import { DistrictMap, normalizeName, useKapuasGeography } from "./DistrictMap";

type Status = "tercapai" | "belum_tercapai" | "unggul" | "sedang" | "perhatian" | "tanpa_arah";
type Trend = "membaik" | "memburuk" | "stabil" | null;
interface Summary { name: string; indicators: number; counts: Record<Status, number>; attention_index: number | null }
interface ListResponse { generated_at: string; coverage: { indicators: number; with_target: number; by_source: { rpjmd: number; opd: number; bank_data: number } }; districts: Summary[] }
interface Cell {
  indicator_id: string; name: string; sector: string; unit: string; source_kind: "rpjmd" | "opd" | "bank_data"; year: number; value: number;
  change_pct: number | null; trend: Trend; rank: number; of: number; target: number | null; status: Status;
}
interface DetailResponse { summary: Summary; items: Cell[] }

const statusLabel: Record<Status, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", unggul: "Unggul", sedang: "Sedang", perhatian: "Perlu perhatian", tanpa_arah: "Arah belum ditetapkan" };
const statusTone = (status: Status) => status === "tercapai" || status === "unggul" ? "success" : status === "belum_tercapai" || status === "perhatian" ? "warning" : "neutral";
const trendLabel: Record<string, string> = { membaik: "Membaik", memburuk: "Memburuk", stabil: "Stabil" };
const PAGE = 25;

function downloadCsv(name: string, items: Cell[]) {
  const cell = (value: unknown) => `"${plain(String(value ?? "")).replace(/"/g, '""')}"`;
  const head = ["Indikator", "Sektor", "Satuan", "Sumber", "Tahun", "Nilai", "Peringkat", "Dari", "Perubahan (%)", "Tren", "Target", "Status"];
  const lines = items.map((item) => [item.name, item.sector, item.unit, item.source_kind === "bank_data" ? "Bank Data (belum diverifikasi)" : item.source_kind === "rpjmd" ? "RPJMD" : "OPD", item.year, item.value, item.rank, item.of,
    item.change_pct === null ? "" : item.change_pct.toFixed(1), item.trend ? trendLabel[item.trend] : "", item.target ?? "", statusLabel[item.status]].map(cell).join(","));
  const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `status-indikator-kecamatan-${normalizeName(name).replace(/\s+/g, "-")}.csv`; link.click();
  URL.revokeObjectURL(url);
}

function writeQuery(name: string | null) {
  try {
    const url = new URL(window.location.href);
    if (name) url.searchParams.set("kecamatan", name); else url.searchParams.delete("kecamatan");
    window.history.replaceState(null, "", url.toString());
  } catch { /* pembaruan alamat bersifat tambahan */ }
}

function Row({ item }: { item: Cell }) {
  return <tr>
    <td><strong><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></strong>
      <small>{plain(item.sector)}{item.source_kind === "bank_data" ? " · Bank Data · belum diverifikasi" : ""}</small></td>
    <td className="num">{num(item.value)} <small>{plain(item.unit)} ({item.year})</small></td>
    <td className="num">{item.rank} dari {item.of}</td>
    <td>{item.trend ? `${trendLabel[item.trend]}${item.change_pct !== null ? ` (${pct(item.change_pct)})` : ""}` : "-"}</td>
    <td><Badge tone={statusTone(item.status)}>{statusLabel[item.status]}</Badge>{item.target !== null && <small>Target {num(item.target)}</small>}</td>
  </tr>;
}

function DistrictDetail({ name, onClose }: { name: string; onClose(): void }) {
  const detail = useAsync(() => api<DetailResponse>(`/executive/districts/${encodeURIComponent(name)}`), [name]);
  const [filter, setFilter] = useState<Status | "semua">("semua");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setFilter("semua"); setQuery(""); setShown(PAGE); }, [name]);
  const items = detail.data?.items ?? [];
  const filtered = useMemo(() => items.filter((item) => (filter === "semua" || item.status === filter) && (!query.trim() || `${item.name} ${item.sector}`.toLowerCase().includes(query.trim().toLowerCase()))), [items, filter, query]);
  if (detail.loading) return <div className="panel-loading"><Spinner /></div>;
  if (detail.error || !detail.data) return <ErrorState title="Ringkasan kecamatan belum dapat dimuat" onRetry={detail.reload}>{detail.error}</ErrorState>;
  const { summary } = detail.data;
  const attention = items.filter((item) => item.status === "belum_tercapai" || item.status === "perhatian").slice(0, 6);
  const strong = items.filter((item) => item.status === "tercapai" || item.status === "unggul").slice(-4).reverse();
  const c = summary.counts;
  return <div className="district-detail" aria-live="polite">
    <header><div><h3>Kecamatan {plain(summary.name)}</h3><p className="muted">{summary.indicators.toLocaleString("id-ID")} indikator memiliki data kecamatan.{summary.attention_index !== null ? ` ${pct(summary.attention_index).replace("+", "")} dari indikator berarah berada di kuartil bawah atau belum mencapai target.` : ""}</p></div>
      <div className="district-actions"><button type="button" className="button secondary" onClick={() => downloadCsv(summary.name, items)}>Unduh CSV</button><button type="button" className="button secondary" onClick={onClose}>Tutup</button></div></header>
    <div className="district-chips" role="group" aria-label="Saring menurut status">
      {(["semua", "belum_tercapai", "perhatian", "sedang", "unggul", "tercapai", "tanpa_arah"] as const).map((key) => {
        const count = key === "semua" ? summary.indicators : c[key];
        if (key !== "semua" && !count) return null;
        return <button key={key} type="button" className={`chip${filter === key ? " active" : ""}`} aria-pressed={filter === key} onClick={() => { setFilter(key); setShown(PAGE); }}>{key === "semua" ? "Semua" : statusLabel[key]} <b>{count}</b></button>;
      })}
    </div>
    {filter === "semua" && !query && <div className="district-highlights">
      <section><h4>Perlu perhatian</h4>{attention.length ? <ul>{attention.map((item) => <li key={item.indicator_id}><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink><small>{item.rank} dari {item.of} · {num(item.value)} {plain(item.unit)}</small></li>)}</ul> : <p className="muted">Tidak ada indikator di kuartil bawah.</p>}</section>
      <section><h4>Unggulan</h4>{strong.length ? <ul>{strong.map((item) => <li key={item.indicator_id}><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink><small>{item.rank} dari {item.of} · {num(item.value)} {plain(item.unit)}</small></li>)}</ul> : <p className="muted">Belum ada indikator unggulan.</p>}</section>
    </div>}
    <label className="search-field district-search"><span className="sr-only">Cari indikator</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder="Cari indikator atau sektor" /></label>
    {filtered.length === 0 ? <EmptyState title="Tidak ada indikator yang cocok">Ubah status atau kata pencarian.</EmptyState> : <>
      <div className="table-scroll"><table className="all-table"><thead><tr><th>Indikator</th><th>Nilai terbaru</th><th>Peringkat</th><th>Tren</th><th>Status</th></tr></thead>
        <tbody>{filtered.slice(0, shown).map((item) => <Row key={item.indicator_id} item={item} />)}</tbody></table></div>
      {filtered.length > shown && <button type="button" className="button secondary" onClick={() => setShown((value) => value + PAGE)}>Tampilkan {Math.min(PAGE, filtered.length - shown)} lagi dari {filtered.length - shown} tersisa</button>}
    </>}
  </div>;
}

/** Peta kecamatan berwarna menurut indeks perhatian; klik kecamatan membuka ringkasan status seluruh indikatornya. */
export function DistrictSummaryPanel() {
  const list = useAsync(() => api<ListResponse>("/executive/districts"), []);
  const geography = useKapuasGeography();
  const [district, setDistrict] = useState<string | null>(() => { try { return new URLSearchParams(window.location.search).get("kecamatan"); } catch { return null; } });
  const select = (name: string | null) => { setDistrict(name); writeQuery(name); };
  if (list.loading) return <div className="panel-loading"><Spinner /></div>;
  if (list.error || !list.data) return <ErrorState title="Ringkasan kecamatan belum dapat dimuat" onRetry={list.reload}>{list.error}</ErrorState>;
  const { districts, coverage } = list.data;
  if (!districts.length) return <EmptyState title="Belum ada data per kecamatan yang terbit">Ringkasan akan tampil otomatis begitu ada indikator yang memiliki nilai per kecamatan.</EmptyState>;
  const mapItems = districts.filter((item) => item.attention_index !== null).map((item) => ({ name: item.name, value: item.attention_index!, previous: null }));
  const ranked = [...districts].sort((a, b) => (b.attention_index ?? -1) - (a.attention_index ?? -1));
  const active = district ? districts.find((item) => normalizeName(item.name) === normalizeName(district)) ?? null : null;
  return <>
    <p className="muted district-note">Warna peta menunjukkan <strong>indeks perhatian</strong>: persentase indikator kecamatan yang berada di kuartil bawah 17 kecamatan, atau belum mencapai target bila ada target kecamatan. Warna lebih tua berarti lebih banyak indikator perlu perhatian. {coverage.with_target > 0 ? `${coverage.with_target} indikator sudah memiliki target kecamatan.` : "Belum ada target tingkat kecamatan, sehingga status berupa posisi relatif."} Sumber Bank Data belum diverifikasi OPD.</p>
    <div className="district-layout">
      <div>{geography.data ? <DistrictMap geography={geography.data} items={mapItems} unit="% perlu perhatian" selected={active?.name ?? null} onSelect={select} /> : <p className="muted">{geography.error ? "Peta wilayah belum tersedia." : "Memuat peta..."}</p>}</div>
      <div className="district-rank">
        <p className="district-callout">{active ? <><strong>{plain(active.name)}</strong>: {active.indicators.toLocaleString("id-ID")} indikator{active.attention_index !== null ? `, indeks perhatian ${active.attention_index.toLocaleString("id-ID")}%` : ""}.</> : <>Pilih kecamatan pada peta atau daftar untuk melihat status indikatornya.</>}</p>
        <ol>{ranked.map((item) => <li key={item.name} className={active && normalizeName(active.name) === normalizeName(item.name) ? "active" : undefined}>
          <button type="button" onClick={() => select(active && normalizeName(active.name) === normalizeName(item.name) ? null : item.name)}>
            <span>{plain(item.name)}</span><span className="rank-bar" role="presentation"><i style={{ width: `${Math.max(3, item.attention_index ?? 0)}%` }} /></span><b>{item.attention_index === null ? "-" : `${item.attention_index.toLocaleString("id-ID")}%`}</b>
          </button></li>)}</ol>
      </div>
    </div>
    {active && <DistrictDetail name={active.name} onClose={() => select(null)} />}
  </>;
}

