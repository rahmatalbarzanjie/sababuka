import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { plain } from "../text";
import type { ToastDetail, ToastTone } from "../toast";

const icons: Record<ToastTone, typeof Info> = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
/** Berhasil cepat hilang; galat bertahan lebih lama agar sempat dibaca dan disalin. */
const lifetime: Record<ToastTone, number> = { success: 6000, info: 6000, warning: 10000, error: 16000 };
const MAX = 4;

/** Menampilkan toast di pojok bawah (desktop) atau lebar penuh di atas dasar layar (ponsel). Dipasang sekali di akar aplikasi. */
export function ToastHost() {
  const [items, setItems] = useState<ToastDetail[]>([]);
  const timers = useRef(new Map<string, number>());
  const close = (id: string) => {
    window.clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  };
  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      const id = detail.id!;
      setItems((current) => [...current.filter((item) => item.id !== id), detail].slice(-MAX));
      timers.current.set(id, window.setTimeout(() => close(id), lifetime[detail.tone]));
    };
    window.addEventListener("sababuka:toast", onToast);
    const pending = timers.current;
    return () => { window.removeEventListener("sababuka:toast", onToast); pending.forEach((timer) => window.clearTimeout(timer)); pending.clear(); };
  }, []);
  if (!items.length) return null;
  return <div className="toast-host" role="region" aria-label="Notifikasi">
    {items.map((item) => { const Icon = icons[item.tone]; return <div key={item.id} className={`toast ${item.tone}`} role={item.tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden />
      <div className="toast-body"><strong>{plain(item.title)}</strong>{item.message && <p>{plain(item.message)}</p>}{item.detail && <details><summary>Rincian</summary><code>{plain(item.detail)}</code></details>}</div>
      <button type="button" className="toast-close" aria-label="Tutup notifikasi" onClick={() => close(item.id!)}><X aria-hidden /></button>
    </div>; })}
  </div>;
}
