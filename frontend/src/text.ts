/** Teks tampilan: tanda pisah panjang/sedang (em dash, en dash) selalu diganti tanda hubung biasa. */
export const plain = (value: string | null | undefined): string => (value ?? "").replace(/\s+[\u2013\u2014]\s+/gu, " - ").replace(/[\u2013\u2014]/gu, "-");
