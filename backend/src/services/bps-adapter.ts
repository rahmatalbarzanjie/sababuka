// Adaptor format WebAPI BPS (model "data"). Fungsi murni tanpa akses jaringan/DB agar mudah diuji.
// Respons data memuat daftar dimensi (vervar, turvar, tahun, turtahun) dan `datacontent` berisi
// kunci gabungan `${vervar}${var}${turvar}${tahun}${turtahun}` -> nilai.

type JsonObject = Record<string, unknown>;

export interface BpsOption { val: string; label: string }

export interface BpsDataRow extends JsonObject {
  tahun: number;
  wilayah: string;
  nilai: number | string | null;
  satuan: string | null;
  vervar: string;
  vervar_label: string;
  turvar: string;
  turvar_label: string;
  turtahun: string;
  turtahun_label: string;
}

export interface BpsDataFilter { vervar?: string | null; turvar?: string | null; turtahun?: string | null }

export interface BpsParsedData {
  variable: { id: string; title: string; unit: string | null; subject: string | null; note: string | null };
  vervar_label: string | null;
  vervars: BpsOption[];
  turvars: BpsOption[];
  turtahuns: BpsOption[];
  years: number[];
  rows: BpsDataRow[];
}

/** BPS membatasi `th` maksimum 3 tahun per permintaan. */
export const BPS_MAX_YEARS_PER_REQUEST = 3;

export function bpsYearCode(year: number): number { return year - 1900; }

export function bpsYearWindows(fromYear: number, toYear: number): string[] {
  const windows: string[] = [];
  for (let start = fromYear; start <= toYear; start += BPS_MAX_YEARS_PER_REQUEST) {
    const end = Math.min(start + BPS_MAX_YEARS_PER_REQUEST - 1, toYear);
    windows.push(start === end ? String(bpsYearCode(start)) : `${bpsYearCode(start)}:${bpsYearCode(end)}`);
  }
  return windows;
}

export function buildBpsDataUrl(baseUrl: string, domain: string, variableId: string, window: string, apiKey: string): string {
  if (!/^[0-9]+(?::[0-9]+)?$/u.test(window)) throw new Error("BPS_INVALID_YEAR_WINDOW");
  const root = baseUrl.replace(/\/$/u, "");
  return `${root}/list/model/data/domain/${encodeURIComponent(domain)}/var/${encodeURIComponent(variableId)}/th/${window}/key/${encodeURIComponent(apiKey)}`;
}

export function buildBpsVariableSearchUrl(baseUrl: string, domain: string, keyword: string, page: number, apiKey: string): string {
  const root = baseUrl.replace(/\/$/u, "");
  const keywordPart = keyword.trim() ? `/keyword/${encodeURIComponent(keyword.trim())}` : "";
  return `${root}/list/model/var/domain/${encodeURIComponent(domain)}/page/${page}${keywordPart}/key/${encodeURIComponent(apiKey)}`;
}

/** Kunci API tidak boleh muncul di URL yang disimpan atau dicatat. */
export function redactBpsUrl(url: string): string { return url.replace(/\/key\/[^/?#]+/u, "/key/***"); }

function text(value: unknown): string { return value === null || value === undefined ? "" : String(value).trim(); }

function options(value: unknown): BpsOption[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object")
      .map((item) => ({ val: text(item.val), label: text(item.label) }))
      .filter((item) => item.val !== "")
    : [];
}

export interface BpsVariableSummary { id: string; title: string; subject: string | null; unit: string | null; description: string }

export function summarizeBpsVariables(payload: JsonObject): { total: number; pages: number; page: number; results: BpsVariableSummary[] } {
  if (text(payload.status).toUpperCase() === "ERROR") throw new Error("BPS_RESPONSE_ERROR");
  const data = Array.isArray(payload.data) ? payload.data : [];
  const meta = (data[0] && typeof data[0] === "object" && !Array.isArray(data[0]) ? data[0] : {}) as JsonObject;
  const list = Array.isArray(data[1]) ? data[1] as JsonObject[] : [];
  return {
    total: Number(meta.total) || list.length,
    pages: Number(meta.pages) || 1,
    page: Number(meta.page) || 1,
    results: list.filter((item) => item && typeof item === "object").map((item) => ({
      id: text(item.var_id),
      title: text(item.title),
      subject: text(item.sub_name) || null,
      unit: text(item.unit) || null,
      description: text(item.def) || text(item.notes),
    })).filter((item) => item.id !== ""),
  };
}

export function parseBpsDataContent(payload: JsonObject, filter: BpsDataFilter = {}, wilayah = "6203"): BpsParsedData {
  if (text(payload.status).toUpperCase() === "ERROR") throw new Error("BPS_RESPONSE_ERROR");
  const variable = (Array.isArray(payload.var) ? payload.var[0] : null) as JsonObject | null;
  const subject = (Array.isArray(payload.subject) ? payload.subject[0] : null) as JsonObject | null;
  const vervars = options(payload.vervar);
  const turvars = options(payload.turvar);
  const turtahuns = options(payload.turtahun);
  const tahuns = options(payload.tahun);
  const content = payload.datacontent && typeof payload.datacontent === "object" && !Array.isArray(payload.datacontent)
    ? payload.datacontent as JsonObject
    : {};
  const variableId = text(variable?.val);
  const unit = text(variable?.unit) || null;
  const rows: BpsDataRow[] = [];

  // BPS mengosongkan vervar bila variabel tidak punya baris vertikal; kunci tetap memakai "0".
  const vervarList = vervars.length ? vervars : [{ val: "0", label: "" }];
  for (const vervar of vervarList) {
    if (filter.vervar && filter.vervar !== vervar.val) continue;
    for (const turvar of turvars.length ? turvars : [{ val: "0", label: "" }]) {
      if (filter.turvar && filter.turvar !== turvar.val) continue;
      for (const tahun of tahuns) {
        for (const turtahun of turtahuns.length ? turtahuns : [{ val: "0", label: "" }]) {
          if (filter.turtahun && filter.turtahun !== turtahun.val) continue;
          const key = `${vervar.val}${variableId}${turvar.val}${tahun.val}${turtahun.val}`;
          if (!(key in content)) continue;
          const year = Number.parseInt(tahun.label, 10);
          if (!Number.isInteger(year)) continue;
          const raw = content[key];
          rows.push({
            tahun: year,
            wilayah,
            nilai: typeof raw === "number" || typeof raw === "string" ? raw : null,
            satuan: unit,
            vervar: vervar.val,
            vervar_label: vervar.label,
            turvar: turvar.val,
            turvar_label: turvar.label,
            turtahun: turtahun.val,
            turtahun_label: turtahun.label,
          });
        }
      }
    }
  }

  return {
    variable: { id: variableId, title: text(variable?.label), unit, subject: text(subject?.label) || text(variable?.subj) || null, note: text(variable?.note) || text(variable?.def) || null },
    vervar_label: text(payload.labelvervar) || null,
    vervars,
    turvars,
    turtahuns,
    years: [...new Set(rows.map((row) => row.tahun))].sort((a, b) => a - b),
    rows,
  };
}

/** Dua baris pada tahun yang sama berarti pilihan kategori (vervar/turvar) belum cukup spesifik. */
export function findAmbiguousYears(rows: BpsDataRow[]): number[] {
  const seen = new Map<number, number>();
  for (const row of rows) seen.set(row.tahun, (seen.get(row.tahun) ?? 0) + 1);
  return [...seen].filter(([, count]) => count > 1).map(([year]) => year).sort((a, b) => a - b);
}

/** Tabel BPS tingkat provinsi memakai kab/kota sebagai vervar; pilih baris Kabupaten Kapuas (bukan Kapuas Hulu dsb.). */
export function findKapuasOption(list: BpsOption[]): BpsOption | null {
  return list.find((item) => /^(kab\.?|kabupaten)?\s*kapuas$/iu.test(item.label.trim())) ?? null;
}
