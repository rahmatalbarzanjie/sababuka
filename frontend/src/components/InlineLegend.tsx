import type { ReactNode } from "react";
import { Badge } from "../components";

type Tone = "success" | "warning" | "danger" | "neutral";

/** Legenda ringkas di dalam card yang memakainya: lencana berwarna beserta artinya, tanpa tooltip. */
export function InlineLegend({ label, items }: { label: string; items: Array<{ tone: Tone; name: string; text: ReactNode }> }) {
  return <ul className="inline-legend" aria-label={label}>
    {items.map((item) => <li key={item.name}><Badge tone={item.tone}>{item.name}</Badge><span>{item.text}</span></li>)}
  </ul>;
}
