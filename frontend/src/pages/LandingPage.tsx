import { SababukaLockup } from "../branding/SababukaBrand";
import { navigate } from "../router";

/** Halaman depan sebelum masuk: pengantar singkat, pimpinan daerah, dan satu tombol Masuk ke halaman login. */
export function LandingPage() {
  return <div className="landing">
    <header className="landing-bar"><div className="landing-in">
      <SababukaLockup className="landing-lockup" />
      <div className="landing-kab">Pemerintah Kabupaten Kapuas<br />Kalimantan Tengah</div>
    </div></header>
    <main className="landing-hero" id="main-content"><div className="landing-in landing-grid">
      <div className="landing-copy">
        <span className="landing-pill">Sistem Analisis Big Data Kabupaten Kapuas</span>
        <h1>Data terpercaya untuk pembangunan Kapuas</h1>
        <p className="landing-tagline">Data terverifikasi untuk keputusan yang tepat.</p>
        <div className="landing-act">
          <button type="button" className="landing-enter" onClick={() => navigate("/login")}>Masuk</button>
          <p>Untuk pimpinan daerah, perangkat daerah, dan petugas yang telah memiliki akun.</p>
        </div>
      </div>
      <section className="landing-pair" aria-label="Pimpinan Daerah Kabupaten Kapuas">
        <article className="landing-person">
          <div className="landing-photo"><img src="/brand/bupati.jpg" width={520} height={574} alt="Foto resmi H.M. Wiyatno, S.P., Bupati Kapuas" decoding="async" /></div>
          <div><h2>H.M. Wiyatno, S.P.</h2><p>Bupati Kapuas<br />Periode 2025-2030</p></div>
        </article>
        <article className="landing-person">
          <div className="landing-photo"><img src="/brand/wakil.jpg" width={520} height={618} alt="Foto resmi Dodo, S.P., Wakil Bupati Kapuas" decoding="async" /></div>
          <div><h2>Dodo, S.P.</h2><p>Wakil Bupati Kapuas<br />Periode 2025-2030</p></div>
        </article>
      </section>
    </div></main>
    <footer className="landing-foot"><div className="landing-in">Dikembangkan oleh Tim Peneliti Kajian SABABUKA BERSINAR 2026</div></footer>
  </div>;
}
