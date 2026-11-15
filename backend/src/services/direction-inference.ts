import type { Direction } from "./trend-engine.js";

/** Arah "lebih baik" diperkirakan dari nama indikator bila sumber tidak mencantumkannya. Sengaja konservatif: ragu = tidak dinilai. */
const DECREASE = /miskin|kemiskinan|pengangguran|kematian|stunting|gizi buruk|gizi kurang|kasus|korban|kriminal|kejahatan|pencemaran|kecelakaan|putus sekolah|buta huruf|ketimpangan|kesenjangan|\bgini\b|inflasi|bencana|kebakaran|penderita|kesakitan|bblr|rumah tidak layak|kumuh|beban tanggungan|angka beban|konflik|pelanggaran|limbah|sampah tidak/iu;
const INCREASE = /produksi|harapan hidup|melek huruf|partisipasi|pertumbuhan|investasi|indeks pembangunan|\bipm\b|lama sekolah|harapan lama|rata-rata lama|akses|cakupan|imunisasi|kelulusan|tenaga kesehatan|fasilitas kesehatan|pendapatan asli|pad\b|panen|produktivitas|ketahanan pangan|kunjungan wisatawan|jumlah wisatawan|pelayanan|terlayani|listrik|air minum layak|sanitasi layak/iu;

export function inferDirection(name: string): Direction {
  const decrease = DECREASE.test(name);
  const increase = INCREASE.test(name);
  if (decrease === increase) return null;
  return decrease ? "decrease" : "increase";
}
