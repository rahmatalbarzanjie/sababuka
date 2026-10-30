import { ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { Notice, Spinner } from "../components";

interface ReferenceDataset {
  id: string;
  title: string;
  description: string;
  organization: string | null;
  formats: string[];
  resource_count: number;
  page_url: string | null;
}

interface ReferenceResponse {
  source: { code: string; name: string };
  count: number;
  results: ReferenceDataset[];
}

/**
 * Rujukan hanya-baca saat OPD mengusulkan indikator. Hanya metadata dataset yang tampil;
 * tidak ada nilai data yang ikut terisi. OPD tetap menulis sumber data secara manual.
 */
export function ReferenceDataPanel({ onUse }: { onUse(reference: string): void }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<ReferenceResponse | null>(null);
  const [used, setUsed] = useState<string | null>(null);

  const search = async (event: { preventDefault(): void; stopPropagation(): void }) => {
    event.preventDefault();
    event.stopPropagation();
    const term = query.trim();
    if (term.length < 2) return;
    setBusy(true);
    setError("");
    try {
      setResponse(await api<ReferenceResponse>(`/reference/datasets?q=${encodeURIComponent(term)}`));
    } catch (caught) {
      setResponse(null);
      setError(caught instanceof Error ? caught.message : "Rujukan data belum dapat dimuat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="reference-panel">
      <summary>Cari rujukan data (opsional)</summary>
      <div className="reference-body">
        <p className="reference-hint">
          Telusuri katalog Satu Data Kapuas untuk melihat apakah data serupa sudah tercatat. Hasil hanya rujukan; isi kolom
          sumber data secara manual atau pakai tombol di bawah.
        </p>
        <div className="reference-search" role="search">
          <input
            type="search"
            aria-label="Kata kunci rujukan data"
            placeholder="Contoh: stunting, produksi padi"
            value={query}
            minLength={2}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void search(event); }}
          />
          <button type="button" className="button secondary" disabled={busy || query.trim().length < 2} onClick={(event) => void search(event)}>
            <Search />{busy ? "Mencari…" : "Cari"}
          </button>
        </div>
        {busy && <Spinner />}
        {error && <Notice tone="error">{error}</Notice>}
        {response && !busy && (
          response.results.length === 0
            ? <p className="reference-empty">Tidak ada dataset yang cocok. Coba kata kunci lain; usulan tetap dapat diisi manual.</p>
            : <ul className="reference-results" aria-live="polite">
              {response.results.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <small>{[item.organization, item.formats.length ? item.formats.join(", ") : null, `${item.resource_count} resource`].filter(Boolean).join(" · ")}</small>
                  {item.description && <p>{item.description}</p>}
                  <span className="reference-actions">
                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={() => { onUse(`${response.source.name}: ${item.title}`); setUsed(item.id); }}
                    >
                      {used === item.id ? "Dipakai sebagai sumber data" : "Pakai sebagai sumber data"}
                    </button>
                    {item.page_url && <a href={item.page_url} target="_blank" rel="noopener noreferrer">Buka di Satu Data<ExternalLink aria-hidden="true" /></a>}
                  </span>
                </li>
              ))}
            </ul>
        )}
      </div>
    </details>
  );
}
