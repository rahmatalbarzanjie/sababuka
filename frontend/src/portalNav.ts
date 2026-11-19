import { useEffect, useState } from "react";
import { navigate } from "./router";

/** Bagian Dashboard Eksekutif. Menu atas Bupati memetakan ke bagian ini lewat hash alamat, jadi tautan lama tetap berlaku. */
export type DashTab = "ringkasan" | "capaian" | "peta" | "indikator" | "tren" | "fokus";
export const DASH_TABS: DashTab[] = ["ringkasan", "capaian", "peta", "indikator", "tren", "fokus"];
/** Bagian yang berada di bawah menu Indikator (dipilih lewat chip). */
export const INDICATOR_GROUP: DashTab[] = ["indikator", "tren", "fokus"];

export function currentTab(): DashTab {
  try {
    if (new URLSearchParams(window.location.search).get("kecamatan")) return "peta";
    const hash = window.location.hash.replace("#", "") as DashTab;
    if ((hash as string) === "capaian") return "ringkasan";
    return DASH_TABS.includes(hash) ? hash : "ringkasan";
  } catch { return "ringkasan"; }
}

/** Membuka satu bagian dashboard. Di halaman dashboard cukup mengganti hash; dari halaman lain berpindah halaman. */
export function goDashboard(tab: DashTab): void {
  if (window.location.pathname === "/dashboard") {
    if (window.location.hash === `#${tab}`) return;
    window.location.hash = tab;
    window.scrollTo({ top: 0, left: 0 });
  } else navigate(`/dashboard#${tab}`);
}

/** Bagian dashboard yang aktif, mengikuti hash alamat. */
export function useDashTab(): DashTab {
  const [tab, setTab] = useState<DashTab>(currentTab);
  useEffect(() => {
    const sync = () => setTab(currentTab());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  return tab;
}
