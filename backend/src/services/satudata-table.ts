import ExcelJS from "exceljs";

/** Satu titik data tabel per kecamatan: satu metrik (kolom) pada satu tahun untuk satu wilayah. */
export interface SatuDataPoint { district: string | null; year: number; value: number }
export interface SatuDataMetric { label: string; points: SatuDataPoint[] }
export interface SatuDataTable { metrics: SatuDataMetric[]; skipped?: string }

const DISTRICTS = ["basarang", "bataguh", "dadahup", "kapuas barat", "kapuas hilir", "kapuas hulu", "kapuas kuala", "kapuas murung", "kapuas tengah", "kapuas timur", "mandau talawang", "mantangai", "pasak talawang", "pulau petak", "selat", "tamban catur", "timpah"];
const norm = (value: unknown) => String(value ?? "").toLowerCase().replace(/kecamatan/gu, "").replace(/[^a-z0-9]+/gu, " ").trim();
const REGENCY = new Set(["kabupaten kapuas", "jumlah", "total", "kapuas"]);

function cellValue(value: unknown): unknown {
  if (value && typeof value === "object") {
    const record = value as { result?: unknown; richText?: Array<{ text: string }>; text?: unknown };
    if (record.result !== undefined) return record.result;
    if (record.richText) return record.richText.map((part) => part.text).join("");
    if (record.text !== undefined) return record.text;
    return null;
  }
  return value;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || /^[-–—.]+$/u.test(text)) return null;
  const cleaned = text.replace(/\s/gu, "").replace(/^rp\.?/iu, "");
  // Format Indonesia: titik pemisah ribuan, koma desimal.
  const normalized = /^\d{1,3}(\.\d{3})+(,\d+)?$/u.test(cleaned) ? cleaned.replace(/\./gu, "").replace(",", ".") : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function yearIn(text: unknown): number | null {
  const found = String(text ?? "").match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/u);
  return found ? Number(found[1]) : null;
}

/** Baca tabel Excel bergaya "Kapuas dalam Angka": baris = kecamatan, kolom = metrik (opsional bertingkat) dan tahun. */
export async function parseKecamatanTable(buffer: Buffer, title: string): Promise<SatuDataTable> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { metrics: [], skipped: "Berkas tidak berisi lembar." };
  const grid: unknown[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, index) => { grid[index - 1] = (row.values as unknown[]).slice(1).map(cellValue); });
  const width = Math.max(0, ...grid.map((row) => row?.length ?? 0));

  // Kolom kecamatan: kolom pertama yang berisi minimal 5 nama kecamatan.
  let districtColumn = -1; let firstDataRow = -1; let lastDataRow = -1;
  for (let column = 0; column < Math.min(width, 4) && districtColumn < 0; column += 1) {
    const hits = grid.map((row, index) => ({ index, key: norm(row?.[column]) })).filter((item) => DISTRICTS.includes(item.key));
    if (hits.length >= 5) { districtColumn = column; firstDataRow = hits[0]!.index; lastDataRow = hits[hits.length - 1]!.index; }
  }
  if (districtColumn < 0) return { metrics: [], skipped: "Tidak ada kolom kecamatan." };
  // Baris tambahan di bawah kecamatan (mis. "Kabupaten Kapuas"/"Jumlah").
  for (let index = lastDataRow + 1; index < Math.min(grid.length, lastDataRow + 4); index += 1) if (REGENCY.has(norm(grid[index]?.[districtColumn]))) lastDataRow = index;

  // Baris judul kolom: sampai dua baris sebelum data (abaikan baris judul tabel yang hanya satu sel).
  const headerRows: unknown[][] = [];
  for (let index = Math.max(0, firstDataRow - 3); index < firstDataRow; index += 1) {
    const row = grid[index] ?? [];
    if (row.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "").length >= 2) headerRows.push(row);
  }
  const titleYear = yearIn(title);
  const metrics = new Map<string, SatuDataMetric>();
  const filled = headerRows.map((row) => { let last: unknown = null; return Array.from({ length: width }, (_, column) => { const cell = row[column]; if (cell !== null && cell !== undefined && String(cell).trim() !== "") last = cell; return last; }); });
  for (let column = districtColumn + 1; column < width; column += 1) {
    const parts = filled.map((row) => row[column]).filter((cell) => cell !== null && cell !== undefined).map((cell) => String(cell).replace(/\s+/gu, " ").trim());
    const yearPart = parts.map((part) => yearIn(part)).find((year) => year !== null) ?? titleYear;
    const label = [...new Set(parts.filter((part) => yearIn(part) === null || part.replace(/(?:19|20)\d{2}/gu, "").replace(/[^A-Za-z]/gu, "").length > 3))]
      .map((part) => part.replace(/(?:19|20)\d{2}/gu, "").replace(/\s+/gu, " ").trim()).filter(Boolean).join(" — ") || "Jumlah";
    if (!yearPart) continue;
    const points: SatuDataPoint[] = [];
    for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex += 1) {
      const row = grid[rowIndex]; if (!row) continue;
      const key = norm(row[districtColumn]);
      const district = DISTRICTS.includes(key) ? key : REGENCY.has(key) ? null : undefined;
      if (district === undefined) continue;
      const value = parseNumber(row[column]);
      if (value === null) continue;
      points.push({ district, year: yearPart, value });
    }
    if (!points.length) continue;
    const key = label;
    const entry = metrics.get(key) ?? { label, points: [] };
    // Tahun berbeda pada metrik yang sama digabung; duplikat (wilayah, tahun) tidak ditimpa.
    for (const point of points) if (!entry.points.some((existing) => existing.district === point.district && existing.year === point.year)) entry.points.push(point);
    metrics.set(key, entry);
  }
  return { metrics: [...metrics.values()].filter((metric) => metric.points.length > 0).slice(0, 60) };
}
