# AGENTS.md — Panduan Agen untuk pre-sababuka

Panduan untuk agen koding (Codex, dsb.) yang mengerjakan repo ini.

## Tentang proyek
**SABABUKA BERSINAR** — frontend dashboard eksekutif pemantauan indikator Kabupaten Kapuas (indikator daerah, OPD, keuangan, pelayanan publik, peringatan, sumber data, validasi).

- **Sekarang:** build mandiri HTML/CSS/ES Modules (bisa dibuka tanpa layanan eksternal).
- **Target arsitektur:** Next.js App Router, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Bahasa UI:** Bahasa Indonesia.

## Menjalankan & memeriksa
```bash
npm run demo      # server demo di http://localhost:3000
npm run check     # pemeriksaan sintaks (node --check)
```
> Catatan: registry npm mungkin tidak dapat diakses di sebagian lingkungan; dependensi Next.js belum tentu bisa dipasang. Jaga agar struktur data & komponen mudah dimigrasikan ke Next.js.

## Struktur
- `index.html`, `app.js`, `styles.css` — build mandiri saat ini
- `server.js` — server demo statis
- `src/data/data.js` — sumber data contoh
- `docs/` — dokumentasi & spesifikasi
- `.github/workflows/deploy-pages.yml` — publikasi GitHub Pages saat push ke `main`

## ⭐ Sumber kebenaran redesign UI/UX
**Baca `docs/SABABUKA_REDESIGN_SPEC.md` sebelum mengubah UI.** Dokumen itu memuat keputusan desain final (hasil audit + sesi desain). Patuhi, jangan menyimpang tanpa alasan.

Ringkasan prinsip (detail di spec):
1. **Pimpinan bukan pembaca grafik** → tiap halaman keputusan dibuka dengan narasi kalimat + status lampu lalu lintas; grafik sebagai pendukung.
2. **Satu aksi utama per halaman**, ditonjolkan (tombol primer, sticky bila perlu).
3. **POV pengguna** — tiap halaman menjawab "apa yang harus SAYA lakukan sekarang".
4. **Kurangi beban navigasi** — menu per peran; modul belum siap diberi badge `Segera` dan klik dinonaktifkan.

Aturan konkret yang sering dilanggar:
- **Tanggal**: satu format `8 Okt 2026` (dengan waktu: `8 Okt 2026, 18.46`). Buat util `formatTanggal()`.
- **Nama kanonik**: satu label per entitas, sama di sidebar = judul = breadcrumb (tabel di spec §2.2).
- **AI Assistant**: tombol melayang (floating), BUKAN item sidebar. Lihat spec §4.
- **Peta kecamatan**: tertanam di Dashboard Pimpinan, bukan menu terpisah.
- **Gating gratis/premium**: panel premium tetap tampil dengan gembok + CTA; isi penuh di belakang feature flag. Lihat spec §6.

## Konvensi kode
- Ikuti gaya berkas yang sudah ada; jangan menambah dependensi tanpa perlu.
- Jalankan `npm run check` sebelum menandai pekerjaan selesai.
- Commit dalam Bahasa Indonesia, ringkas dan deskriptif.
- Jangan commit rahasia/kunci API.
