/**
 * Percakapan Tanya Sababuka yang bertahan saat pengguna berpindah menu atau memuat ulang halaman.
 * Disimpan di memori (berpindah menu di aplikasi) dan di sessionStorage tab ini (muat ulang); dihapus saat keluar atau masuk.
 */
const KEY = "sababuka.chat.v1";
const MAX_MESSAGES = 60;

export interface StoredChat<S, M> { session: S | null; messages: M[] }

let memory: StoredChat<unknown, unknown> | null = null;

export function loadChat<S, M>(): StoredChat<S, M> {
  if (memory) return memory as StoredChat<S, M>;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredChat<S, M>;
      if (parsed && Array.isArray(parsed.messages)) { memory = parsed as StoredChat<unknown, unknown>; return parsed; }
    }
  } catch { /* penyimpanan tidak tersedia: percakapan hanya bertahan di memori */ }
  return { session: null, messages: [] };
}

export function saveChat<S, M>(state: StoredChat<S, M>): void {
  const trimmed = { session: state.session, messages: state.messages.slice(-MAX_MESSAGES) };
  memory = trimmed as StoredChat<unknown, unknown>;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(trimmed)); } catch { /* kuota penuh atau diblokir */ }
}

export function clearChat(): void {
  memory = null;
  try { window.sessionStorage.removeItem(KEY); } catch { /* abaikan */ }
}
