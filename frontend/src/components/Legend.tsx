import { Badge } from "../components";

/** Legenda istilah dan warna yang dipakai pada dashboard, detail indikator, dan jawaban asisten. */
export type LegendGroup = "target" | "status" | "source" | "chart";

/** Bila `groups` diberikan, hanya kelompok itu yang tampil; `folded` melipat legenda agar tidak memanjangkan halaman. */
export function Legend({ groups, folded = false }: { groups?: LegendGroup[]; folded?: boolean } = {}) {
  const show = (group: LegendGroup) => !groups || groups.includes(group);
  const body = <div className="legend-grid">
      {show("target") && <div><b>Capaian target RPJMD</b>
        <ul>
          <li><Badge tone="success">Tercapai</Badge><span>Realisasi terbit terbaru memenuhi target tahun yang sama.</span></li>
          <li><Badge tone="warning">Belum tercapai</Badge><span>Realisasi belum memenuhi target. Perlu rencana percepatan OPD.</span></li>
          <li><Badge tone="neutral">Belum ada data</Badge><span>Realisasi belum diisi atau belum terbit.</span></li>
          <li><span className="legend-swatch bar" aria-hidden /><span>Selisih = realisasi dikurangi target. Arah baik ditentukan arah indikator.</span></li>
        </ul></div>}
      {show("status") && <div><b>Status indikator</b>
        <ul>
          <li><Badge tone="success">Membaik</Badge><span>Bergerak ke arah yang diinginkan menurut arah indikator.</span></li>
          <li><Badge tone="warning">Memburuk</Badge><span>Bergerak menjauhi arah yang diinginkan. Perlu tindak lanjut.</span></li>
          <li><Badge tone="neutral">Belum dinilai</Badge><span>Arah baik-buruk indikator belum ditetapkan. Data tetap ada.</span></li>
          <li><Badge tone="neutral">Data belum cukup</Badge><span>Baru kurang dari 3 tahun data, tren belum dapat dinilai.</span></li>
          <li><Badge tone="warning">Tidak biasa</Badge><span>Perubahan terbaru jauh di luar pola historisnya.</span></li>
        </ul></div>}
      {show("source") && <div><b>Sumber data</b>
        <ul>
          <li><Badge tone="success">Terverifikasi</Badge><span>Indikator RPJMD dan usulan OPD yang disetujui BAPPERIDA.</span></li>
          <li><Badge tone="neutral">Bank Data</Badge><span>BPS dan Satu Data Kapuas, belum diverifikasi OPD dan BAPPERIDA. Dipakai sebagai konteks.</span></li>
        </ul></div>}
      {show("chart") && <div><b>Grafik dan angka</b>
        <ul>
          <li><span className="legend-swatch good" aria-hidden /><span>Hijau: membaik. Oranye: memburuk. Biru atau abu: belum dinilai.</span></li>
          <li><span className="legend-swatch dot" aria-hidden /><span>Titik terakhir pada garis adalah nilai terbaru. Garis tren menunjukkan arah, bukan sebab.</span></li>
          <li><span className="legend-swatch bar" aria-hidden /><span>Batang per kecamatan: lebih panjang berarti nilai lebih tinggi.</span></li>
        </ul></div>}
    </div>;
  if (folded) return <details className="legend legend-fold"><summary>Arti status, warna, dan grafik</summary>{body}</details>;
  return <section className="legend" aria-labelledby="legenda">
    <h3 id="legenda">Legenda</h3>
    {body}
  </section>;
}
