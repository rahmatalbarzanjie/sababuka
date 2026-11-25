import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { SababukaMark } from "../branding/SababukaBrand";
import { greetingFor } from "../utils/greeting";

interface Overview {
  as_of: string | null; bertarget: number; tercapai: number; belum_tercapai: number; belum_ada_realisasi: number;
  persen_tercapai: number | null; indikator_dianalisis: number; membaik: number; memburuk: number;
}

const EXAMPLES = ["Apa yang perlu saya perhatikan hari ini?", "Bagaimana kondisi dan perkembangan OPD di Kapuas?", "Bagaimana tren kemiskinan di Kapuas?", "Kecamatan mana yang paling rendah angka melek hurufnya?"];

const longDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
const shortDate = (iso: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00`));

/** Angka yang naik pelan ke nilai akhirnya; langsung tampil bila pengguna meminta gerak dikurangi. */
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setValue(target); return; }
    let frame = 0; const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function Figure({ value }: { value: number }) { return <b className="num">{useCountUp(value)}</b>; }

/** Sambutan chat Bupati: sapaan, ringkasan capaian RPJMD yang dapat diketuk menjadi pertanyaan, dan contoh pertanyaan. Hanya membaca data terbit. */
export function ChatWelcome({ onAsk }: { onAsk: (question: string) => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    api<Overview>("/assistant/overview").then((result) => { if (alive) setOverview(result); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const judged = overview ? overview.tercapai + overview.belum_tercapai : 0;
  const total = overview ? Math.max(1, overview.tercapai + overview.belum_tercapai + overview.belum_ada_realisasi) : 1;
  const share = (value: number) => `${(value / total) * 100}%`;
  const now = new Date();

  return <div className="assistant-welcome welcome-live">
    <SababukaMark className="welcome-mark" />
    <p className="welcome-eyebrow" style={{ "--i": 0 } as React.CSSProperties}>{longDate(now)}</p>
    <h2 style={{ "--i": 1 } as React.CSSProperties}>{greetingFor(now.getHours())}, Bapak Bupati.</h2>
    <p className="welcome-sub" style={{ "--i": 2 } as React.CSSProperties}>Tanyakan capaian RPJMD, kondisi OPD, atau wilayah yang perlu perhatian. Jawaban bersumber dari data yang sudah terbit.</p>

    {!overview && !failed && <div className="welcome-snapshot loading" aria-hidden="true" style={{ "--i": 3 } as React.CSSProperties}><span /><span /><span /></div>}
    {overview && overview.bertarget > 0 && <section className="welcome-snapshot" aria-label="Kondisi capaian RPJMD saat ini" style={{ "--i": 3 } as React.CSSProperties}>
      <header><strong>Capaian RPJMD saat ini</strong>{overview.as_of && <small>Data diperbarui {shortDate(overview.as_of)}</small>}</header>
      <p className="snap-lead">{judged > 0 ? <><Figure value={overview.tercapai} /> dari {judged} indikator yang sudah terealisasi mencapai target{overview.persen_tercapai !== null && <> ({overview.persen_tercapai}%)</>}.</> : "Belum ada indikator bertarget yang dapat dinilai."}</p>
      <div className="snap-bar" role="img" aria-label={`${overview.tercapai} tercapai, ${overview.belum_tercapai} belum tercapai, ${overview.belum_ada_realisasi} belum ada realisasi`}>
        <span className="good" style={{ width: share(overview.tercapai) }} /><span className="bad" style={{ width: share(overview.belum_tercapai) }} /><span className="none" style={{ width: share(overview.belum_ada_realisasi) }} />
      </div>
      <div className="snap-legend">
        <button type="button" onClick={() => onAsk("Indikator apa saja yang sudah mencapai target?")}><i className="good" /><Figure value={overview.tercapai} /> tercapai</button>
        <button type="button" onClick={() => onAsk("Indikator apa yang belum mencapai target?")}><i className="bad" /><Figure value={overview.belum_tercapai} /> belum tercapai</button>
        <button type="button" onClick={() => onAsk("Indikator apa yang belum ada realisasinya?")}><i className="none" /><Figure value={overview.belum_ada_realisasi} /> menunggu realisasi</button>
      </div>
      {overview.indikator_dianalisis > 0 && <div className="snap-trend">
        <span>Arah tren {overview.indikator_dianalisis} indikator:</span>
        <button type="button" onClick={() => onAsk("Indikator apa yang membaik?")}>{overview.membaik} membaik</button>
        <button type="button" onClick={() => onAsk("Indikator apa yang memburuk?")}>{overview.memburuk} memburuk</button>
      </div>}
    </section>}

    <div className="assistant-suggestions" style={{ "--i": 4 } as React.CSSProperties}>{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => onAsk(example)}><Sparkles aria-hidden="true" /><span>{example}</span></button>)}</div>
  </div>;
}
