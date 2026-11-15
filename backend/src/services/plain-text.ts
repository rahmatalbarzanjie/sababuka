/** Teks keluaran sistem: tanda pisah panjang/sedang (em dash, en dash) selalu diganti tanda hubung biasa. */
export const plainDash = (value: string): string => value.replace(/\s+[\u2013\u2014]\s+/gu, " - ").replace(/[\u2013\u2014]/gu, "-");
