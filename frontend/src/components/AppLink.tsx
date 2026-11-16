import type { ReactNode } from "react";
import { navigate } from "../router";

/** Tautan internal tanpa muat ulang halaman; klik dengan tombol modifikasi tetap membuka tab baru. */
export function AppLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return <a className={className} href={to} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(to);
  }}>{children}</a>;
}
