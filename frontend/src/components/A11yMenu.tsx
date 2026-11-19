import { Accessibility, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const KEY = "sababuka-a11y";
type Scale = "0.9" | "1" | "1.15";
interface Prefs { scale: Scale; contrast: boolean }

function read(): Prefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    return { scale: raw.scale === "0.9" || raw.scale === "1.15" ? raw.scale : "1", contrast: raw.contrast === true };
  } catch { return { scale: "1", contrast: false }; }
}

/** Pengaturan tampilan untuk Bupati: ukuran teks, mode gelap, dan kontras tinggi. Pilihan disimpan di perangkat ini. */
export function A11yMenu({ dark, onToggleDark }: { dark: boolean; onToggleDark(): void }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(read);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--portal-zoom", prefs.scale);
    if (prefs.contrast) root.setAttribute("data-contrast", "high"); else root.removeAttribute("data-contrast");
    try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* pilihan hanya tersimpan sementara */ }
    return () => { root.style.removeProperty("--portal-zoom"); root.removeAttribute("data-contrast"); };
  }, [prefs]);
  useEffect(() => { if (open) panel.current?.querySelector<HTMLElement>("button")?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    const onClick = (event: MouseEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [open]);
  const scales: Array<[Scale, string, string]> = [["0.9", "A-", "Teks lebih kecil"], ["1", "A", "Teks normal"], ["1.15", "A+", "Teks lebih besar"]];
  return <>
    <button ref={trigger} type="button" className="a11y-fab" aria-label="Menu aksesibilitas" aria-haspopup="dialog" aria-expanded={open} aria-controls="a11y-panel" onClick={() => setOpen((value) => !value)}><Accessibility aria-hidden /></button>
    {open && <div ref={panel} id="a11y-panel" className="a11y-panel" role="dialog" aria-modal="false" aria-label="Menu aksesibilitas">
      <header><h2>Menu aksesibilitas</h2><button type="button" className="a11y-close" aria-label="Tutup" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X aria-hidden /></button></header>
      <div className="a11y-group"><b>Ukuran teks</b>
        <div className="a11y-seg" role="group" aria-label="Ukuran teks">{scales.map(([value, label, name]) => <button key={value} type="button" aria-label={name} aria-pressed={prefs.scale === value} onClick={() => setPrefs((state) => ({ ...state, scale: value }))}>{label}</button>)}</div></div>
      <div className="a11y-group"><b>Warna dan kontras</b>
        <div className="a11y-switch"><span>Mode gelap</span><button type="button" aria-pressed={dark} onClick={onToggleDark}>{dark ? "Hidup" : "Mati"}</button></div>
        <div className="a11y-switch"><span>Kontras tinggi</span><button type="button" aria-pressed={prefs.contrast} onClick={() => setPrefs((state) => ({ ...state, contrast: !state.contrast }))}>{prefs.contrast ? "Hidup" : "Mati"}</button></div></div>
    </div>}
  </>;
}
