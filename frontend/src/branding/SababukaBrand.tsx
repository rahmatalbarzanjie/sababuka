import type { ImgHTMLAttributes } from "react";

export type SababukaAssistantState = "neutral" | "searching" | "verified" | "warning" | "insufficient";

interface SababukaMarkProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src" | "srcSet"> {
  label?: string;
  /** Dipertahankan agar pemanggil lama tetap valid; keadaan hanya memberi kelas, bentuk logo tidak berubah. */
  state?: SababukaAssistantState;
}

/** Lambang SABABUKA BERSINAR (huruf S, sungai, ukiran, perahu, daun, dan grafik) dari berkas logo resmi. */
export function SababukaMark({ label, state = "neutral", className = "", ...props }: SababukaMarkProps) {
  return <img
    src="/brand/mark-128.png"
    srcSet="/brand/mark-128.png 1x, /brand/mark-256.png 2x"
    width={128}
    height={128}
    alt={label ?? ""}
    aria-hidden={label ? undefined : true}
    decoding="async"
    className={`sababuka-mark is-${state} ${className}`.trim()}
    {...props}
  />;
}

export function SababukaAssistantMark(props: SababukaMarkProps) {
  return <SababukaMark {...props} />;
}

/**
 * Logo horizontal (lambang dan tulisan SABABUKA BERSINAR). Dua berkas disediakan: varian terang untuk latar putih dan varian gelap
 * untuk latar navy; CSS memilih menurut tema, dan `.auth-lockup` selalu memakai varian gelap karena latarnya navy.
 */
export function SababukaLockup({ className = "", descriptor = false }: { className?: string; descriptor?: boolean }) {
  return <div className={`sababuka-lockup ${className}`.trim()}>
    <img className="sababuka-logo logo-light" src="/brand/logo-horizontal-128.png" srcSet="/brand/logo-horizontal-128.png 1x, /brand/logo-horizontal-256.png 2x" width={520} height={128} alt="SABABUKA BERSINAR" decoding="async" />
    <img className="sababuka-logo logo-dark" src="/brand/logo-horizontal-dark-128.png" srcSet="/brand/logo-horizontal-dark-128.png 1x, /brand/logo-horizontal-dark-256.png 2x" width={520} height={128} alt="" aria-hidden="true" decoding="async" />
    {descriptor && <small className="sababuka-lockup-desc">Sistem Analisis Big Data Kabupaten Kapuas</small>}
  </div>;
}
