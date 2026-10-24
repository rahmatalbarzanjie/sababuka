# CLAUDE.md — Panduan untuk Claude Code

Panduan untuk Claude Code saat mengerjakan repo ini. Isinya selaras dengan `AGENTS.md` (dibaca agen lain seperti Codex) — jaga keduanya tetap konsisten.

## Tentang proyek
**SABABUKA BERSINAR** — frontend dashboard eksekutif pemantauan indikator Kabupaten Kapuas.
- **Sekarang:** build mandiri HTML/CSS/ES Modules.
- **Target:** Next.js App Router + TypeScript + Tailwind + Lucide + Recharts.
- **Bahasa UI:** Bahasa Indonesia.

## Perintah
```bash
npm run demo      # http://localhost:3000
npm run check     # pemeriksaan sintaks sebelum selesai
```

## ⭐ Sumber kebenaran redesign
**Baca `docs/SABABUKA_REDESIGN_SPEC.md` sebelum menyentuh UI.** Itu keputusan desain final. Patuhi.

Prinsip inti:
1. Pimpinan bukan pembaca grafik → buka dengan narasi + lampu lalu lintas, grafik pendukung.
2. Satu aksi utama per halaman, ditonjolkan.
3. POV pengguna di tiap halaman.
4. Menu per peran; modul belum siap diberi badge `Segera`.

Aturan konkret:
- Tanggal satu format: `8 Okt 2026`. Util `formatTanggal()`.
- Nama kanonik konsisten (sidebar = judul = breadcrumb) — spec §2.2.
- Asisten AI = tombol melayang, bukan menu — spec §4.
- Peta kecamatan tertanam di Dashboard Pimpinan.
- Panel premium tampil dengan gembok + feature flag — spec §6.

## Struktur
- `index.html` / `app.js` / `styles.css` — build mandiri
- `server.js` — server demo
- `src/data/data.js` — data contoh
- `docs/` — dokumentasi & spec

## Kebiasaan kerja
- Jalankan `npm run check` sebelum menandai selesai.
- Pekerjaan UI besar: buat branch + PR, jangan langsung ke `main`.
- Commit ringkas, Bahasa Indonesia. Jangan commit rahasia.
