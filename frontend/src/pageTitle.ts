import { useSyncExternalStore } from "react";

/** Judul halaman yang ditentukan oleh isi halaman (mis. nama indikator), agar h1 tidak sama di setiap halaman detail. */
export interface PageTitleOverride { title: string; subtitle: string }

let current: PageTitleOverride | null = null;
const listeners = new Set<() => void>();

export function setPageTitle(next: PageTitleOverride | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function usePageTitleOverride(): PageTitleOverride | null {
  return useSyncExternalStore((callback) => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => current);
}
