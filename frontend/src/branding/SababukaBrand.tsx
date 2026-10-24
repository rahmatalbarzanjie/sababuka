import type { SVGProps } from "react";

export type SababukaAssistantState = "neutral" | "searching" | "verified" | "warning" | "insufficient";

interface SababukaMarkProps extends Omit<SVGProps<SVGSVGElement>, "aria-label"> {
  label?: string;
  state?: SababukaAssistantState;
}

/**
 * Master mark SABABUKA "Gerbang Data".
 *
 * Bentuknya diturunkan dari konsep 03: siluet gerbang/topeng, pita sungai
 * berbentuk S, dua mata, tiga titik provenance, dan cahaya Bersinar.
 */
export function SababukaMark({ label, state = "neutral", className = "", ...props }: SababukaMarkProps) {
  const accessible = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const nodeFill = state === "searching" ? "#2F83C7" : state === "verified" ? "#0F6D54" : "#16304F";

  return <svg
    viewBox="0 0 96 128"
    className={`sababuka-mark is-${state} ${className}`.trim()}
    focusable="false"
    {...accessible}
    {...props}
  >
    <path className="sababuka-mark-shell" fill="#16304F" d="M48 2C25.6 2 11 17.4 11 39.5v49C11 111 25.6 126 48 126s37-15 37-37.5v-49C85 17.4 70.4 2 48 2Z" />
    <path className="sababuka-mark-river-fill" fill="#0F6D54" d="M11 48.5c9.7 12.7 22.4 19.3 38.3 20.5C67 70.4 77.8 80.4 85 94v-3.8c0 21.2-13.3 35.8-34.1 35.8h-2.4c4.1-9.7 3.1-18.4-5-24.6C31.8 92.5 19.6 90 11 81.4V48.5Z" />
    <path className="sababuka-mark-river" fill="#FFFFFF" d="M11 40.4c10.8 15.4 23.1 22.8 39.1 24.1C66.7 65.9 77.7 75.1 85 87v13.6C77 84.8 66.8 76.4 49.2 75 33.1 73.7 20.1 67.5 11 55.3V40.4Zm0 32.7c9.3 11.3 20.1 17.6 34.6 19 10.2 1 16.8 7.8 19.2 18.5l-8.7 5.1c-2-8-5.7-12.5-11.6-13.1-14.2-1.4-25.3-6.2-33.5-14V73.1Z" />
    <path className="sababuka-mark-crown" fill="#FFFFFF" d="M48 8.2c-4.1 9.3-10.3 15.8-18.1 21.8-7.4 5.7-7 14.7.8 19.1 7.5 4.2 11.5 9.5 12.1 17.2l.7 10h9l.7-10c.6-7.7 4.6-13 12.1-17.2 7.8-4.4 8.2-13.4.8-19.1C58.3 24 52.1 17.5 48 8.2Z" />
    <path className="sababuka-mark-eye" fill="#FFFFFF" d="M18.8 49.5c8.8.7 15.1 4.4 18.6 11.3-8.5-.2-15-3.9-18.6-11.3Zm58.4 0c-8.8.7-15.1 4.4-18.6 11.3 8.5-.2 15-3.9 18.6-11.3Z" />
    <path className="sababuka-mark-axis" fill="#FFFFFF" d="M45.5 58h5v68h-5z" />
    <path className="sababuka-mark-star" fill="#C99A2E" d="M48 17.2c1.9 9.3 5.5 13.1 14.8 15-9.3 1.9-12.9 5.7-14.8 15-1.9-9.3-5.5-13.1-14.8-15 9.3-1.9 12.9-5.7 14.8-15Z" />

    <g className="sababuka-mark-nodes">
      <circle cx="48" cy="70" r="8" fill="#FFFFFF" />
      <circle cx="48" cy="70" r="5.6" fill={nodeFill} />
      <circle cx="48" cy="91.5" r="8" fill="#FFFFFF" />
      <circle cx="48" cy="91.5" r="5.6" fill={state === "warning" ? "#C99A2E" : state === "insufficient" ? "#FFFFFF" : nodeFill} />
      <circle cx="48" cy="113" r="8" fill="#FFFFFF" />
      <circle cx="48" cy="113" r="5.6" fill={nodeFill} />
    </g>

    {state === "verified" && <g className="sababuka-mark-status-symbols" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m45.5 70 1.7 1.7 3.5-4" /><path d="m45.5 91.5 1.7 1.7 3.5-4" /><path d="m45.5 113 1.7 1.7 3.5-4" />
    </g>}
    {state === "warning" && <g className="sababuka-mark-status-symbols" fill="#FFFFFF">
      <rect x="47.2" y="87.7" width="1.6" height="5" rx=".8" /><circle cx="48" cy="95" r="1" />
    </g>}
    {state === "insufficient" && <g className="sababuka-mark-status-symbols">
      <circle cx="48" cy="91.5" r="5.7" fill="none" stroke="#7A8699" strokeWidth="1.8" strokeDasharray="2.2 2.2" />
      <circle cx="31" cy="91.5" r="1.5" fill="#7A8699" /><circle cx="65" cy="91.5" r="1.5" fill="#7A8699" />
    </g>}
    {state === "searching" && <g className="sababuka-mark-search-rings" fill="none" stroke="#54ACE7" strokeWidth="1.8">
      <ellipse cx="48" cy="91.5" rx="28" ry="10" /><circle cx="74" cy="88" r="2.2" fill="#54ACE7" stroke="none" />
    </g>}
  </svg>;
}

export function SababukaAssistantMark(props: SababukaMarkProps) {
  return <SababukaMark {...props} />;
}

export function SababukaLockup({ className = "" }: { className?: string }) {
  return <div className={`sababuka-lockup ${className}`.trim()}>
    <SababukaMark />
    <div className="sababuka-lockup-copy">
      <strong>SABABUKA</strong>
      <small>Sistem Analisis Big Data Kabupaten Kapuas</small>
    </div>
  </div>;
}
