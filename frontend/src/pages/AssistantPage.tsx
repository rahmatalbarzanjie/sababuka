import { Archive, Check, History, Info, Menu, MessageSquare, MoreVertical, Pencil, RotateCcw, Send, ShieldCheck, SquarePen, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { SababukaAssistantMark, type SababukaAssistantState } from "../branding/SababukaBrand";
import { DistrictBars, TrendChart } from "../components/InsightVisuals";
import { Notice, Spinner, formatDate } from "../components";
import { ChatWelcome } from "../components/ChatWelcome";
import { RichText } from "../components/RichText";
import { num } from "../insight";
import { plain } from "../text";

interface Session { id: string; title: string | null; status: "active" | "archived"; started_at: string; updated_at?: string; message_count?: number }
interface Citation { publication_item_id: string; label: string; indicator: string; period: string; organization: string; source: string; indicator_id?: string; source_url?: string | null }
interface Visual { kind: "trend" | "districts"; title: string; unit: string; indicator_id?: string; points?: Array<{ year: number; value: number }>; items?: Array<{ name: string; value: number }> }
interface Answer { message_id: string; answer: string; citations: Citation[]; sufficiency: "sufficient" | "partial" | "insufficient"; visuals?: Visual[]; suggestions?: string[] }
interface ChatMessage { id: string; role: "user" | "assistant"; content: string; created_at?: string; answer?: Answer }
interface SessionDetail extends Session { messages: ChatMessage[] }

const THINKING = ["Memeriksa angka dan tren indikator...", "Membandingkan dengan target dan OPD terkait...", "Menyusun jawaban dan sumber data..."];
const DRAFT_KEY = "sababuka.assistant.draft";
const NOTICE_KEY = "sababuka.assistant.notice-dismissed";

export function AssistantPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState(() => window.sessionStorage.getItem(DRAFT_KEY) ?? "");
  const [busy, setBusy] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [failedRequest, setFailedRequest] = useState<{ question: string; clientId: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [noticeHidden, setNoticeHidden] = useState(() => { try { return window.sessionStorage.getItem(NOTICE_KEY) === "1"; } catch { return false; } });
  const stream = useRef<HTMLDivElement>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const composer = useRef<HTMLTextAreaElement>(null);

  const loadSessions = async (archived = showArchived) => {
    setLoadingSessions(true);
    try {
      const result = await api<{ data: Session[] }>(`/assistant/sessions?archived=${archived}`);
      setSessions(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Riwayat chat belum dapat dimuat."); }
    finally { setLoadingSessions(false); }
  };

  useEffect(() => { void loadSessions(); }, []);
  useEffect(() => {
    // Menu percakapan menutup saat mengetuk di luar atau menekan Escape.
    if (!menuFor) return;
    const close = (event: Event) => { if (!(event.target as HTMLElement).closest(".assistant-session-row")) setMenuFor(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuFor(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [menuFor]);
  const hideNotice = () => { setNoticeHidden(true); try { window.sessionStorage.setItem(NOTICE_KEY, "1"); } catch { /* tetap tertutup selama halaman terbuka */ } };
  useEffect(() => {
    try {
      if (message) window.sessionStorage.setItem(DRAFT_KEY, message);
      else window.sessionStorage.removeItem(DRAFT_KEY);
    } catch { /* Draf tetap tersedia selama komponen terbuka. */ }
  }, [message]);
  useEffect(() => {
    const chatStream = stream.current;
    // Sambutan selalu dibuka dari atas; hanya percakapan yang digulir ke pesan terbaru.
    if (chatStream) chatStream.scrollTo({ top: messages.length ? chatStream.scrollHeight : 0, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    // Tinggi komposer mengikuti isi (satu baris dulu, maksimal sekitar lima baris) agar tombol Kirim selalu sejajar.
    const field = composer.current;
    if (!field) return;
    field.style.height = "auto";
    if (message) field.style.height = Math.min(field.scrollHeight, 132) + "px";
  }, [message]);
  useEffect(() => {
    // Teks proses bergeser tiap beberapa detik agar jawaban yang lama terasa berjalan.
    if (!busy) { setThinkingStep(0); return; }
    const timer = window.setInterval(() => setThinkingStep((step) => Math.min(step + 1, THINKING.length - 1)), 2600);
    return () => window.clearInterval(timer);
  }, [busy]);
  const openSession = async (item: Session) => {
    setLoadingChat(true); setError(""); setFailedRequest(null);
    try {
      const detail = await api<SessionDetail>(`/assistant/sessions/${item.id}`);
      setSession(detail); setMessages(detail.messages); setHistoryOpen(false); setRenamingId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chat belum dapat dibuka."); }
    finally { setLoadingChat(false); }
  };
  const newChat = () => { setSession(null); setMessages([]); setError(""); setFailedRequest(null); setRenamingId(null); setMenuFor(null); setHistoryOpen(false); };
  const toggleArchived = async () => { const next = !showArchived; setShowArchived(next); setSession(null); setMessages([]); await loadSessions(next); };
  const updateSession = async (id: string, input: { title?: string; status?: "active" | "archived" }) => {
    try {
      const updated = await api<Session>(`/assistant/sessions/${id}`, { method: "PATCH", mutation: true, body: jsonBody(input) });
      setRenamingId(null); setMenuFor(null);
      if (session?.id === id) {
        if (input.status) { setMessages([]); setSession(null); } else setSession((current) => current ? { ...current, title: updated.title } : current);
      }
      await loadSessions(showArchived);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan riwayat belum dapat disimpan."); }
  };

  const ask = async (question: string, clientId: string = crypto.randomUUID(), optimistic = true) => {
    setBusy(true); setError(""); setFailedRequest(null); setMessage("");
    if (optimistic) setMessages((current) => [...current, { id: clientId, role: "user", content: question }]);
    try {
      let active = session;
      if (!active) {
        active = await api<Session>("/assistant/sessions", { method: "POST", mutation: true, body: jsonBody({}) });
        setSession(active);
      }
      const answer = await api<Answer>(`/assistant/sessions/${active.id}/messages`, { method: "POST", mutation: true, body: jsonBody({ message: question, client_message_id: clientId }) });
      setMessages((current) => [...current, { id: answer.message_id, role: "assistant", content: answer.answer, answer }]);
      await loadSessions(false);
      const refreshed = await api<SessionDetail>(`/assistant/sessions/${active.id}`);
      setSession(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tanya Sababuka belum dapat menjawab.");
      setFailedRequest({ question, clientId });
    } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); const question = message.trim(); if (question && !busy) void ask(question); };
  const last = messages[messages.length - 1]?.answer;

  return <div className="assistant-chat-layout">
    <button type="button" className={`assistant-history-overlay${historyOpen ? " open" : ""}`} aria-label="Tutup riwayat chat" onClick={() => setHistoryOpen(false)} />
    <aside className={`assistant-history${historyOpen ? " open" : ""}`} aria-label="Riwayat Tanya Sababuka">
      <header><div><History /><strong>Riwayat chat</strong></div><button type="button" className="icon-button assistant-history-close" aria-label="Tutup riwayat" onClick={() => setHistoryOpen(false)}><X /></button></header>
      <button type="button" className="assistant-new-chat" onClick={newChat}><SquarePen />Percakapan baru</button>
      <div className="assistant-session-list">
        <p className="assistant-session-label">{showArchived ? "Arsip" : "Riwayat"}</p>
        {loadingSessions ? <Spinner /> : sessions.length === 0 ? <p className="assistant-session-empty">{showArchived ? "Belum ada chat yang diarsipkan." : "Belum ada riwayat. Mulai percakapan baru untuk bertanya."}</p> : sessions.map((item) => {
          const title = plain(item.title || "Percakapan baru");
          return <div key={item.id} className={`assistant-session-row${session?.id === item.id ? " active" : ""}${menuFor === item.id ? " menu-open" : ""}`}>
            {renamingId === item.id
              ? <form onSubmit={(event) => { event.preventDefault(); if (titleDraft.trim()) void updateSession(item.id, { title: titleDraft.trim() }); }}><input aria-label="Judul chat" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} autoFocus maxLength={255} /><button type="submit" className="icon-button" aria-label="Simpan judul"><Check /></button><button type="button" className="icon-button" aria-label="Batal mengganti judul" onClick={() => setRenamingId(null)}><X /></button></form>
              : <>
                <button type="button" className="assistant-session-open" title={title} onClick={() => void openSession(item)}><MessageSquare /><span>{title}</span></button>
                <button type="button" className="assistant-session-more" aria-label="Opsi percakapan" aria-haspopup="menu" aria-expanded={menuFor === item.id} onClick={() => setMenuFor(menuFor === item.id ? null : item.id)}><MoreVertical /></button>
                {menuFor === item.id && <div className="assistant-session-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setTitleDraft(item.title ?? ""); setRenamingId(item.id); setMenuFor(null); }}><Pencil />Ganti nama</button>
                  <button type="button" role="menuitem" onClick={() => void updateSession(item.id, { status: item.status === "archived" ? "active" : "archived" })}>{item.status === "archived" ? <RotateCcw /> : <Archive />}{item.status === "archived" ? "Pulihkan chat" : "Arsipkan chat"}</button>
                </div>}
              </>}
          </div>;
        })}
      </div>
      <footer>
        <button type="button" className="assistant-archive-filter" onClick={() => void toggleArchived()}>{showArchived ? <RotateCcw /> : <Archive />}{showArchived ? "Kembali ke chat aktif" : "Lihat arsip"}</button>
        <small>&copy; 2026 SABABUKA BERSINAR</small>
      </footer>
    </aside>

    <section className="assistant-conversation" aria-label="Percakapan Tanya Sababuka">
      <header className="assistant-conversation-header">
        <button type="button" className="icon-button assistant-history-trigger" aria-label="Buka riwayat chat" aria-expanded={historyOpen} onClick={() => setHistoryOpen(true)}><Menu /></button>
        <div className="assistant-conversation-title"><div><strong>{plain(session?.title || "Percakapan baru")}</strong><small><ShieldCheck /> Jawaban dari data resmi yang sudah dipublikasikan</small></div></div>
      </header>
      {!noticeHidden && <div className="assistant-notice" role="note"><Info aria-hidden="true" /><p>Sababuka membantu menelusuri data resmi Kabupaten Kapuas yang sudah terbit. Jawaban dibatasi pada data terbit dan tidak memuat opini atau prediksi di luar data. Jawaban AI dapat keliru, periksa sumber bila tersedia.</p><button type="button" className="icon-button" aria-label="Tutup catatan" onClick={hideNotice}><X /></button></div>}

      <div className="chat-stream" ref={stream} aria-live="polite">
        {loadingChat ? <div className="assistant-chat-loading"><Spinner /><span>Memuat percakapan...</span></div> : !messages.length && <ChatWelcome onAsk={(question) => void ask(question)} />}
        {messages.map((item, index) => <article key={item.id} className={`chat-message ${item.role}`} data-newest={index === messages.length - 1 ? "" : undefined}><span>{item.role === "assistant" ? <SababukaAssistantMark state={assistantState(item.answer)} /> : <UserRound />}</span><div>
          {item.role === "assistant" ? <RichText text={item.content} /> : <p className="chat-text">{item.content}</p>}
          {!!item.answer?.visuals?.length && <div className="chat-visuals">{item.answer.visuals.map((visual, position) => <VisualBlock key={`${item.id}-${position}`} visual={visual} />)}</div>}
          {item.answer && <>{(item.answer.sufficiency !== "sufficient" || item.answer.citations.length > 0) && <BadgeSufficiency value={item.answer.sufficiency} />}{item.answer.citations.length > 0 && <details className="citation-list"><summary>Sumber data ({item.answer.citations.length})</summary>{item.answer.citations.map((citation, position) => <div key={`${citation.publication_item_id}-${position}`}><strong>{plain(citation.label)}</strong><small>{plain([citation.organization, citation.source].filter(Boolean).join(" · "))}</small>{citation.source_url && <span className="citation-links"><a href={citation.source_url} target="_blank" rel="noopener noreferrer">Buka sumber asli</a></span>}</div>)}</details>}</>}
        </div></article>)}
        {busy && <div className="assistant-thinking"><SababukaAssistantMark state="searching" /><span><strong>SABABUKA sedang menganalisis</strong><small>{THINKING[thinkingStep]}</small></span></div>}
      </div>

      {last?.suggestions && last.suggestions.length > 0 && !busy && <div className="assistant-suggestions follow-up">{last.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}
      {error && <div className="assistant-error"><Notice tone="error">{error}</Notice>{failedRequest && <button type="button" className="button secondary" disabled={busy} onClick={() => void ask(failedRequest.question, failedRequest.clientId, false)}>Coba kirim lagi</button>}</div>}
      <form className="chat-composer" onSubmit={submit}><textarea ref={composer} aria-label="Pertanyaan untuk Sababuka" rows={1} data-field="message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event as unknown as FormEvent); } }} placeholder="Tanya apa pun tentang Kapuas..." disabled={session?.status === "archived"} /><button className="chat-send" disabled={busy || !message.trim() || session?.status === "archived"} aria-label="Kirim pertanyaan" title="Kirim"><Send /></button></form>
      <p className="chat-footnote">Sababuka dapat keliru. Periksa sumber data resmi bila tersedia.</p>
      {session?.status === "archived" && <small className="assistant-archived-note">Pulihkan chat ini untuk melanjutkan percakapan.</small>}
    </section>
  </div>;
}

function VisualBlock({ visual }: { visual: Visual }) {
  const rows = visual.kind === "trend" ? (visual.points ?? []).map((point) => ({ label: String(point.year), value: point.value })) : (visual.items ?? []).map((entry) => ({ label: entry.name, value: entry.value }));
  return <figure className="chat-visual">
    {visual.kind === "trend" && visual.points ? <TrendChart points={visual.points} unit={visual.unit} title={visual.title} /> : visual.items ? <DistrictBars items={visual.items} unit={visual.unit} title={visual.title} /> : null}
    {rows.length > 0 && <details className="visual-table"><summary>Tabel data</summary><div className="table-scroll"><table><thead><tr><th>{visual.kind === "trend" ? "Tahun" : "Wilayah"}</th><th>Nilai{visual.unit ? ` (${plain(visual.unit)})` : ""}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td>{plain(row.label)}</td><td>{num(row.value)}</td></tr>)}</tbody></table></div></details>}
  </figure>;
}

function assistantState(answer?: Answer): SababukaAssistantState {
  if (!answer) return "neutral";
  return answer.sufficiency === "sufficient" ? "verified" : answer.sufficiency === "partial" ? "warning" : "insufficient";
}

function BadgeSufficiency({ value }: { value: Answer["sufficiency"] }) {
  const label = value === "sufficient" ? "Data memadai" : value === "partial" ? "Data sebagian" : "Data belum cukup";
  return <span className={`sufficiency ${value}`}>{label}</span>;
}
