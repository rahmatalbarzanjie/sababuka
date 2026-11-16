import { Badge } from "../components";

/** Legenda istilah dan warna yang dipakai pada dashboard, detail indikator, dan jawaban asisten. */
export function Legend() {
  return <section className="legend" aria-labelledby="legenda">
    <h3 id="legenda">Legenda</h3>
    <div className="legend-grid">
      <div><b>Status indikator</b>
        <ul>
          <li><Badge tone="success">Membaik</Badge><span>Bergerak ke arah yang diinginkan menurut arah indikator.</span></li>
          <li><Badge tone="warning">Memburuk</Badge><span>Bergerak menjauhi arah yang diinginkan. Perlu tindak lanjut.</span></li>
          <li><Badge tone="neutral">Belum dinilai</Badge><span>Arah baik-buruk indikator belum ditetapkan. Data tetap ada.</span></li>
          <li><Badge tone="neutral">Data belum cukup</Badge><span>Baru kurang dari 3 tahun data, tren belum dapat dinilai.</span></li>
          <li><Badge tone="warning">Tidak biasa</Badge><span>Perubahan terbaru jauh di luar pola historisnya.</span></li>
        </ul></div>
      <div><b>Sumber data</b>
        <ul>
          <li><Badge tone="success">Terverifikasi</Badge><span>Indikator RPJMD dan usulan OPD yang disetujui BAPPERIDA.</span></li>
          <li><Badge tone="neutral">Bank Data</Badge><span>BPS dan Satu Data Kapuas, belum diverifikasi OPD dan BAPPERIDA. Dipakai sebagai konteks.</span></li>
        </ul></div>
      <div><b>Grafik dan angka</b>
        <ul>
          <li><span className="legend-swatch good" aria-hidden /><span>Hijau: membaik. Oranye: memburuk. Biru atau abu: belum dinilai.</span></li>
          <li><span className="legend-swatch dot" aria-hidden /><span>Titik terakhir pada garis adalah nilai terbaru. Garis tren menunjukkan arah, bukan sebab.</span></li>
          <li><span className="legend-swatch bar" aria-hidden /><span>Batang per kecamatan: lebih panjang berarti nilai lebih tinggi.</span></li>
        </ul></div>
    </div>
  </section>;
}
