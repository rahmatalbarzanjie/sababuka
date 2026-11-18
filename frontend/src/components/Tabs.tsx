import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem { id: string; label: string; count?: number | string; tone?: "warning" | "neutral" }

/** Tab dengan panel tunggal: pembaca memilih satu pekerjaan, bukan menggulir semuanya. Panah kiri dan kanan berpindah tab. */
export function Tabs({ tabs, value, onChange, children, label }: { tabs: TabItem[]; value: string; onChange(id: string): void; children: ReactNode; label: string }) {
  const base = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (event: KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next]!.id); refs.current[next]?.focus();
  };
  return <>
    <div className="tabs-bar" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => <button key={tab.id} ref={(element) => { refs.current[index] = element; }} type="button" role="tab" id={`${base}-${tab.id}`} aria-selected={tab.id === value} aria-controls={`${base}-panel`}
        tabIndex={tab.id === value ? 0 : -1} className={`tab${tab.id === value ? " active" : ""}`} onClick={() => onChange(tab.id)} onKeyDown={(event) => move(event, index)}>
        {tab.label}{tab.count !== undefined && <span className={`tab-count ${tab.tone ?? "neutral"}`}>{tab.count}</span>}
      </button>)}
    </div>
    <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${value}`} className="tab-panel">{children}</div>
  </>;
}
