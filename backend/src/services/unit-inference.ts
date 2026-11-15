/** Menebak satuan asli dari judul/label tabel bila sumber (BPS/Satu Data) tidak mencantumkannya. */

const RULES: Array<[RegExp, string]> = [
  [/\((?:rp|rupiah)[^)]*\)|\brp\/|harga|upah|gaji|pendapatan per|pengeluaran per|nilai investasi|investasi\b/iu, "Rupiah"],
  [/juta rupiah/iu, "Juta Rupiah"],
  [/persentase|persen\b|%|proporsi|tingkat (?:pengangguran|kemiskinan|partisipasi)|angka partisipasi|angka melek/iu, "%"],
  [/rasio/iu, "Rasio"],
  [/indeks|index/iu, "Indeks"],
  [/\bluas\b|hektar|\bha\b|lahan/iu, "Hektar"],
  [/produksi|\bton\b|panen|hasil (?:padi|perikanan)/iu, "Ton"],
  [/kepadatan/iu, "Jiwa/km²"],
  [/jarak|panjang jalan|panjang/iu, "km"],
  [/ekor|ternak|sapi|kerbau|kambing|ayam|itik|babi/iu, "Ekor"],
  [/jiwa|penduduk|orang|murid|siswa|mahasiswa|guru|tenaga|dokter|bidan|perawat|akseptor|\bpus\b|pasien|korban|meninggal|menderita|balita|ibu hamil|persalinan|bayi lahir|pekerja|pencari kerja|angkatan kerja|pengangguran|lansia|penyandang|pegawai|anggota|kepala keluarga|\bkk\b|wisatawan|pengunjung/iu, "Orang"],
  [/kasus|penyakit|kejadian|kebakaran|bencana|pelanggaran|kriminal|pidana|perdata/iu, "Kasus"],
  [/rumah tangga/iu, "Rumah tangga"],
  [/desa|kelurahan/iu, "Desa"],
  [/sekolah|puskesmas|rumah sakit|posyandu|klinik|apotek|polindes|poskesdes|jembatan|kantor|usaha|perusahaan|industri|restoran|rumah makan|hotel|penginapan|armada|kendaraan|kapal|perahu|bus\b|koperasi|pasar|toko|bank|masjid|gereja|pura|vihara|rumah ibadah|fasilitas|unit\b|bangunan|rumah\b|gudang|bengkel|kolam|keramba/iu, "Unit"],
];

export function inferUnit(...texts: Array<string | null | undefined>): string | null {
  const text = texts.filter(Boolean).join(" ");
  if (!text.trim()) return null;
  // Satuan dalam tanda kurung pada label (mis. "Harga Beras (Rp/Kg)") lebih tepercaya daripada tebakan kata kunci.
  const bracket = text.match(/\(([^()]{1,30})\)/u)?.[1]?.trim();
  if (bracket && /rp|rupiah|kg|ton|ha|persen|%|jiwa|orang|unit|ekor|km|m2|m²|liter|hari|tahun|bulan|kwh|mw/iu.test(bracket) && !/^\d{4}$/u.test(bracket)) return bracket;
  for (const [pattern, unit] of RULES) if (pattern.test(text)) return unit;
  return null;
}

/** Satuan akhir: satuan resmi sumber bila ada dan bermakna, lalu tebakan dari judul, terakhir "Jumlah"/"Nilai". Tidak pernah "Angka". */
export function resolveUnit(sourceUnit: string | null | undefined, ...context: Array<string | null | undefined>): string {
  const clean = sourceUnit?.trim();
  if (clean && !/^(angka|number|nilai)?$/iu.test(clean)) return clean;
  const inferred = inferUnit(...context);
  if (inferred) return inferred;
  return /jumlah|banyaknya|total/iu.test(context.filter(Boolean).join(" ")) ? "Jumlah" : "Nilai";
}
