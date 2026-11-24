/** Pisahkan bagian "Tindak lanjut" dari teks jawaban agar tiap butir dapat disimpan ke catatan. Tanpa bagian itu, null dikembalikan. */
export function splitFollowUp(text: string): { heading: string; before: string; items: string[]; after: string } | null {
  const lines = text.replace(/\r/gu, "").split("\n");
  const isHeading = (line: string) => /^(?:#{1,4}\s+.+|\*\*[^*]+?\*\*:?)$/u.test(line.trim());
  const start = lines.findIndex((line) => isHeading(line) && /^(?:#{1,4}\s+|\*\*)(?:Tindak lanjut|Rekomendasi)\b/iu.test(line.trim()));
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) if (isHeading(lines[index]!)) { end = index; break; }
  const body = lines.slice(start + 1, end);
  const listed = body.map((line) => line.trim().match(/^(?:[-*•]|\d+[.)])\s+(.+)$/u)?.[1]).filter((item): item is string => Boolean(item));
  // Jawaban aturan menulis tindak lanjut sebagai kalimat tanpa butir; tiap baris tidak kosong menjadi satu butir.
  const lineItems = body.map((line) => line.trim()).filter(Boolean);
  const items = (listed.length ? listed : lineItems).slice(0, 8);
  if (!items.length) return null;
  return { heading: lines[start]!.trim().replace(/^#{1,4}\s+|\*\*|:$/gu, "").trim(), before: lines.slice(0, start).join("\n"), items, after: lines.slice(end).join("\n") };
}
