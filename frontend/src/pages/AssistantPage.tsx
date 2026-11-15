import { Send, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { SababukaAssistantMark, type SababukaAssistantState } from "../branding/SababukaBrand";
import { DistrictBars, TrendChart } from "../components/InsightVisuals";
import { Notice } from "../components";

interface Session { id: string; title: string | null; status: string; started_at: string }
interface Citation { publication_item_id: string; label: string; indicator: string; period: string; organization: string; source: string }
interface Visual { kind: "trend" | "districts"; title: string; unit: string; points?: Array<{ year: number; value: number }>; items?: Array<{ name: string; value: number }> }
interface Answer { message_id: string; answer: string; citations: Citation[]; sufficiency: "sufficient" | "partial" | "insufficient"; visuals?: Visual[]; suggestions?: string[] }
interface ChatMessage { role: "user" | "assistant"; content: string; answer?: Answer }

const EXAMPLES = ["Apa yang perlu saya perhatikan hari ini?", "Bagaimana tren kemiskinan di Kapuas?", "Kecamatan mana yang paling rendah angka melek hurufnya?"];

export function AssistantChat({ compact = false }: { compact?: boolean }) {
  const [session, setSession] = useState<Session | null>(null); const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const ask = async (question: string) => {
    setBusy(true); setError(""); setMessage("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    try {
      const active = session ?? await api<Session>("/assistant/sessions", { method: "POST", mutation: true, body: jsonBody({ title: "Tanya Sababuka" }) });
      if (!session) setSession(active);
      const answer = await api<Answer>(`/assistant/sessions/${active.id}/messages`, { method: "POST", mutation: true, body: jsonBody({ message: question }) });
      setMessages((current) => [...current, { role: "assistant", content: answer.answer, answer }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Asisten belum dapat menjawab."); }
    finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); const question = message.trim(); if (question && !busy) void ask(question); };
  const last = messages[messages.length - 1]?.answer;
  return <section className={`panel assistant-panel${compact ? " compact" : ""}`}>
    {!compact && <header><span className="assistant-avatar"><SababukaAssistantMark state={busy ? "searching" : "neutral"} /></span><div><h2>Tanya Sababuka</h2><p><ShieldCheck /> Jawaban dihitung dari data resmi Kabupaten Kapuas, lengkap dengan sumbernya.</p></div></header>}
    <div className="chat-stream">
      {!messages.length && <div className="assistant-welcome"><SababukaAssistantMark className="assistant-welcome-mark" state={busy ? "searching" : "neutral"} /><h3>Apa yang ingin Anda ketahui?</h3><p>Tanyakan tren, perbandingan kecamatan, OPD penanggung jawab, atau tindak lanjut.</p><div className="assistant-suggestions">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => void ask(example)}>{example}</button>)}</div></div>}
      {messages.map((item, index) => <article key={index} className={`chat-message ${item.role}`}><span>{item.role === "assistant" ? <SababukaAssistantMark state={assistantState(item.answer)} /> : <UserRound />}</span><div>
        <p className="chat-text">{item.content}</p>
        {item.answer?.visuals?.map((visual, position) => visual.kind === "trend" && visual.points ? <TrendChart key={position} points={visual.points} unit={visual.unit} title={visual.title} /> : visual.items ? <DistrictBars key={position} items={visual.items} unit={visual.unit} title={visual.title} /> : null)}
        {item.answer && <><BadgeSufficiency value={item.answer.sufficiency} />{item.answer.citations.length > 0 && <div className="citation-list">{item.answer.citations.map((citation) => <div key={citation.publication_item_id}><strong>{citation.label}</strong><small>{[citation.organization, citation.source].filter(Boolean).join(" · ")}</small></div>)}</div>}</>}
      </div></article>)}
    </div>
    {last?.suggestions && last.suggestions.length > 0 && !busy && <div className="assistant-suggestions follow-up">{last.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}
    {error && <Notice tone="error">{error}</Notice>}
    <form className="chat-composer" onSubmit={submit}><textarea aria-label="Pertanyaan untuk Sababuka" rows={2} data-field="message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event as unknown as FormEvent); } }} placeholder="Tanyakan indikator, kecamatan, atau minta rekomendasi…" /><button className="button primary" disabled={busy || !message.trim()}><Send />{busy ? "Menganalisis…" : "Kirim"}</button></form>
  </section>;
}

export function AssistantPage() {
  return <div className="assistant-workspace"><AssistantChat /></div>;
}

function assistantState(answer?: Answer): SababukaAssistantState {
  if (!answer) return "neutral";
  return answer.sufficiency === "sufficient" ? "verified" : answer.sufficiency === "partial" ? "warning" : "insufficient";
}

function BadgeSufficiency({ value }: { value: Answer["sufficiency"] }) {
  const label = value === "sufficient" ? "Data memadai" : value === "partial" ? "Data sebagian" : "Data belum cukup";
  return <span className={`sufficiency ${value}`}>{label}</span>;
}
