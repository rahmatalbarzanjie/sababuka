/**
 * Alamat sumber BPS yang tersimpan berupa WebAPI (https://webapi.bps.go.id/v1/api/.../var/104) membutuhkan kunci dan
 * menampilkan galat "Missing required parameter: key" bila dibuka. Untuk tampilan, ubah ke halaman tabel statistik publik
 * BPS Kabupaten Kapuas: /id/statistics-table/2/<base64 "var#2">/<slug>.html (slug bebas).
 */
const KAPUAS_BPS_DOMAIN = "6203";
export function publicSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "webapi.bps.go.id") return url;
    const variable = parsed.pathname.match(/\/var\/(\d+)(?:\/|$)/u)?.[1];
    const domain = parsed.pathname.match(/\/domain\/(\d+)(?:\/|$)/u)?.[1] ?? KAPUAS_BPS_DOMAIN;
    if (!variable) return "https://kapuaskab.bps.go.id/";
    const host = domain === KAPUAS_BPS_DOMAIN ? "kapuaskab.bps.go.id" : "www.bps.go.id";
    return `https://${host}/id/statistics-table/2/${Buffer.from(`${variable}#2`).toString("base64")}/data.html`;
  } catch { return url; }
}
