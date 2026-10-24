export const ZONA_WAKTU_APLIKASI = "Asia/Makassar";

export type ModeFormatTanggal = "tanggal" | "tanggal-waktu" | "waktu";

const formatter: Record<ModeFormatTanggal, Intl.DateTimeFormat> = {
  tanggal: new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA_WAKTU_APLIKASI,
  }),
  "tanggal-waktu": new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ZONA_WAKTU_APLIKASI,
  }),
  waktu: new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ZONA_WAKTU_APLIKASI,
  }),
};

export function formatTanggal(
  value: string | number | Date | null | undefined,
  mode: ModeFormatTanggal = "tanggal",
): string {
  if (value === null || value === undefined || value === "") return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return formatter[mode].format(date);
}
