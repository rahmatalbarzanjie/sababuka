import type { ReactNode } from "react";

/** Penyaji teks jawaban asisten: hanya **tebal**, butir "- ", daftar "1.", dan judul bagian. Tidak pernah memakai HTML mentah. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/u).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={index}>{part.slice(2, -2)}</strong> : part);
}

type Block = { kind: "heading"; text: string } | { kind: "paragraph"; lines: string[] } | { kind: "ul"; items: string[] } | { kind: "ol"; items: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.replace(/\r/gu, "").split("\n")) {
    const line = raw.trim();
    if (!line) { blocks.push({ kind: "paragraph", lines: [] }); continue; }
    const heading = line.match(/^(?:#{1,4}\s+(.+)|\*\*([^*]+?)\*\*:?)$/u);
    if (heading) { blocks.push({ kind: "heading", text: (heading[1] ?? heading[2] ?? "").replace(/:$/u, "") }); continue; }
    const bullet = line.match(/^[-*•]\s+(.+)$/u);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/u);
    const last = blocks[blocks.length - 1];
    if (bullet) { if (last?.kind === "ul") last.items.push(bullet[1]!); else blocks.push({ kind: "ul", items: [bullet[1]!] }); continue; }
    if (numbered) { if (last?.kind === "ol") last.items.push(numbered[1]!); else blocks.push({ kind: "ol", items: [numbered[1]!] }); continue; }
    if (last?.kind === "paragraph" && last.lines.length) last.lines.push(line); else blocks.push({ kind: "paragraph", lines: [line] });
  }
  return blocks.filter((block) => block.kind !== "paragraph" || block.lines.length);
}

export function RichText({ text }: { text: string }) {
  return <div className="rich-text">{parse(text).map((block, index) => {
    if (block.kind === "heading") return <h4 key={index}>{block.text}</h4>;
    if (block.kind === "ul") return <ul key={index}>{block.items.map((item, position) => <li key={position}>{inline(item)}</li>)}</ul>;
    if (block.kind === "ol") return <ol key={index}>{block.items.map((item, position) => <li key={position}>{inline(item)}</li>)}</ol>;
    return <p key={index}>{block.lines.map((line, position) => <span key={position}>{position > 0 && <br />}{inline(line)}</span>)}</p>;
  })}</div>;
}
