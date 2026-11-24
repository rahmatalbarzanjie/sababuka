import { Archive, ArrowRight, Check, CircleCheck, Eye, History, Menu, NotebookPen, Pencil, Plus, RotateCcw, Send, ShieldCheck, Star, Sunrise, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { SababukaAssistantMark, type SababukaAssistantState } from "../branding/SababukaBrand";
import { DistrictBars, Sparkline, TrendChart } from "../components/InsightVisuals";
import { Notice, Spinner, formatDate } from "../components";
import { RichText } from "../components/RichText";
import { num } from "../insight";
import { plain } from "../text";
import { toast } from "../toast";
import { splitFollowUp } from "../utils/follow-up";

interface Session { id: string; title: string | null; status: "active" | "archived"; started_at: string; updated_at?: string; message_count?: number }
interface Citation { publication_item_id: string; label: string; indicator: string; period: string; organization: string; source: string; indicator_id?: string; source_url?: string | null }
interface Visual { kind: "trend" | "districts"; title: string; unit: string; indicator_id?: string; points?: Array<{ year: number; value: number }>; items?: Array<{ name: string; value: number }> }
interface Answer { message_id: string; answer: string; citations: Citation[]; sufficiency: "sufficient" | "partial" | "insufficient"; visuals?: Visual[]; suggestions?: string[] }
interface ChatMessage { id: string; role: "user" | "assistant"; content: string; created_at?: string; answer?: Answer }
interface SessionDetail extends Session { messages: ChatMessage[] }
interface BriefItem { key: "perhatian" | "target" | "opd"; tone: "warn" | "bad" | "info"; title: string; detail: string; question: string; read: boolean }
interface Pin { indicator_id: string; name: string; unit: string; latest_year: number; latest_value: number; assessment: string; series: Array<{ year: number; value: number }> }
interface Note { id: string; content: string; session_id: string | null; created_at: string }

const THINKING = ["Memeriksa angka dan tren indikator...", "Membandingkan dengan target dan OPD terkait...", "Menyusun jawaban dan sumber data..."];
const greeting = () => { const hour = new Date().getHours(); return hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam"; };


const EXAMPLES = ["Apa yang perlu saya perhatikan hari ini?", "Bagaimana kondisi dan perkembangan OPD di Kapuas?", "Bagaimana tren kemiskinan di Kapuas?", "Kecamatan mana yang paling rendah angka melek hurufnya?"];
const DRAFT_KEY = "sababuka.assistant.draft";

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
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const stream = useRef<HTMLDivElement>(null);
  const [brief, setBrief] = useState<BriefItem[] | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [watchOpen, setWatchOpen] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  const loadRuang = async () => {
    // Briefing, pantauan, dan catatan bersifat pelengkap; kegagalan memuatnya tidak boleh mengganggu percakapan.
    const [briefing, pinList, noteList] = await Promise.allSettled([
      api<{ items: BriefItem[] }>("/assistant/briefing"), api<{ data: Pin[] }>("/assistant/pins"), api<{ data: Note[] }>("/assistant/notes"),
    ]);
    if (briefing.status === "fulfilled") setBrief(briefing.value.items);
    if (pinList.status === "fulfilled") setPins(pinList.value.data);
    if (noteList.status === "fulfilled") setNotes(noteList.value.data);
  };
  useEffect(() => { void loadRuang(); }, []);
  useEffect(() => {
    if (!busy) { setThinkingStep(0); return; }
    const timer = window.setInterval(() => setThinkingStep((step) => Math.min(step + 1, THINKING.length - 1)), 2600);
    return () => window.clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && !(target && /^(INPUT|TEXTAREA|SELECT)$/u.test(target.tagName))) { event.preventDefault(); document.querySelector<HTMLTextAreaElement>('textarea[data-field="message"]')?.focus(); }
      if (event.key === "Escape") { setWatchOpen(false); setHistoryOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const markRead = (key: BriefItem["key"]) => {
    setBrief((current) => current?.map((item) => item.key === key ? { ...item, read: true } : item) ?? current);
    void api("/assistant/briefing/" + key + "/read", { method: "POST", mutation: true }).catch(() => undefined);
  };
  const isPinned = (id?: string) => Boolean(id && pins.some((pin) => pin.indicator_id === id));
  const togglePin = async (id: string) => {
    const was = isPinned(id);
    try {
      const result = await api<{ data: Pin[] }>("/assistant/pins/" + id, { method: was ? "DELETE" : "PUT", mutation: true });
      setPins(result.data);
      toast.success(was ? "Dihapus dari pantauan" : "Ditambahkan ke indikator pantauan");
    } catch (cause) { toast.error("Pantauan belum dapat diubah", cause instanceof Error ? cause.message : undefined); }
  };
  const saveNote = async (content: string, key: string) => {
    try {
      const note = await api<Note>("/assistant/notes", { method: "POST", mutation: true, body: jsonBody({ content, ...(session ? { session_id: session.id } : {}) }) });
      setNotes((current) => [note, ...current]); setSavedItems((current) => new Set(current).add(key));
      toast.success("Disimpan ke Catatan Bupati");
    } catch (cause) { toast.error("Catatan belum dapat disimpan", cause instanceof Error ? cause.message : undefined); }
  };
  const removeNote = async (id: string) => {
    try { await api("/assistant/notes/" + id, { method: "DELETE", mutation: true }); setNotes((current) => current.filter((note) => note.id !== id)); }
    catch (cause) { toast.error("Catatan belum dapat dihapus", cause instanceof Error ? cause.message : undefined); }
  };

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
    try {
      if (message) window.sessionStorage.setItem(DRAFT_KEY, message);
      else window.sessionStorage.removeItem(DRAFT_KEY);
    } catch { /* Draf tetap tersedia selama komponen terbuka. */ }
  }, [message]);
  useEffect(() => {
    const chatStream = stream.current;
    if (chatStream) chatStream.scrollTo({ top: chatStream.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const openSession = async (item: Session) => {
    setLoadingChat(true); setError(""); setFailedRequest(null);
    try {
      const detail = await api<SessionDetail>(`/assistant/sessions/${item.id}`);
      setSession(detail); setMessages(detail.messages); setHistoryOpen(false); setRenaming(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chat belum dapat dibuka."); }
    finally { setLoadingChat(false); }
  };
  const newChat = () => { setSession(null); setMessages([]); setError(""); setFailedRequest(null); setRenaming(false); setHistoryOpen(false); };
  const toggleArchived = async () => { const next = !showArchived; setShowArchived(next); setSession(null); setMessages([]); await loadSessions(next); };
  const updateSession = async (input: { title?: string; status?: "active" | "archived" }) => {
    if (!session) return;
    try {
      const updated = await api<Session>(`/assistant/sessions/${session.id}`, { method: "PATCH", mutation: true, body: jsonBody(input) });
      setSession(updated); setRenaming(false);
      if (input.status) { setMessages([]); setSession(null); }
      await loadSessions(showArchived);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan riwayat belum dapat disimpan."); }
  };

  const ask = async (question: string, clientId: string = crypto.randomUUID(), optimistic = true, briefKey?: BriefItem["key"]) => {
    if (briefKey) markRead(briefKey);
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

  return <div className="assistant-chat-layout with-watch">
    <button type="button" className={`assistant-history-overlay${historyOpen ? " open" : ""}`} aria-label="Tutup riwayat chat" onClick={() => setHistoryOpen(false)} />
    <aside className={`assistant-history${historyOpen ? " open" : ""}`} aria-label="Riwayat Tanya Sababuka">
      <header><div><History /><strong>Riwayat chat</strong></div><button type="button" className="icon-button assistant-history-close" aria-label="Tutup riwayat" onClick={() => setHistoryOpen(false)}><X /></button></header>
      <button type="button" className="button primary assistant-new-chat" onClick={newChat}><Plus />Chat baru</button>
      <div className="assistant-session-list">
        {loadingSessions ? <Spinner /> : sessions.length === 0 ? <p className="assistant-session-empty">{showArchived ? "Belum ada chat yang diarsipkan." : "Belum ada riwayat. Mulai chat baru untuk bertanya."}</p> : sessions.map((item) => <button type="button" key={item.id} className={session?.id === item.id ? "active" : ""} onClick={() => void openSession(item)}><strong>{plain(item.title || "Chat baru")}</strong><small>{formatDate(item.updated_at ?? item.started_at)}{typeof item.message_count === "number" ? ` · ${item.message_count} pesan` : ""}</small></button>)}
      </div>
      <button type="button" className="assistant-archive-filter" onClick={() => void toggleArchived()}>{showArchived ? <RotateCcw /> : <Archive />}{showArchived ? "Kembali ke chat aktif" : "Lihat arsip"}</button>
    </aside>

    <section className="assistant-conversation" aria-label="Percakapan Tanya Sababuka">
      <header className="assistant-conversation-header">
        <button type="button" className="icon-button assistant-history-trigger" aria-label="Buka riwayat chat" aria-expanded={historyOpen} onClick={() => setHistoryOpen(true)}><Menu /></button>
        <div className="assistant-conversation-title">
          {renaming && session ? <form onSubmit={(event) => { event.preventDefault(); if (titleDraft.trim()) void updateSession({ title: titleDraft.trim() }); }}><input aria-label="Judul chat" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} autoFocus maxLength={255} /><button type="submit" className="icon-button" aria-label="Simpan judul"><Check /></button><button type="button" className="icon-button" aria-label="Batal mengganti judul" onClick={() => setRenaming(false)}><X /></button></form> : <div><strong>{plain(session?.title || "Chat baru")}</strong><small><ShieldCheck /> Jawaban dari data resmi yang sudah dipublikasikan</small></div>}
        </div>
        <div className="assistant-conversation-actions"><button type="button" className="icon-button assistant-watch-trigger" aria-label="Buka pantauan" aria-expanded={watchOpen} onClick={() => setWatchOpen(true)}><Eye /></button></div>
        {session && !renaming && <div className="assistant-conversation-actions"><button type="button" className="icon-button" title="Ganti judul" aria-label="Ganti judul chat" onClick={() => { setTitleDraft(session.title ?? ""); setRenaming(true); }}><Pencil /></button><button type="button" className="icon-button" title={session.status === "archived" ? "Pulihkan chat" : "Arsipkan chat"} aria-label={session.status === "archived" ? "Pulihkan chat" : "Arsipkan chat"} onClick={() => void updateSession({ status: session.status === "archived" ? "active" : "archived" })}>{session.status === "archived" ? <RotateCcw /> : <Archive />}</button></div>}
      </header>

      <div className="chat-stream" ref={stream} aria-live="polite">
        {loadingChat ? <div className="assistant-chat-loading"><Spinner /><span>Memuat percakapan...</span></div> : !messages.length && <Welcome brief={brief} onAsk={(question, key) => void ask(question, undefined, true, key)} />}
        {messages.map((item, index) => <article key={item.id} className={`chat-message ${item.role}`} data-newest={index === messages.length - 1 ? "" : undefined}><span>{item.role === "assistant" ? <SababukaAssistantMark state={assistantState(item.answer)} /> : <UserRound />}</span><div>
          {item.role === "assistant" ? <AnswerBody text={item.content} messageId={item.id} saved={savedItems} onSave={(text, key) => void saveNote(text, key)} /> : <p className="chat-text">{item.content}</p>}
          {!!item.answer?.visuals?.length && <div className="chat-visuals">{item.answer.visuals.map((visual, position) => <VisualBlock key={`${item.id}-${position}`} visual={visual} pinned={isPinned(visual.indicator_id)} onPin={visual.indicator_id ? () => void togglePin(visual.indicator_id!) : undefined} />)}</div>}
          {item.answer && <><BadgeSufficiency value={item.answer.sufficiency} />{item.answer.citations.length > 0 && <details className="citation-list"><summary>Sumber data ({item.answer.citations.length})</summary>{item.answer.citations.map((citation, position) => <div key={`${citation.publication_item_id}-${position}`}><strong>{plain(citation.label)}</strong><small>{plain([citation.organization, citation.source].filter(Boolean).join(" · "))}</small>{citation.source_url && <span className="citation-links"><a href={citation.source_url} target="_blank" rel="noopener noreferrer">Buka sumber asli</a></span>}</div>)}</details>}</>}
        </div></article>)}
        {busy && <div className="assistant-thinking"><SababukaAssistantMark state="searching" /><span><strong>SABABUKA sedang menganalisis</strong><small>{THINKING[thinkingStep]}</small></span></div>}
      </div>

      {last?.suggestions && last.suggestions.length > 0 && !busy && <div className="assistant-suggestions follow-up">{last.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}
      {error && <div className="assistant-error"><Notice tone="error">{error}</Notice>{failedRequest && <button type="button" className="button secondary" disabled={busy} onClick={() => void ask(failedRequest.question, failedRequest.clientId, false)}>Coba kirim lagi</button>}</div>}
      <form className="chat-composer" onSubmit={submit}><textarea aria-label="Pertanyaan untuk Sababuka" rows={2} data-field="message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event as unknown as FormEvent); } }} placeholder="Tanyakan kondisi, indikator, atau kecamatan..." disabled={session?.status === "archived"} /><button className="button primary" disabled={busy || !message.trim() || session?.status === "archived"} aria-label="Kirim pertanyaan"><Send />{busy ? "Menganalisis..." : "Kirim"}</button></form>
      {session?.status === "archived" && <small className="assistant-archived-note">Pulihkan chat ini untuk melanjutkan percakapan.</small>}
    </section>

    <button type="button" className={"assistant-history-overlay watch" + (watchOpen ? " open" : "")} aria-label="Tutup pantauan" onClick={() => setWatchOpen(false)} />
    <aside className={"assistant-watch" + (watchOpen ? " open" : "")} aria-label="Pantauan Bupati">
      <header><strong>Pantauan</strong><button type="button" className="icon-button assistant-watch-close" aria-label="Tutup pantauan" onClick={() => setWatchOpen(false)}><X /></button></header>
      <BriefRing items={brief} />
      <section><h3><Star />Indikator pantauan</h3>
        {pins.length === 0 ? <p className="watch-empty">Tekan Pantau pada grafik di jawaban untuk memantau indikator di sini.</p> : <div className="watch-pins">{pins.map((pin) => <button type="button" key={pin.indicator_id} className="watch-pin" onClick={() => { setWatchOpen(false); void ask("Bagaimana tren " + pin.name + "?"); }}><span><strong>{plain(pin.name)}</strong><small className="num">{num(pin.latest_value)}{pin.unit ? " " + plain(pin.unit) : ""} · {pin.latest_year}</small></span><Sparkline points={pin.series} tone={pin.assessment === "membaik" ? "good" : pin.assessment === "memburuk" ? "bad" : "neutral"} /></button>)}</div>}
      </section>
      <section><h3><NotebookPen />Catatan Bupati</h3>
        {notes.length === 0 ? <p className="watch-empty">Simpan tindak lanjut dari jawaban untuk dibahas pada rapat berikutnya.</p> : <ul className="watch-notes">{notes.map((note) => <li key={note.id}><span>{plain(note.content)}<small>{formatDate(note.created_at)}</small></span><button type="button" className="icon-button" aria-label="Hapus catatan" onClick={() => void removeNote(note.id)}><Trash2 /></button></li>)}</ul>}
        <small className="watch-privacy">Catatan hanya terlihat oleh Bupati dan tidak dikirim ke OPD.</small>
      </section>
    </aside>
  </div>;
}

function BriefRing({ items }: { items: BriefItem[] | null }) {
  const total = items?.length ?? 0; const done = items?.filter((item) => item.read).length ?? 0;
  const circumference = 2 * Math.PI * 27;
  return <section className="watch-brief"><h3><Sunrise />Briefing hari ini</h3>
    <div><span className="brief-ring" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" className="ring-bg" /><circle cx="32" cy="32" r="27" className="ring-fg" strokeDasharray={circumference} strokeDashoffset={total ? circumference * (1 - done / total) : circumference} /></svg><b className="num">{done}/{total}</b></span>
      <p><strong>{!total ? "Belum tersedia" : done === total ? "Briefing selesai" : done === 0 ? "Belum dibaca" : done + " dari " + total + " dibaca"}</strong><small>Hal yang layak diketahui hari ini.</small></p></div></section>;
}

function Welcome({ brief, onAsk }: { brief: BriefItem[] | null; onAsk: (question: string, key?: BriefItem["key"]) => void }) {
  const allRead = Boolean(brief?.length) && brief!.every((item) => item.read);
  return <div className="assistant-welcome brief-home">
    <h2>{greeting()}, Bapak Bupati.</h2>
    <p>{brief?.length ? "Ada " + brief.length + " hal yang layak diketahui hari ini. Data diambil dari indikator yang sudah terbit." : "Tanyakan kondisi daerah, tren indikator, perkembangan OPD, perbandingan kecamatan, atau rekomendasi tindak lanjut."}</p>
    {brief && brief.length > 0 && <div className="brief-cards">{brief.map((item) => <button type="button" key={item.key} className={"brief-card " + item.tone + (item.read ? " read" : "")} onClick={() => onAsk(item.question, item.key)}><span className="brief-dot">{item.read ? <CircleCheck /> : <ArrowRight />}</span><span><strong>{plain(item.title)}</strong><small>{plain(item.detail)}</small></span><em>{item.read ? "Dibaca" : "Buka"}</em></button>)}</div>}
    {allRead && <p className="brief-finished"><CircleCheck />Briefing hari ini selesai. Tanyakan apa saja bila ada yang ingin didalami.</p>}
    <div className="assistant-suggestions">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => onAsk(example)}>{example}</button>)}</div>
  </div>;
}

function AnswerBody({ text, messageId, saved, onSave }: { text: string; messageId: string; saved: Set<string>; onSave: (text: string, key: string) => void }) {
  const parts = splitFollowUp(text);
  if (!parts) return <RichText text={text} />;
  const clean = (value: string) => plain(value).replace(/\*\*/gu, "");
  return <>
    {parts.before.trim() && <RichText text={parts.before} />}
    <div className="follow-up-block"><h4>{plain(parts.heading)}</h4>{parts.items.map((item, index) => { const key = messageId + ":" + index; const done = saved.has(key); return <div key={key} className={"follow-up-item" + (done ? " saved" : "")}><span>{clean(item)}</span><button type="button" className="button secondary" disabled={done} onClick={() => onSave(clean(item), key)}>{done ? <><Check />Tersimpan</> : <><NotebookPen />Simpan ke catatan</>}</button></div>; })}</div>
    {parts.after.trim() && <RichText text={parts.after} />}
  </>;
}

function VisualBlock({ visual, pinned, onPin }: { visual: Visual; pinned?: boolean; onPin?: (() => void) | undefined }) {
  const rows = visual.kind === "trend" ? (visual.points ?? []).map((point) => ({ label: String(point.year), value: point.value })) : (visual.items ?? []).map((entry) => ({ label: entry.name, value: entry.value }));
  return <figure className="chat-visual">
    {onPin && <button type="button" className={"visual-pin" + (pinned ? " on" : "")} aria-pressed={pinned} aria-label={pinned ? "Berhenti memantau indikator" : "Pantau indikator ini"} onClick={onPin}><Star />{pinned ? "Dipantau" : "Pantau"}</button>}
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
