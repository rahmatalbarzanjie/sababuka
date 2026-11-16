/** Pesan galat yang menyertakan penyebab jaringan atau TLS (mis. "fetch failed" tanpa penyebab sulit dilacak). */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as Error & { cause?: unknown }).cause;
  const detail = cause instanceof Error
    ? [(cause as Error & { code?: string }).code, cause.message].filter(Boolean).join(": ")
    : cause ? String(cause) : "";
  return detail && !error.message.includes(detail) ? `${error.message} (${detail})` : error.message;
}
