// Kolom numeric(30,10) dikirim backend sebagai teks dengan nol di belakang ("1234.0000000000").
// Angka yang ditampilkan atau diisi ulang harus sama dengan yang dimasukkan pengguna.
const MAX_DECIMALS = 10;

/** "1234.5000000000" -> "1234.5"; "1234.0000000000" -> "1234". Teks non-angka dikembalikan apa adanya. */
export function trimNumericText(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const text = String(raw).trim();
  if (!/^-?\d+(\.\d+)?$/u.test(text)) return text;
  return text.includes(".") ? text.replace(/\.?0+$/u, "") : text;
}

/** Format id-ID dengan desimal sesuai nilai tersimpan (tanpa nol sisa, tanpa pembulatan ke 4 digit). */
export function formatStoredNumber(value: string | number): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: MAX_DECIMALS }).format(numeric);
}
