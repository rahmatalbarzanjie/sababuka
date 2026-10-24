# SABABUKA — Spesifikasi Perbaikan UI/UX (Handoff untuk Implementasi)

> **Tujuan dokumen:** menerjemahkan hasil audit + mockup menjadi instruksi implementasi yang bisa dikerjakan agen koding (Codex) atau developer. Semua keputusan di sini sudah disepakati pemilik produk.
>
> **Cara pakai:** commit file ini ke repo (mis. `docs/SABABUKA_REDESIGN_SPEC.md`). Tunjuk dari `AGENTS.md` (dibaca Codex) **dan** `CLAUDE.md` (dibaca Claude Code) dengan satu baris: `Lihat docs/SABABUKA_REDESIGN_SPEC.md sebagai sumber kebenaran redesign UI/UX.`
>
> **Catatan konteks:** riwayat percakapan desain TIDAK otomatis terbaca oleh agen lain. Dokumen ini adalah satu-satunya sumber kebenaran handoff. Mockup visual (tautan di bawah) adalah acuan tampilan.

## 0. Referensi mockup (acuan visual)
- Dashboard Pimpinan (+ AI melayang): `claude.ai/artifact/1fV4RsgaSKPQxiZKutEYm9`
- Mockup 3 Peran (OPD / Walidata / Pembina): `claude.ai/artifact/42JweTZs2jED5bFfrCRsxX`
- Laporan Audit: `claude.ai/artifact/FWsEMRWhcZp1TyBZKEsjXe`

> Tautan privat — buka dengan akun pemilik, atau minta di-share. Implementasi mengikuti *maksud desain* di dokumen ini; mockup untuk referensi rasa & tata letak, bukan kode final.

---

## 1. Prinsip desain (berlaku global)
1. **Pimpinan bukan pembaca grafik.** Setiap halaman pengambilan keputusan dibuka dengan **narasi kalimat + status lampu lalu lintas**, grafik sebagai pendukung di bawah.
2. **Satu aksi utama per halaman**, ditonjolkan (tombol primer, warna brand, sticky bila perlu).
3. **POV pengguna**: tiap halaman menjawab “apa yang harus SAYA lakukan sekarang”.
4. **Kurangi beban navigasi**: menu per peran, modul belum siap ditandai, nama konsisten.

---

## 2. Perbaikan GLOBAL (lintas halaman) — prioritas tinggi

### 2.1 Modul placeholder → tandai “Segera”, non-aktifkan klik
Jangan tampilkan modul kosong seolah aktif. Beri badge `Segera` dan disable navigasi.
Modul placeholder saat ini: `Keuangan Daerah`, `Layanan Publik`, `Profil Data OPD`, `Fokus Kebijakan` (focuses), `Dataset` (datasets), `Profil Metadata` (metadata-profiles).

### 2.2 Nama kanonik (samakan sidebar = judul = breadcrumb)
| Kode sistem | Nama kanonik (pakai di SEMUA tempat) |
|---|---|
| `operations` | **Beranda Tugas** |
| `categories` | **Kategori** (bukan “Kelompok Isu” di satu tempat, “Kategori” di tempat lain — pilih satu) |
| `assistant` | **Asisten AI** |
| `indicators` | **Matriks Indikator** |
| `connectors` | **Ruang Walidata** |
| `reviews` | **Verifikasi Pelaporan OPD** |
| `submissions` | **Pelaporan Realisasi** |
| `publications` | **Kurasi & Publikasi** |
> Tetapkan satu label per `code` di satu sumber (mis. konfigurasi menu), dipakai konsisten oleh sidebar, judul halaman (`<title>`/header), dan breadcrumb.

### 2.3 Format tanggal tunggal
Pakai satu format di seluruh aplikasi: **`8 Okt 2026`** (tanggal) dan **`8 Okt 2026, 18.46`** (dengan waktu bila perlu). Hapus format `8/10/2026`. Buat satu util `formatTanggal()` dan pakai di semua tabel.

### 2.4 Sidebar per peran
Tampilkan hanya menu yang relevan untuk peran login. OPD operator tidak melihat menu Admin/Pimpinan. Satukan sub-item di bawah induk yang bisa diciutkan. (Menu sudah role-based via `/api/v1/me/menu` — pertegas pemangkasan per peran.)

### 2.5 Aksi penyelesaian menonjol
Di modal/halaman detail capaian, tombol aksi primer (`Kirim ke pemeriksa` / `Periksa & setujui` / `Kembalikan`) harus terlihat tanpa scroll — gunakan footer sticky.

### 2.6 Mobile
Tabel → kartu (sudah baik). Perbaiki bar filter/tab yang overflow: jadikan dapat digeser horizontal atau dropdown di layar sempit.

### 2.7 Label status relatif terhadap peran yang melihat (POV)
Label tahap/status harus sesuai sudut pandang pengguna, jangan generik.
- Alur indikator (asli sistem): **penyusun mengajukan → BAPPERIDA memeriksa → OPD penanggung jawab memverifikasi → BAPPERIDA mengaktifkan.**
- Dari **POV OPD** untuk indikator miliknya: tampilkan **“Perlu Anda verifikasi”** — JANGAN “Menunggu verifikasi OPD”.
- Dari **POV BAPPERIDA/Walidata**: tetap “Menunggu verifikasi OPD [nama OPD]” / “Perlu Anda aktifkan”.
- Prinsip umum: ganti kata peran dengan “Anda” bila pengguna yang login adalah peran tersebut.

---

## 3. Dashboard Pimpinan (route: `/dashboard`)
Acuan: mockup dashboard.

**Susunan dari atas ke bawah:**
1. **Ringkasan otomatis (narasi)** — 2–3 kalimat bahasa Indonesia + chip lampu lalu lintas (`X sesuai target` / `Y melambat` / `Z perlu perhatian`). Ditandai “dibuat Asisten AI”. Ada tautan “Tanya lebih lanjut” (membuka AI) dan catatan “rekomendasi lengkap: paket lanjutan”.
2. **Kartu sinyal** (4): Perlu perhatian, Tren membaik, Sesuai target, Cakupan kecamatan. Warna status + ikon.
3. **Grafik tren** Indeks Capaian Agregat (garis aktual + garis target RPJMD putus-putus). Skala tunggal, label target.
4. **Daftar “Indikator perlu perhatian”** dengan bar gap-ke-target + status.
5. **Peta kecamatan DASAR tertanam** (choropleth 17 kecamatan, hijau sekuensial). **Peta BUKAN menu terpisah** — hapus dari navigasi utama, tanam di sini. Kecamatan tanpa data ditampilkan netral.

**Empty state**: bila belum ada data publikasi, tampilkan pesan terarah (sudah ada di sistem — pertahankan).

---

## 4. AI Assistant — penempatan (KEPUTUSAN FINAL)
- **HANYA untuk peran Pimpinan.** Peran lain (OPD, Walidata, Pembina Data) **tidak** memiliki Asisten AI — baik di web maupun WA.
- **HAPUS “Asisten AI” dari menu sidebar.**
- **Tombol melayang** (floating action button) kanan-bawah, tampil di semua halaman web **saat login sebagai Pimpinan**. Indikator titik hijau “aktif” + label kecil “juga di WhatsApp”.
- Klik → **panel chat** (header, pertanyaan saran, input). Panel punya tombol **“Buka layar penuh”** → halaman penuh (riwayat, jawaban panjang, ekspor). Halaman penuh TIDAK dihapus, hanya pintu masuknya pindah ke tombol melayang.
- **Satu engine, banyak kanal**: WA bot (sudah ada), tombol web, halaman penuh — semua memakai mesin AI yang sama.
- Onboarding: tooltip sekali “Asisten AI sekarang di sini” menunjuk tombol melayang.
- Guardrail tetap: “hanya menjawab dari data resmi terpublikasi”.

---

## 5. Halaman per peran (route & isi)

### 5.1 OPD Operator — Pelaporan Realisasi (`/submissions`)
POV: *staf OPD ingin cepat selesai mengisi.*
**Menu OPD:** Beranda Tugas · Pelaporan Realisasi · **Matriks Indikator** · Profil Data OPD (`Segera`). Tanpa Asisten AI.
> Indikator **tidak** memakai menu baru "Usulan". OPD membuka menu yang sama **"Matriks Indikator"** (daftar + tombol "Tambah indikator"). Indikator yang ditambahkan OPD masuk sebagai **usulan lewat status/alur** (penyusun mengajukan → BAPPERIDA memeriksa → OPD memverifikasi → BAPPERIDA mengaktifkan), bukan menu terpisah. Nama menu tetap sama lintas peran (lihat §2.2).
- **Hero “aksi berikutnya”**: jumlah formulir perlu diisi + tombol primer `Isi laporan sekarang` + chip tenggat.
- **Panduan 3 langkah**: Isi nilai → Lampirkan bukti → Kirim.
- **Daftar “Laporan OPD saya”**: tiap baris punya status pill (`Perlu diisi` / `Menunggu pemeriksaan` / `Perlu diperbaiki` / `Disetujui`) + aksi per baris (`Lanjutkan` / `Perbaiki` / `Lihat`). Baris “perlu diperbaiki” menampilkan catatan pemeriksa.
- **Form isian**: field nilai + catatan + lampiran; **footer sticky** dengan `Simpan draf` dan `Kirim ke pemeriksa` (primer). Auto-save ditampilkan.

### 5.2 Walidata — Ruang Walidata & Verifikasi (`/connectors`, `/reviews`, `/publications`)
POV: *penjaga gerbang mutu data.*
- **Tiles**: Menunggu verifikasi / Dikembalikan / Siap ditayangkan.
- **Antrean pemeriksaan**: daftar capaian OPD + aksi `Kembalikan` / `Periksa & setujui` (primer).
- **Kesehatan sumber data**: daftar sumber (SIPD, Data Sektoral OPD, Kode Wilayah Kecamatan) + status (`Aktif` / `Perlu disetel`). Kode kecamatan belum tersambung → peta nonaktif (jelaskan).
- **Gerbang publikasi**: stepper Buat draf → Pilih capaian → Periksa & tayangkan + tombol `Susun publikasi`.

### 5.3 Pembina Data (BPS) — (peran/route baru bila belum ada)
POV: *memberi pembinaan mutu, bukan memutuskan.*
- **Banner peran**: “Catatan BPS bersifat pembinaan; tidak mengubah nilai/status otomatis. Keputusan di Walidata & OPD.”
- **Tiles**: Metadata lengkap (x/69), Metode perlu ditinjau, Menunggu pembinaan.
- **Antrean pembinaan**: indikator + jenis masalah (`Metode` / `Metadata` / `Baik`) + aksi `Beri catatan`.
- **Composer rekomendasi**: textarea + `Kirim rekomendasi pembinaan`. Catatan dikirim ke Walidata & OPD, **bersifat saran** (non-binding). Konsisten dengan field “Rekomendasi Pembina Data Statistik” yang sudah ada.

---

## 6. Strategi fitur: GRATIS vs BERBAYAR (gating)
Garis pemisah = tangga analitik. **Deskriptif = gratis. Diagnostik/Prediktif/Preskriptif = berbayar.**

### 6.1 Standar (gratis — WAJIB tetap berguna)
Angka capaian, tren, indikator perlu perhatian (flag sederhana), peta kecamatan dasar, ringkasan narasi dasar, Asisten AI dasar (batasi, mis. 5 pertanyaan/hari).

### 6.2 Master Key (berbayar — panel TETAP TAMPIL dengan gembok + CTA “Buka paket”)
Implementasi: render panel, tampilkan teaser, kunci isi penuh di belakang flag `feature.premium.<kode>`. Jangan sembunyikan — gembok yang terlihat adalah alat jual.
1. `proyeksi` — Proyeksi & Peringatan Dini RPJMD (akan tercapai 2029?)
2. `rekomendasi` — Mesin Rekomendasi Keputusan (OPD mana, anggaran ke mana)
3. `narasi` — Narasi & Briefing Otomatis (bahan pidato/laporan, ekspor)
4. `benchmark` — Benchmark Antar-Daerah (peringkat; butuh data luar)
5. `geo_equity` — Geo-analitik Pemerataan antar-kecamatan
6. `whatif` — Simulasi What-if (geser anggaran → proyeksi indikator)
7. `ai_full` — Asisten AI percakapan penuh + push peringatan dini via WA

> **Arsitektur**: pisahkan “mesin” (logika proyeksi/rekomendasi/narasi/benchmark/geo/simulasi) dari “tampilan”. Mesin di belakang feature flag/lisensi. Ini melindungi IP andalan dan memungkinkan penjualan per daerah.

---

## 7. Catatan teknis & keputusan terbuka
- Peta kecamatan menunggu **kode wilayah kecamatan** tersambung; sampai itu, peta tampil tingkat kabupaten + pesan status.
- Data tanggal di API tampaknya beragam → normalisasi di frontend via `formatTanggal()`.
- Semua panel premium butuh **feature flag** per organisasi/langganan.
- Tidak perlu `ai-memory` atau tooling memori lintas-agen untuk handoff ini; dokumen ini + `AGENTS.md`/`CLAUDE.md` sudah cukup. Pertimbangkan `ai-memory` hanya bila kerja multi-agen jadi rutin jangka panjang.

## 8. Design tokens (samakan dengan mockup)
```
brand (teal)      #0f6d54   brand-2 #13886a   brand-soft #e3f1ec
nav (slate)       #16304f
status good       #0f6d54   warn #b7791f   crit #c0392b   info #2f6fb0
premium (gold)    #9a6a12   gold-soft #f8efd8
ink #16233b · ink-2 #44546e · muted #7a8699 · line #dde3ea · surface #ffffff · bg #eef1f5
font display: Barlow Semi Condensed · body: Inter
```
Dukung light & dark (token diredefinisi untuk dark). Tanggal & angka pakai `tabular-nums`.

---
*Disusun dari audit 21 halaman dev.sababuka.com + sesi desain. Sumber kebenaran untuk implementasi redesign.*
