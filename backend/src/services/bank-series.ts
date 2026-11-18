/** Penyusun seri Bank Data dari baris variabel BPS. Fungsi murni agar mudah diuji. */
export interface BpsRowLike { tahun: number; nilai: number | string | null; vervar: string; vervar_label: string; turvar: string; turvar_label: string; turtahun: string }
export interface SeriesPoint { geography_id: string; year: number; value: number }
export type SeriesMap = Map<string, { label: string; points: Map<string, SeriesPoint> }>;

/**
 * Variabel yang dimensi utamanya bukan wilayah (mis. PDRB menurut lapangan usaha, penduduk menurut kelompok umur) tidak memiliki
 * baris kecamatan atau kabupaten. Variabel seperti itu diimpor per kategori sebagai seri tingkat kabupaten.
 */
export function isCategoricalVariable(rows: BpsRowLike[], vervarCount: number, hasDistrict: (label: string) => boolean, isRegency: (label: string) => boolean): boolean {
  return vervarCount >= 2 && !rows.some((row) => hasDistrict(row.vervar_label) || isRegency(row.vervar_label));
}

export function buildSeries(input: {
  rows: BpsRowLike[]; preferredTurtahun: string | null; categorical: boolean; turvarCount: number;
  geoOf(label: string): string | null; regencyId: string | null; yearMin: number; yearMax: number;
}): SeriesMap {
  const series: SeriesMap = new Map();
  for (const row of input.rows) {
    if (input.preferredTurtahun && row.turtahun !== input.preferredTurtahun) continue;
    const geographyId = input.categorical ? input.regencyId : input.geoOf(row.vervar_label);
    if (!geographyId || row.nilai === null) continue;
    const value = typeof row.nilai === "number" ? row.nilai : Number(String(row.nilai).replace(/\s/gu, "").replace(/\./gu, "").replace(",", "."));
    if (!Number.isFinite(value) || row.tahun < input.yearMin || row.tahun > input.yearMax) continue;
    const key = input.categorical ? `${row.vervar}|${row.turvar}` : row.turvar;
    const label = input.categorical ? [row.vervar_label, input.turvarCount > 1 ? row.turvar_label : ""].filter(Boolean).join(" - ") : row.turvar_label;
    const entry = series.get(key) ?? { label, points: new Map() };
    entry.points.set(`${geographyId}:${row.tahun}`, { geography_id: geographyId, year: row.tahun, value });
    series.set(key, entry);
  }
  return series;
}
