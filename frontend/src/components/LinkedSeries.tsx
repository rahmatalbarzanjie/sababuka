import { Badge } from "../components";
import { indicatorPath, num, pct, type Insight } from "../insight";
import { plain } from "../text";
import { AppLink } from "./AppLink";

const relationLabel = { primary: "Utama", supporting: "Pendukung", comparison: "Pembanding" } as const;

/** Seri Bank Data yang ditautkan manual ke sebuah indikator. Tahun data selalu ditampilkan agar selisih tahun terlihat. */
export function LinkedSeries({ links, baseYear, title = true }: { links: Insight["links"]; baseYear: number; title?: boolean }) {
  if (!links.length) return null;
  return <div className="spotlight-links">
    {title && <b>Data pendukung dan pembanding (Bank Data, belum diverifikasi)</b>}
    <ul>{links.map((link) => {
      const gap = baseYear - link.latest_year;
      return <li key={`${link.relation}:${link.indicator_id}`}>
        <Badge tone="neutral">{relationLabel[link.relation]}</Badge>
        <span><AppLink to={indicatorPath(link.indicator_id)}>{plain(link.name)}</AppLink></span>
        <strong>{num(link.latest_value)} {plain(link.unit)}</strong>
        <small>Data tahun {link.latest_year}{link.change_pct !== null ? ` · ${pct(link.change_pct)} dari periode sebelumnya` : ""}{gap >= 2 ? ` · ${gap} tahun lebih lama dari data indikator (${baseYear})` : ""}</small>
        {link.notes && <small>{plain(link.notes)}</small>}
      </li>;
    })}</ul>
  </div>;
}
