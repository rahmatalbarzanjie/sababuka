import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "./artifact_tool_local.mjs";

const WORKSPACE = "D:/Projects/SABABUKA Bersinar";
const SKILL_DIR = "C:/Users/user/.codex/plugins/cache/openai-primary-runtime/presentations/26.1022.11436/skills/presentations";
const RUNTIME_PYTHON = "C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const BUILD_DIR = path.join(WORKSPACE, ".codex-build", "audit-ekosistem-data");
const FINAL_DIR = path.join(WORKSPACE, "output", "paparan-bapperida");
const FINAL_PPTX = path.join(FINAL_DIR, "SABABUKA_Audit_Ekosistem_Data_Kapuas_2026-10-25_final.pptx");
const LOGO = path.join(WORKSPACE, "frontend", "public", "brand", "sababuka-mark.svg");
const LOGO_SVG = await fs.readFile(LOGO, "utf8");

const W = 1280;
const H = 720;
const FONT = "Aptos";
const C = {
  navy: "#0B2E4F", blue: "#1261A0", teal: "#087F73", gold: "#C58B1B",
  ink: "#172433", muted: "#587086", line: "#DCE6ED", pale: "#F3F8FB",
  paleBlue: "#EAF3F9", white: "#FFFFFF", red: "#B83A3A", amber: "#A86408",
  green: "#13795B", softGreen: "#E9F6F1", softAmber: "#FFF4DD", softRed: "#FCEBEC",
};

const bpsUrls = {
  2017: "https://kapuaskab.bps.go.id/id/publication/2017/08/11/b17782d8c323047af918d321/kabupaten-kapuas-dalam-angka-2017.html",
  2020: "https://kapuaskab.bps.go.id/id/publication/2020/04/27/bbbd34de83a3e84a580ca491/kabupaten-kapuas-dalam-angka-2020.html",
  2026: "https://kapuaskab.bps.go.id/id/publication/2026/02/27/ee22ec8a7b750c441e674695/kabupaten-kapuas-dalam-angka-2026.html",
};
const ckanUrl = "https://satudata.kapuaskab.go.id/api/3/action/package_search?rows=0";

function addBox(slide, x, y, w, h, fill = C.white, stroke = C.line, radius = "rounded-xl") {
  return slide.shapes.add({
    geometry: "roundRect", position: { left: x, top: y, width: w, height: h },
    fill, line: { style: "solid", fill: stroke, width: 1 }, borderRadius: radius,
  });
}

function addText(slide, value, x, y, w, h, size = 22, color = C.ink, bold = false, align = "left") {
  const s = slide.shapes.add({
    geometry: "textbox", position: { left: x, top: y, width: w, height: h },
    fill: "none", line: { style: "solid", fill: "none", width: 0 },
  });
  s.text = value;
  s.text.style = { fontFamily: FONT, fontSize: size, color, bold, alignment: align };
  return s;
}

function addRule(slide, x, y, w, color = C.gold, h = 4) {
  slide.shapes.add({ geometry: "rect", position: { left: x, top: y, width: w, height: h }, fill: color, line: { style: "solid", fill: color, width: 0 } });
}

async function addBrand(slide, inverted = false) {
  slide.images.add({ svg: LOGO_SVG, alt: "Logo SABABUKA", fit: "contain", position: { left: 70, top: 38, width: 46, height: 46 } });
  addText(slide, "SABABUKA BERSINAR", 126, 42, 290, 25, 14, inverted ? C.white : C.navy, true);
  addText(slide, "Bank data & analisis Kabupaten Kapuas", 126, 66, 350, 20, 11, inverted ? "#D9EAF5" : C.muted, false);
}

async function addHeader(slide, title, kicker, number) {
  slide.background.fill = C.white;
  await addBrand(slide, false);
  addText(slide, kicker.toUpperCase(), 70, 112, 420, 25, 12, C.blue, true);
  addText(slide, title, 70, 142, 1110, 72, 34, C.navy, true);
  addRule(slide, 70, 218, 104, C.gold, 4);
  addText(slide, String(number).padStart(2, "0"), 1175, 43, 35, 24, 12, C.muted, true, "right");
}

function addFooter(slide, source) {
  addText(slide, source, 70, 676, 1040, 20, 10, C.muted, false);
  addText(slide, "25 Oktober 2026", 1095, 676, 115, 20, 10, C.muted, false, "right");
}

function addMetric(slide, x, y, w, label, value, note, tone = "blue") {
  const cfg = tone === "green" ? [C.softGreen, C.green] : tone === "amber" ? [C.softAmber, C.amber] : tone === "red" ? [C.softRed, C.red] : [C.paleBlue, C.blue];
  addBox(slide, x, y, w, 142, cfg[0], cfg[0]);
  addText(slide, value, x + 20, y + 18, w - 40, 48, 34, cfg[1], true);
  addText(slide, label, x + 20, y + 68, w - 40, 27, 16, C.ink, true);
  addText(slide, note, x + 20, y + 100, w - 40, 30, 11, C.muted, false);
}

function addBulletList(slide, items, x, y, w, lineH = 62, size = 18) {
  items.forEach((item, i) => {
    slide.shapes.add({ geometry: "ellipse", position: { left: x, top: y + i * lineH + 8, width: 11, height: 11 }, fill: C.gold, line: { style: "solid", fill: C.gold, width: 0 } });
    addText(slide, item, x + 24, y + i * lineH, w - 24, lineH - 5, size, C.ink, false);
  });
}

function setNotes(slide, lines) {
  slide.speakerNotes.text = lines;
  slide.speakerNotes.setVisible(true);
}

function addFlow(slide, steps, y = 310) {
  const gap = 18;
  const w = (1140 - gap * (steps.length - 1)) / steps.length;
  steps.forEach((s, i) => {
    const x = 70 + i * (w + gap);
    addBox(slide, x, y, w, 150, i === steps.length - 1 ? C.softGreen : C.pale, i === steps.length - 1 ? "#B9DED1" : C.line);
    addText(slide, String(i + 1), x + 18, y + 16, 32, 28, 13, i === steps.length - 1 ? C.green : C.blue, true);
    addText(slide, s[0], x + 18, y + 50, w - 36, 48, 18, C.navy, true);
    addText(slide, s[1], x + 18, y + 103, w - 36, 34, 11, C.muted, false);
    if (i < steps.length - 1) addText(slide, "→", x + w + 1, y + 58, gap, 30, 18, C.gold, true, "center");
  });
}

async function main() {
  await fs.mkdir(BUILD_DIR, { recursive: true });
  await fs.mkdir(FINAL_DIR, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  // 1 — Cover
  {
    const s = presentation.slides.add(); s.background.fill = C.navy;
    await addBrand(s, true);
    addText(s, "AUDIT EKOSISTEM DATA\nKABUPATEN KAPUAS", 70, 170, 760, 150, 46, C.white, true);
    addRule(s, 70, 338, 150, C.gold, 6);
    addText(s, "Temuan BPS 2017–2026, Satu Data Kapuas, kesiapan SABABUKA, dan arah Bank Data", 70, 372, 760, 90, 23, "#D9EAF5", false);
    addBox(s, 905, 160, 300, 350, "#123D62", "#2B5678", "rounded-2xl");
    addText(s, "BAHAN PAPARAN", 935, 200, 240, 26, 13, "#9FC8E2", true);
    addText(s, "BAPPERIDA\nKABUPATEN KAPUAS", 935, 246, 240, 95, 29, C.white, true);
    addText(s, "Transparan · dapat ditelusuri · tanpa angka rekaan", 935, 374, 230, 68, 17, "#D9EAF5", false);
    addText(s, "25 Oktober 2026", 70, 646, 250, 24, 14, "#D9EAF5", false);
    setNotes(s, ["Paparan ini membedakan fakta hasil audit, interpretasi, dan rekomendasi.", `Sumber utama: ${bpsUrls[2017]} ; ${bpsUrls[2026]} ; ${ckanUrl}`]);
  }

  // 2 — scope
  {
    const s = presentation.slides.add(); await addHeader(s, "Apa yang diaudit—dan apa yang belum boleh disimpulkan", "Ruang lingkup", 2);
    addMetric(s, 70, 270, 250, "Edisi BPS", "10", "Kabupaten Kapuas Dalam Angka 2017–2026", "blue");
    addMetric(s, 338, 270, 250, "Dataset CKAN", "3.927", "Hitungan global API resmi pada tanggal audit", "green");
    addMetric(s, 606, 270, 250, "Dataset terpetakan", "3.906", "Terhubung ke 25 organisasi pada snapshot", "amber");
    addMetric(s, 874, 270, 336, "Batas audit", "Metadata", "Belum menilai kebenaran setiap nilai observasi", "red");
    addText(s, "Prinsip: jumlah tabel ≠ jumlah indikator; format terstruktur ≠ data siap analisis.", 70, 455, 1140, 52, 23, C.navy, true);
    addText(s, "Setiap kesimpulan kuantitatif di paparan ini dapat ditelusuri ke keluaran audit atau API resmi.", 70, 525, 1040, 42, 17, C.muted, false);
    addFooter(s, "Sumber: audit internal SABABUKA; API resmi Satu Data Kapuas.");
    setNotes(s, ["Audit BPS menggunakan URL publikasi resmi, hash SHA-256, jumlah halaman, keterbacaan teks, dan rekonsiliasi daftar tabel.", `CKAN: ${ckanUrl}`]);
  }

  // 3 — executive
  {
    const s = presentation.slides.add(); await addHeader(s, "Tiga pesan utama untuk pengambilan keputusan", "Ringkasan eksekutif", 3);
    const cards = [
      ["01", "Seri BPS kuat, tetapi heterogen", "Tema besar berulang, sedangkan struktur tabel, definisi, unit, dan sumber dapat berubah antar-edisi."],
      ["02", "Volume Satu Data belum identik dengan kesiapan analisis", "Lisensi, tag, konsentrasi koleksi, dan rekonsiliasi organisasi masih menjadi hambatan tata kelola."],
      ["03", "SABABUKA perlu menjadi lapisan makna", "Simpan katalog, observasi terpilih, provenance, kualitas, dan relasi indikator—bukan menggandakan semua berkas sumber."],
    ];
    cards.forEach((c, i) => {
      const x = 70 + i * 378;
      addBox(s, x, 270, 350, 300, i === 2 ? C.softGreen : C.pale, i === 2 ? "#B9DED1" : C.line, "rounded-2xl");
      addText(s, c[0], x + 24, 294, 55, 30, 14, i === 2 ? C.green : C.blue, true);
      addText(s, c[1], x + 24, 342, 300, 74, 23, C.navy, true);
      addText(s, c[2], x + 24, 438, 300, 105, 16, C.ink, false);
    });
    addFooter(s, "Interpretasi audit; lihat metodologi dan batasan pada dokumen pendamping.");
    setNotes(s, ["Pesan 1 dan 2 adalah interpretasi dari hasil inventaris; pesan 3 adalah rekomendasi arsitektur."]);
  }

  // 4 — BPS tables
  {
    const s = presentation.slides.add(); await addHeader(s, "Inventaris tabel BPS berubah antar-edisi", "BPS Kapuas Dalam Angka", 4);
    const cats = ["2017","2018","2019","2021","2022","2023","2024","2025","2026"];
    const values = [170,173,154,136,134,123,119,128,129];
    s.charts.add("bar", {
      position: { left: 70, top: 255, width: 820, height: 360 }, categories: cats,
      series: [{ name: "Tabel terekomendasi", values, fill: C.blue }],
      barOptions: { direction: "column", grouping: "clustered", gapWidth: 46 }, hasLegend: false,
      yAxis: { min: 0, max: 200, majorUnit: 50, title: "Jumlah tabel", textStyle: { fontSize: 12, fill: C.muted }, majorGridlines: { style: "solid", fill: C.line, width: 1 } },
      xAxis: { textStyle: { fontSize: 12, fill: C.muted }, line: { style: "solid", fill: C.line, width: 1 } },
      dataLabels: { showValue: true, position: "outEnd", textStyle: { fontSize: 12, fill: C.navy, bold: true } },
      chartFill: C.white, plotAreaFill: C.white,
    });
    addBox(s, 920, 270, 290, 260, C.softAmber, "#EBCB88");
    addText(s, "2020 tidak dibandingkan otomatis", 946, 300, 238, 58, 21, C.amber, true);
    addText(s, "PDF berbasis gambar: hanya 1 dari 461 halaman memiliki teks yang dapat diekstrak. Ini celah metode, bukan nol tabel.", 946, 378, 238, 118, 15, C.ink, false);
    addFooter(s, "Sumber: publikasi resmi BPS Kapuas 2017–2026; rekonsiliasi daftar tabel dan badan publikasi.");
    setNotes(s, [`BPS 2017: ${bpsUrls[2017]}`, `BPS 2020: ${bpsUrls[2020]}`, `BPS 2026: ${bpsUrls[2026]}`, "Nilai chart adalah jumlah tabel hasil rekonsiliasi, bukan jumlah indikator."]);
  }

  // 5 — readability
  {
    const s = presentation.slides.add(); await addHeader(s, "Keterbacaan mesin tidak konsisten", "BPS Kapuas Dalam Angka", 5);
    const years = ["2017","2018","2019","2020","2021","2022","2023","2024","2025","2026"];
    s.charts.add("bar", {
      position: { left: 70, top: 255, width: 860, height: 365 }, categories: years,
      series: [
        { name: "Jumlah halaman", values: [386,398,418,461,461,464,444,448,454,430], fill: "#B8D3E5" },
        { name: "Halaman dengan teks", values: [346,351,361,1,404,406,382,421,426,403], fill: C.teal },
      ],
      barOptions: { direction: "column", grouping: "clustered", gapWidth: 35 },
      legend: { position: "bottom", overlay: false, textStyle: { fontSize: 12, fill: C.muted } },
      yAxis: { min: 0, max: 500, majorUnit: 100, textStyle: { fontSize: 12, fill: C.muted }, majorGridlines: { style: "solid", fill: C.line, width: 1 } },
      xAxis: { textStyle: { fontSize: 12, fill: C.muted } }, chartFill: C.white, plotAreaFill: C.white,
    });
    addBox(s, 962, 280, 248, 224, C.softRed, "#E9B8BC");
    addText(s, "Implikasi", 986, 307, 200, 30, 17, C.red, true);
    addText(s, "Pipeline ingest perlu OCR, pemeriksaan manual, dan skor kepercayaan. PDF tidak boleh diperlakukan seragam.", 986, 354, 200, 118, 16, C.ink, false);
    addFooter(s, "Sumber: hasil ekstraksi teks PDF resmi BPS; 2020 ditandai sebagai outlier teknis.");
    setNotes(s, ["Halaman dengan teks dihitung dari kemampuan ekstraksi PDF, bukan penilaian mutu statistik.", `BPS 2020: ${bpsUrls[2020]}`]);
  }

  // 6 — stable themes
  {
    const s = presentation.slides.add(); await addHeader(s, "Bandingkan konsep, bukan nomor tabel", "Pola seri waktu", 6);
    addText(s, "Tema yang berulang", 70, 270, 345, 35, 22, C.navy, true);
    addBulletList(s, ["Geografi & iklim", "Penduduk & ketenagakerjaan", "Sosial, kesehatan, pendidikan", "Pertanian, ekonomi, keuangan", "Transportasi & infrastruktur"], 70, 320, 370, 54, 17);
    addBox(s, 490, 270, 720, 310, C.pale, C.line, "rounded-2xl");
    addText(s, "Relasi yang harus disimpan di SABABUKA", 520, 298, 650, 32, 21, C.navy, true);
    const relasi = [["Konsep", "Apa yang diukur"], ["Definisi", "Ruang lingkup"], ["Unit", "Satuan & skala"], ["Dimensi", "Wilayah/waktu"], ["Sumber", "Produsen & rilis"]];
    relasi.forEach((r, i) => {
      const x = 520 + i * 130;
      addBox(s, x, 360, 120, 150, i === 4 ? C.softGreen : C.white, i === 4 ? "#B9DED1" : C.line);
      addText(s, String(i + 1), x + 14, 376, 26, 22, 11, i === 4 ? C.green : C.blue, true);
      addText(s, r[0], x + 14, 414, 92, 34, 15, C.navy, true);
      addText(s, r[1], x + 14, 466, 92, 28, 10, C.muted, false);
      if (i < 4) addText(s, "→", x + 119, 418, 12, 26, 14, C.gold, true, "center");
    });
    addText(s, "Nomor tabel dapat berubah. Identitas indikator harus bertahan melalui metadata konseptual dan provenance.", 490, 602, 720, 44, 17, C.blue, true);
    addFooter(s, "Sumber: perbandingan struktur publikasi BPS 2017–2026; interpretasi metodologis.");
    setNotes(s, ["Tema berulang adalah klasifikasi konseptual. Pernyataan perubahan definisi/unit adalah risiko yang harus diverifikasi per tabel sebelum penyambungan seri."]);
  }

  // 7 — rules
  {
    const s = presentation.slides.add(); await addHeader(s, "Lima pemeriksaan sebelum membuat tren", "Aturan analisis", 7);
    addFlow(s, [["Definisi", "Sama atau direkonsiliasi"], ["Unit", "Skala konsisten"], ["Cakupan", "Populasi & wilayah"], ["Waktu", "Periode rujukan"], ["Sumber", "Produsen & metode"]], 290);
    addBox(s, 70, 490, 1140, 100, C.softGreen, "#B9DED1");
    addText(s, "Hanya seri yang lolos seluruh pemeriksaan yang boleh tampil sebagai tren resmi di dashboard pimpinan.", 100, 520, 1080, 44, 23, C.green, true, "center");
    addFooter(s, "Rekomendasi kendali mutu untuk ingestion dan analitik SABABUKA.");
    setNotes(s, ["Aturan ini adalah quality gate, bukan hasil penilaian nilai statistik individual."]);
  }

  // 8 — CKAN scale
  {
    const s = presentation.slides.add(); await addHeader(s, "Ada selisih yang perlu direkonsiliasi pada katalog", "Satu Data Kapuas", 8);
    addMetric(s, 70, 260, 250, "Hitungan global CKAN", "3.927", "package_search rows=0", "blue");
    addMetric(s, 338, 260, 250, "Terpetakan ke organisasi", "3.906", "Hasil agregasi 25 organisasi", "green");
    addMetric(s, 606, 260, 250, "Selisih rekonsiliasi", "21", "Perlu identifikasi organisasi/status", "red");
    addMetric(s, 874, 260, 336, "Resources", "4.009", "Dalam organisasi yang terpetakan", "amber");
    s.charts.add("bar", {
      position: { left: 120, top: 450, width: 970, height: 150 },
      categories: ["Global API", "Terpetakan"], series: [{ name: "Dataset", values: [3927,3906], fill: C.blue }],
      barOptions: { direction: "bar", grouping: "clustered", gapWidth: 65 }, hasLegend: false,
      xAxis: { min: 0, max: 4200, majorGridlines: { style: "solid", fill: C.line, width: 1 }, textStyle: { fontSize: 11, fill: C.muted } },
      yAxis: { textStyle: { fontSize: 13, fill: C.ink } }, dataLabels: { showValue: true, position: "outEnd", textStyle: { fontSize: 13, fill: C.navy, bold: true } }, chartFill: C.white, plotAreaFill: C.white,
    });
    addFooter(s, "Sumber: API resmi Satu Data Kapuas; audit 25 Oktober 2026.");
    setNotes(s, [`API global: ${ckanUrl}`, "Selisih = 3.927 − 3.906 = 21. Selisih ini memerlukan rekonsiliasi, bukan asumsi penghapusan."]);
  }

  // 9 — concentration
  {
    const s = presentation.slides.add(); await addHeader(s, "97,6% dataset terpetakan terkonsentrasi pada dua koleksi", "Satu Data Kapuas", 9);
    addMetric(s, 70, 270, 340, "Data Pemkab Kapuas 2025", "2.061", "52,8% dari dataset terpetakan", "blue");
    addMetric(s, 430, 270, 340, "PPID 2011–2026", "1.751", "44,8% dari dataset terpetakan", "amber");
    addMetric(s, 790, 270, 420, "Dua koleksi terbesar", "3.812", "97,6% dari 3.906 dataset terpetakan", "green");
    addBox(s, 70, 450, 1140, 120, C.pale, C.line);
    addText(s, "Makna audit", 96, 476, 170, 28, 16, C.blue, true);
    addText(s, "Skala katalog besar, tetapi representasi OPD tidak merata. Prioritasnya bukan menambah volume, melainkan memperjelas kepemilikan, cakupan, dan kualitas metadata.", 270, 468, 900, 72, 19, C.ink, false);
    addFooter(s, "Sumber: rekap organisasi CKAN Satu Data Kapuas, audit 25 Oktober 2026.");
    setNotes(s, ["2.061 + 1.751 = 3.812; 3.812 / 3.906 = 97,6% (dibulatkan satu desimal)."]);
  }

  // 10 — metadata gaps
  {
    const s = presentation.slides.add(); await addHeader(s, "Kesenjangan terbesar berada pada metadata tata kelola", "Satu Data Kapuas", 10);
    s.charts.add("bar", {
      position: { left: 70, top: 265, width: 760, height: 315 },
      categories: ["Tanpa lisensi dinyatakan", "Tanpa tag"],
      series: [{ name: "Persentase dataset", values: [98.1,41.2], fill: C.red }],
      barOptions: { direction: "bar", grouping: "clustered", gapWidth: 55 }, hasLegend: false,
      xAxis: { min: 0, max: 100, majorUnit: 20, numberFormatCode: "0%", majorGridlines: { style: "solid", fill: C.line, width: 1 }, textStyle: { fontSize: 11, fill: C.muted } },
      yAxis: { textStyle: { fontSize: 14, fill: C.ink } }, dataLabels: { showValue: true, position: "outEnd", numberFormatCode: "0.0", textStyle: { fontSize: 14, fill: C.red, bold: true } }, chartFill: C.white, plotAreaFill: C.white,
    });
    addBox(s, 865, 270, 345, 290, C.softAmber, "#EBCB88");
    addText(s, "3.833", 892, 298, 285, 48, 34, C.amber, true);
    addText(s, "dataset tanpa lisensi dinyatakan", 892, 346, 280, 46, 17, C.ink, true);
    addText(s, "1.608 dataset tanpa tag. Keberadaan deskripsi pada field mentah belum membuktikan kelengkapan atau kualitas narasinya.", 892, 410, 275, 110, 15, C.ink, false);
    addFooter(s, "Sumber: audit metadata CKAN; denominator 3.906 dataset terpetakan.");
    setNotes(s, ["3.833 / 3.906 = 98,1%; 1.608 / 3.906 = 41,2% (dibulatkan satu desimal).", "Deskripsi dinilai sebatas keberadaan field, bukan kualitas semantik."]);
  }

  // 11 — readiness table
  {
    const s = presentation.slides.add(); await addHeader(s, "Kesiapan berbeda antar-organisasi", "Satu Data Kapuas", 11);
    const table = s.tables.add({
      rows: 6, columns: 4, left: 70, top: 260, width: 1140, height: 330,
      values: [
        ["Organisasi/koleksi", "Dataset", "Resource", "Catatan audit"],
        ["Data Pemkab Kapuas 2025", "2.061", "2.061", "1.817 resource terstruktur"],
        ["PPID 2011–2026", "1.751", "1.751", "8 resource terstruktur"],
        ["DPUPR", "21", "118", "93 resource geospasial"],
        ["Dinas Kesehatan", "13", "13", "13 resource terstruktur"],
        ["Organisasi tanpa dataset", "4 org.", "—", "Perlu konfirmasi mandat/publikasi"],
      ],
    });
    table.styleOptions = { headerRow: true, bandedRows: true };
    table.borders.assign({ style: "solid", fill: C.line, width: 1 });
    for (let c = 0; c < 4; c++) { table.getCell(0,c).fill = C.navy; table.getCell(0,c).text.style = { fontFamily: FONT, fontSize: 14, bold: true, color: C.white }; }
    for (let r = 1; r < 6; r++) for (let c = 0; c < 4; c++) table.getCell(r,c).text.style = { fontFamily: FONT, fontSize: 13, color: C.ink };
    table.columns.get(0).width = 315; table.columns.get(1).width = 120; table.columns.get(2).width = 120; table.columns.get(3).width = 585;
    addFooter(s, "Sumber: rekap organisasi dan resource CKAN, audit 25 Oktober 2026.");
    setNotes(s, ["Kategori terstruktur mengikuti format resource pada snapshot audit; belum membuktikan kelengkapan isi atau konsistensi nilai."]);
  }

  // 12 — format ≠ readiness
  {
    const s = presentation.slides.add(); await addHeader(s, "Format terstruktur baru langkah pertama", "Kesiapan analitik", 12);
    addFlow(s, [["Dapat dibaca", "CSV/XLS/API/Geo"], ["Dapat dipahami", "Metadata jelas"], ["Dapat dipercaya", "Validasi & provenance"], ["Dapat dibandingkan", "Konsep/unit konsisten"], ["Dapat dipakai", "Disetujui & dipublikasi"]], 290);
    addBox(s, 70, 490, 1140, 105, C.softRed, "#E9B8BC");
    addText(s, "Jangan memberi label ‘siap analisis’ hanya karena berkas dapat dibuka mesin.", 100, 522, 1080, 38, 24, C.red, true, "center");
    addFooter(s, "Kerangka penilaian kesiapan data SABABUKA; rekomendasi hasil audit.");
    setNotes(s, ["Kerangka ini harus diterapkan per dataset dan per seri indikator."]);
  }

  // 13 — current system gap
  {
    const s = presentation.slides.add(); await addHeader(s, "Fondasi tata kelola sudah ada; lapisan data perlu diperluas", "Posisi SABABUKA", 13);
    const cols = [
      ["Sudah menjadi kekuatan", C.softGreen, C.green, ["RBAC dan pemisahan kewenangan", "Verifikasi/publikasi", "Provenance dan audit trail", "Indikator RPJMD & pelaporan OPD"]],
      ["Perlu dibangun berikutnya", C.softAmber, C.amber, ["Katalog lintas sumber", "Canonical indicator & mapping", "Observasi multidimensi", "Skor kualitas dan lineage", "Analitik seri waktu terkontrol"]],
    ];
    cols.forEach((c,i) => { const x = 70 + i*580; addBox(s,x,270,550,320,c[1],c[1],"rounded-2xl"); addText(s,c[0],x+28,298,490,34,22,c[2],true); addBulletList(s,c[3],x+28,355,490,52,17); });
    addFooter(s, "Sumber: audit kode, kontrak API, dan migration pada branch aktif; rincian dalam blueprint.");
    setNotes(s, ["Status fitur mengikuti kode aktif, bukan catatan placeholder lama.", "Data pimpinan tetap hanya berasal dari data yang disetujui dan dipublikasikan."]);
  }

  // 14 — architecture
  {
    const s = presentation.slides.add(); await addHeader(s, "Berkas tetap di sumber; SABABUKA menyimpan makna dan bukti", "Arsitektur Bank Data", 14);
    addFlow(s, [["Sumber eksternal", "BPS, CKAN, OPD, API"], ["Katalog", "URL, checksum, lisensi"], ["Normalisasi", "Konsep, unit, dimensi"], ["Governance", "Validasi, persetujuan"], ["Konsumsi", "Dashboard & analitik"]], 280);
    addBox(s, 70, 485, 550, 115, C.paleBlue, "#C9DFEC");
    addText(s, "Disimpan di SABABUKA", 96, 508, 220, 26, 16, C.blue, true);
    addText(s, "Metadata, observasi terpilih, provenance, kualitas, relasi indikator, cache ringkasan.", 96, 542, 490, 42, 16, C.ink, false);
    addBox(s, 650, 485, 560, 115, C.softAmber, "#EBCB88");
    addText(s, "Tetap di sumber", 676, 508, 190, 26, 16, C.amber, true);
    addText(s, "PDF/XLS besar dan berkas unduhan; pengguna diarahkan ke URL resmi untuk mengunduh.", 676, 542, 500, 42, 16, C.ink, false);
    addFooter(s, "Rekomendasi arsitektur; prinsip source-of-truth eksternal dan metadata-first.");
    setNotes(s, ["SABABUKA tidak menjadi mirror seluruh file. Cache hanya bila diizinkan, terbatas, dan memiliki kebijakan kedaluwarsa."]);
  }

  // 15 — analytics
  {
    const s = presentation.slides.add(); await addHeader(s, "Ringkasan pimpinan harus deterministik dan dapat diaudit", "Analitik & AI", 15);
    const layers = [
      ["1", "Perhitungan", "Formula eksplisit, versi data, pembulatan terdokumentasi", C.paleBlue, C.blue],
      ["2", "Deteksi", "Anomali dan perubahan hanya pada seri yang lolos quality gate", C.softAmber, C.amber],
      ["3", "Prediksi", "ML hanya setelah backtesting, baseline, dan evaluasi drift", C.softGreen, C.green],
      ["4", "Narasi", "LLM merangkai bahasa; tidak menciptakan angka atau status", C.softRed, C.red],
    ];
    layers.forEach((l,i)=>{ const y=264+i*82; addBox(s,70,y,1140,66,l[3],l[3]); addText(s,l[0],92,y+17,35,28,15,l[4],true); addText(s,l[1],142,y+14,190,31,19,C.navy,true); addText(s,l[2],340,y+14,830,34,17,C.ink,false); });
    addText(s, "Semua insight menyertakan periode, sumber, status publikasi, confidence/quality flag, dan waktu pembaruan.", 70, 610, 1140, 42, 19, C.navy, true);
    addFooter(s, "Rancangan kendali analitik SABABUKA; premium dibuka melalui feature flag pada fase internal.");
    setNotes(s, ["Machine learning bukan default. Model hanya boleh dipakai bila ada data cukup, baseline, evaluasi out-of-sample, dan pemantauan drift."]);
  }

  // 16 — decisions
  {
    const s = presentation.slides.add(); await addHeader(s, "Keputusan yang diperlukan dari BAPPERIDA", "Prioritas 90 hari", 16);
    const items = [
      ["1", "Tetapkan standar metadata minimum", "Lisensi, produsen, cakupan, periode, unit, definisi, URL sumber."],
      ["2", "Rekonsiliasi 21 dataset", "Pastikan organisasi, status publikasi, dan kepemilikan data."],
      ["3", "Pilih pilot lintas domain", "BPS + kesehatan + infrastruktur/geospasial untuk menguji model data."],
      ["4", "Setujui canonical indicator", "Mapping konsep sebelum membangun tren lintas tahun."],
      ["5", "Tetapkan quality gate dashboard", "Hanya data disetujui dan dipublikasikan untuk pimpinan."],
    ];
    items.forEach((it,i)=>{ const x=70+(i%3)*380, y=260+Math.floor(i/3)*165; addBox(s,x,y,350,140,i===4?C.softGreen:C.pale,i===4?"#B9DED1":C.line); addText(s,it[0],x+20,y+18,30,26,13,i===4?C.green:C.blue,true); addText(s,it[1],x+20,y+48,310,34,19,C.navy,true); addText(s,it[2],x+20,y+87,310,42,14,C.ink,false); });
    addFooter(s, "Rekomendasi tindakan; penetapan kebijakan tetap kewenangan BAPPERIDA/Pemerintah Kabupaten Kapuas.");
    setNotes(s, ["Urutan dipilih untuk mengurangi risiko sebelum menambah analitik lanjutan."]);
  }

  // 17 — roadmap / close
  {
    const s = presentation.slides.add(); await addHeader(s, "Dari katalog menuju bank data yang dapat dipercaya", "Peta jalan", 17);
    addFlow(s, [["0–30 hari", "Standar & rekonsiliasi"], ["31–60 hari", "Model data & pilot"], ["61–90 hari", "Dashboard tervalidasi"], ["Tahap berikutnya", "Analitik & ML terkontrol"]], 285);
    addBox(s, 70, 490, 1140, 105, C.navy, C.navy, "rounded-2xl");
    addText(s, "Target akhir: satu tempat untuk menemukan data Kapuas, memahami konteksnya, menilai kualitasnya, dan memakai insight yang dapat dipertanggungjawabkan.", 102, 514, 1076, 58, 22, C.white, true, "center");
    addFooter(s, "Dokumen pendamping: audit ekosistem data dan blueprint Bank Data Kapuas.");
    setNotes(s, ["Paparan berakhir pada keputusan dan urutan implementasi, bukan pada klaim bahwa seluruh data sudah bersih."]);
  }

  for (const [i, slide] of presentation.slides.items.entries()) {
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(BUILD_DIR, `slide-${String(i+1).padStart(2,"0")}.png`), new Uint8Array(await png.arrayBuffer()));
  }
  const montage = await presentation.export({ format: "webp", montage: true, scale: 0.35 });
  await fs.writeFile(path.join(BUILD_DIR, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));

  const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href);
  const stagingDir = path.join(BUILD_DIR, ".codex-finalizer");
  await fs.mkdir(stagingDir, { recursive: true });
  const candidatePath = path.join(stagingDir, "candidate.pptx");
  await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
  const result = await finalizePresentation({
    explicitTotalSlideCount: 17,
    requiredNativeTableOwnerSlides: [11],
    requiredNativeChartOwnerSlides: [4,5,8,10],
    materializeLiteralChartWorkbooks: true,
    workspaceDir: WORKSPACE, candidatePath, finalPath: FINAL_PPTX,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit", "--require-native-table-slide", "11"],
    fontPolicy: { basis: "design", families: [FONT] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(stagingDir, `${path.basename(FINAL_PPTX)}.validation.json`),
  });
  console.log(JSON.stringify({ final: FINAL_PPTX, result }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
