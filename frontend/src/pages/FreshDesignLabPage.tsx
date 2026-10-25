import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpenCheck,
  Building2,
  Check,
  ChevronDown,
  CircleGauge,
  Database,
  FileCheck2,
  Layers3,
  ListTodo,
  Menu,
  Moon,
  Palette,
  Search,
  Send,
  Sun,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SababukaLockup } from "../branding/SababukaBrand";
import { navigate } from "../router";
import "./fresh-design-lab.css";

type Stage = "all" | "source" | "staging" | "review" | "publish";
type Priority = "urgent" | "attention" | "normal";
type ColorTheme = "bersinar" | "resmi" | "sungai" | "tropis";

type WorkItem = {
  id: string;
  title: string;
  owner: string;
  stage: Exclude<Stage, "all">;
  priority: Priority;
  timing: string;
  detail: string;
  progress: number;
};

const workItems: WorkItem[] = [
  { id: "stunting-q3", title: "Verifikasi data stunting triwulan III", owner: "Dinas Kesehatan", stage: "review", priority: "urgent", timing: "Terlambat 2 hari", detail: "Dua nilai kecamatan berbeda dari rekap sumber. Perlu konfirmasi sebelum publikasi.", progress: 72 },
  { id: "aps-16-18", title: "Lengkapi cakupan APS usia 16–18 tahun", owner: "Dinas Pendidikan", stage: "source", priority: "urgent", timing: "Terlambat 4 hari", detail: "Tiga kecamatan belum mengirimkan nilai periode 2025.", progress: 58 },
  { id: "kodref-ip", title: "Setujui pemetaan Kodref IP", owner: "BAPPERIDA", stage: "review", priority: "attention", timing: "Hari ini, 14.00", detail: "Enam indikator telah dicocokkan dan menunggu pemeriksaan akhir.", progress: 84 },
  { id: "tpa-k", title: "Tinjau perubahan sumber TPAK", owner: "Disnakertrans", stage: "staging", priority: "attention", timing: "Besok", detail: "Sakernas versi terbaru mengubah metadata periode dan satuan.", progress: 66 },
  { id: "kemiskinan", title: "Terbitkan pembaruan indikator kemiskinan", owner: "Dinas Sosial", stage: "publish", priority: "normal", timing: "28 Okt 2026", detail: "Data sudah disetujui dan siap masuk rilis data pimpinan.", progress: 100 },
];

const stages: Array<{ id: Stage; label: string; caption: string }> = [
  { id: "all", label: "Semua", caption: "5 pekerjaan" },
  { id: "source", label: "Sumber", caption: "1 belum lengkap" },
  { id: "staging", label: "Staging", caption: "1 perlu ditinjau" },
  { id: "review", label: "Verifikasi", caption: "2 menunggu" },
  { id: "publish", label: "Publikasi", caption: "1 siap terbit" },
];

const navigation = [
  { id: "today", label: "Ruang data", icon: CircleGauge },
  { id: "queue", label: "Antrean", icon: ListTodo, count: 4 },
  { id: "opd", label: "Data OPD", icon: Building2 },
  { id: "release", label: "Publikasi", icon: FileCheck2 },
];

const colorThemes: Array<{ id: ColorTheme; label: string; description: string; colors: [string, string, string] }> = [
  { id: "bersinar", label: "Kapuas Bersinar", description: "Navy, hijau sungai, dan emas dari identitas SABABUKA", colors: ["#16304F", "#0F6D54", "#D6A438"] },
  { id: "resmi", label: "Kapuas Resmi", description: "Biru pemerintahan yang tegas dengan aksen emas", colors: ["#0A2241", "#1B5796", "#D6A438"] },
  { id: "sungai", label: "Sungai Kapuas", description: "Biru sungai dan turkuois yang lebih ringan", colors: ["#12304A", "#087E8B", "#54B8B1"] },
  { id: "tropis", label: "Tropis Kapuas", description: "Hijau hutan dan rawa dengan sentuhan hangat", colors: ["#17372D", "#277554", "#C59535"] },
];

export function FreshDesignLabPage() {
  const [dark, setDark] = useState(() => window.localStorage.getItem("sababuka-design-lab-mode") === "dark");
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = window.localStorage.getItem("sababuka-design-lab-palette");
    return colorThemes.some((item) => item.id === saved) ? saved as ColorTheme : "resmi";
  });
  const [stage, setStage] = useState<Stage>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(workItems[0].id);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeNav, setActiveNav] = useState("today");

  const filteredItems = useMemo(() => workItems.filter((item) => {
    const matchesStage = stage === "all" || item.stage === stage;
    const normalized = query.trim().toLocaleLowerCase("id");
    const matchesQuery = !normalized || `${item.title} ${item.owner} ${item.detail}`.toLocaleLowerCase("id").includes(normalized);
    return matchesStage && matchesQuery;
  }), [query, stage]);

  const selected = workItems.find((item) => item.id === selectedId) ?? workItems[0];
  const urgentCount = workItems.filter((item) => item.priority === "urgent").length;
  const reviewCount = workItems.filter((item) => item.stage === "review").length;
  const completedAverage = Math.round(workItems.reduce((sum, item) => sum + item.progress, 0) / workItems.length);

  useEffect(() => {
    window.localStorage.setItem("sababuka-design-lab-mode", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    window.localStorage.setItem("sababuka-design-lab-palette", colorTheme);
  }, [colorTheme]);

  function selectNavigation(id: string) {
    setActiveNav(id);
    setMobileNav(false);
    if (id === "queue") setStage("review");
    else if (id === "release") setStage("publish");
    else setStage("all");
  }

  return (
    <div className={`fresh-lab${dark ? " is-dark" : ""}`} data-palette={colorTheme} data-ui>
      <header className="fresh-mobile-bar">
        <button aria-label="Buka navigasi" onClick={() => setMobileNav(true)}><Menu /></button>
        <strong>Ruang data</strong>
        <button aria-label={dark ? "Gunakan tema terang" : "Gunakan tema gelap"} onClick={() => setDark((value) => !value)}>{dark ? <Sun /> : <Moon />}</button>
      </header>

      <aside className={`fresh-sidebar${mobileNav ? " is-open" : ""}`} aria-label="Navigasi konsep SABABUKA">
        <div className="fresh-sidebar-head">
          <SababukaLockup />
          <button className="fresh-mobile-close" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)}><X /></button>
        </div>
        <button className="fresh-workspace-switcher">
          <span><small>Ruang kerja</small><strong>Data Kabupaten Kapuas</strong></span><ChevronDown />
        </button>

        <nav>
          <span className="fresh-nav-label">Pekerjaan</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={activeNav === item.id ? "active" : ""} onClick={() => selectNavigation(item.id)}><Icon /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>;
          })}
          <span className="fresh-nav-label">Tata kelola</span>
          <button><Database /><span>Katalog data</span></button>
          <button><Layers3 /><span>Indikator</span></button>
          <button><BookOpenCheck /><span>Metadata</span></button>
        </nav>

        <div className="fresh-concept-note"><span>Mode konsep lokal</span><p>Arah visual alternatif. Tidak memakai data produksi.</p></div>
        <button className="fresh-user"><span>RA</span><span><strong>Rahmat Albarzanjie</strong><small>Administrator data</small></span><ChevronDown /></button>
      </aside>
      {mobileNav ? <button className="fresh-mobile-scrim" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)} /> : null}

      <main className="fresh-canvas">
        <section className="fresh-heading">
          <div><h1>Ruang data</h1><p><strong>{urgentCount} pekerjaan mendesak</strong> perlu diselesaikan sebelum data berikutnya dapat diterbitkan.</p></div>
          <div className="fresh-heading-actions">
            <button className="fresh-icon-button" aria-label={dark ? "Gunakan tema terang" : "Gunakan tema gelap"} onClick={() => setDark((value) => !value)}>{dark ? <Sun /> : <Moon />}</button>
            <button className="fresh-icon-button" aria-label="Notifikasi"><Bell /><span className="fresh-unread">3</span></button>
            <button className="fresh-primary" onClick={() => { setStage("review"); setActiveNav("queue"); }}>Tinjau antrean <ArrowRight /></button>
          </div>
        </section>

        <section className="fresh-theme-picker" aria-labelledby="fresh-theme-title">
          <div className="fresh-theme-intro">
            <Palette />
            <span><strong id="fresh-theme-title">Tema tampilan</strong><small>Pilih suasana warna untuk membandingkan karakter SABABUKA.</small></span>
          </div>
          <div className="fresh-theme-options" role="radiogroup" aria-label="Pilihan warna tampilan">
            {colorThemes.map((item) => <button
              key={item.id}
              className={colorTheme === item.id ? "active" : ""}
              onClick={() => setColorTheme(item.id)}
              role="radio"
              aria-checked={colorTheme === item.id}
              title={item.description}
            >
              <span className="fresh-swatch" aria-hidden>
                {item.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
              </span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
              {colorTheme === item.id ? <Check aria-hidden /> : null}
            </button>)}
          </div>
          <div className="fresh-mode-switch" aria-label="Mode tampilan">
            <button className={!dark ? "active" : ""} onClick={() => setDark(false)} aria-pressed={!dark}><Sun /><span>Terang</span></button>
            <button className={dark ? "active" : ""} onClick={() => setDark(true)} aria-pressed={dark}><Moon /><span>Gelap</span></button>
          </div>
        </section>

        <label className="fresh-command">
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari indikator, OPD, atau pekerjaan…" aria-label="Cari indikator, OPD, atau pekerjaan" />
          <kbd>Ctrl K</kbd>
        </label>

        <section className="fresh-flow" aria-labelledby="fresh-flow-title">
          <header><div><h2 id="fresh-flow-title">Aliran kerja hari ini</h2><p>Pilih tahap untuk mempersempit pekerjaan.</p></div><span>{completedAverage}% selesai rata-rata</span></header>
          <div className="fresh-stage-track">
            {stages.map((item, index) => <button key={item.id} className={stage === item.id ? "active" : ""} onClick={() => setStage(item.id)} aria-pressed={stage === item.id}>
              <span className="fresh-stage-node">{item.id === "all" ? <Layers3 /> : index}</span>
              <span><strong>{item.label}</strong><small>{item.caption}</small></span>
              {index < stages.length - 1 ? <i aria-hidden /> : null}
            </button>)}
          </div>
        </section>

        <section className="fresh-grid">
          <div className="fresh-work-panel">
            <header className="fresh-section-head"><div><h2>Perlu ditindaklanjuti</h2><p>{filteredItems.length} dari {workItems.length} pekerjaan ditampilkan</p></div>{stage !== "all" || query ? <button onClick={() => { setStage("all"); setQuery(""); }}>Atur ulang</button> : null}</header>
            <div className="fresh-work-list">
              {filteredItems.length ? filteredItems.map((item) => <button key={item.id} className={`fresh-work-row${selectedId === item.id ? " selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                <span className={`fresh-priority ${item.priority}`} aria-label={item.priority === "urgent" ? "Mendesak" : item.priority === "attention" ? "Perlu perhatian" : "Normal"} />
                <span className="fresh-work-copy"><strong>{item.title}</strong><small>{item.owner} · {item.timing}</small></span>
                <span className="fresh-progress"><i style={{ width: `${item.progress}%` }} /><small>{item.progress}%</small></span>
                <ArrowRight />
              </button>) : <div className="fresh-empty"><strong>Tidak ada pekerjaan yang cocok</strong><p>Coba kata kunci lain atau tampilkan semua tahap.</p><button onClick={() => { setStage("all"); setQuery(""); }}>Tampilkan semua</button></div>}
            </div>
          </div>

          <aside className="fresh-detail" aria-live="polite">
            <header><span className={`fresh-status ${selected.priority}`}>{selected.priority === "urgent" ? "Mendesak" : selected.priority === "attention" ? "Perlu perhatian" : "Siap"}</span><button aria-label="Tutup pilihan" onClick={() => setSelectedId(workItems[0].id)}><X /></button></header>
            <h2>{selected.title}</h2><p>{selected.detail}</p>
            <dl><div><dt>Penanggung jawab</dt><dd>{selected.owner}</dd></div><div><dt>Tenggat</dt><dd>{selected.timing}</dd></div><div><dt>Kemajuan</dt><dd>{selected.progress}%</dd></div></dl>
            <div className="fresh-detail-progress"><i style={{ width: `${selected.progress}%` }} /></div>
            <div className="fresh-detail-actions"><button className="fresh-secondary">Lihat sumber</button><button className="fresh-primary">Buka pekerjaan <ArrowRight /></button></div>
          </aside>
        </section>

        <section className="fresh-insight-grid">
          <article className="fresh-metrics">
            <header className="fresh-section-head"><div><h2>Kondisi sistem data</h2><p>Ringkasan aktivitas sampai 25 Okt 2026, 08.12</p></div></header>
            <div><span><small>Sumber aktif</small><strong>12</strong><em>11 sinkron normal</em></span><span><small>Menunggu verifikasi</small><strong>{reviewCount}</strong><em>6 indikator di dalamnya</em></span><span><small>Uji kualitas lulus</small><strong>92%</strong><em>156 dari 169 pemeriksaan</em></span></div>
          </article>
          <article className="fresh-activity"><header className="fresh-section-head"><div><h2>Aktivitas terbaru</h2><p>Perubahan yang memengaruhi aliran data.</p></div><button>Lihat semua</button></header><ul><li><Check /><span><strong>Data kemiskinan disetujui</strong><small>Dinas Sosial · 12 menit lalu</small></span></li><li><Send /><span><strong>Revisi metadata dikirim</strong><small>Dinas Pendidikan · 38 menit lalu</small></span></li><li><UsersRound /><span><strong>PIC OPD diperbarui</strong><small>Diskominfosantik · 1 jam lalu</small></span></li></ul></article>
        </section>

        <footer className="fresh-lab-footer"><button onClick={() => navigate("/admin/organizations")}><ArrowLeft /> Kembali ke SABABUKA saat ini</button><span>Design Lab · route lokal tidak masuk menu pengguna</span></footer>
      </main>
    </div>
  );
}
