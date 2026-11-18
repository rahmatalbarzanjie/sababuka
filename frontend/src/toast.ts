/** Notifikasi singkat (toast) yang dapat dipanggil dari mana saja, termasuk di luar komponen. */
export type ToastTone = "success" | "error" | "warning" | "info";
export interface ToastDetail { id?: string; tone: ToastTone; title: string; message?: string; /** Rincian teknis (mis. ID permintaan) yang boleh dilipat. */ detail?: string }

export function showToast(input: Omit<ToastDetail, "id"> & { id?: string }): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("sababuka:toast", { detail: { ...input, id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` } }));
}

export const toast = {
  success: (title: string, message?: string) => showToast({ tone: "success", title, message }),
  error: (title: string, message?: string, detail?: string) => showToast({ tone: "error", title, message, detail }),
  warning: (title: string, message?: string) => showToast({ tone: "warning", title, message }),
  info: (title: string, message?: string) => showToast({ tone: "info", title, message }),
};
