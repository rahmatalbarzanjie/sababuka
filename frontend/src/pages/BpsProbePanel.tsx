import { useState } from "react";
import { api } from "../api";
import { Badge, Notice } from "../components";

interface ProbeRow {
  model: string;
  domain: string;
  http_status: number | null;
  ok: boolean;
  available: string | null;
  total: number;
  sample: string[];
  message: string | null;
  response_ms: number;
}

const domainLabel = (code: string) => code === "6200" ? "Kalimantan Tengah (6200)" : code === "6203" ? "Kapuas (6203)" : code;

/** Uji hanya-baca model WebAPI BPS memakai kunci tersimpan; kunci tidak pernah dikirim ke peramban. */
export function BpsProbePanel() {
  const [rows, setRows] = useState<ProbeRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try { setRows((await api<{ data: ProbeRow[] }>("/connectors/bps/probe", { method: "POST", mutation: true })).data); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Uji model BPS gagal."); }
    finally { setBusy(false); }
  }

  return <section className="panel">
    <header className="panel-heading"><div><h2>Uji model API BPS</h2><p>Memeriksa model WebAPI BPS mana yang mengembalikan data untuk Kapuas dan Kalimantan Tengah. Hanya membaca, memakan waktu sekitar 15 detik.</p></div>
      <button className="button secondary" onClick={() => void run()} disabled={busy}>{busy ? "Menguji..." : rows ? "Uji ulang" : "Jalankan uji"}</button></header>
    {error && <Notice tone="error">{error}</Notice>}
    {rows && <div className="table-scroll"><table><thead><tr><th>Model</th><th>Wilayah</th><th>Hasil</th><th>Jumlah</th><th>Contoh isi</th></tr></thead><tbody>
      {rows.map((row, index) => <tr key={`${row.model}-${row.domain}-${index}`}>
        <td><strong>{row.model}</strong></td>
        <td>{domainLabel(row.domain)}</td>
        <td>{row.ok && row.total > 0 ? <Badge tone="success">Ada data</Badge> : row.ok ? <Badge tone="warning">Kosong</Badge> : <Badge tone="danger">{row.http_status ? `Gagal ${row.http_status}` : "Gagal"}</Badge>}{row.message && !row.ok && <small> {row.message}</small>}</td>
        <td>{row.total.toLocaleString("id-ID")}</td>
        <td>{row.sample.length ? row.sample.join("; ") : "-"}</td>
      </tr>)}
    </tbody></table></div>}
  </section>;
}
