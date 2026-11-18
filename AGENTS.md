# AGENTS.md - Panduan Agen SABABUKA

Panduan ini berlaku untuk seluruh repository dan harus dibaca oleh Codex atau agen koding lain sebelum mengubah kode.

## Tentang proyek

**SABABUKA BERSINAR** adalah sistem analisis data Kabupaten Kapuas untuk tata kelola indikator RPJMD, pelaporan OPD, verifikasi BAPPERIDA, pembinaan statistik, publikasi, serta dashboard Bupati.

Arsitektur yang berjalan saat ini:

- `frontend/`: React 19, TypeScript, Vite, Source Sans 3, dan Lucide.
- `backend/`: Fastify, TypeScript, PostgreSQL/PostGIS, autentikasi, RBAC, dan audit trail.
- `backend/database/migrations/`: migration SQL berurutan; jangan mengubah migration yang sudah diterapkan.
- `docs/api/openapi.yaml`: kontrak API; tipe frontend hasil generate berada di `frontend/src/generated/`.
- Bahasa antarmuka dan dokumentasi pengguna: Bahasa Indonesia.

Repository ini bukan lagi aplikasi statis dan tidak sedang dimigrasikan ke Next.js. Jangan memakai struktur aplikasi demo lama sebagai acuan implementasi.

## Sumber kebenaran

1. Kode, migration, OpenAPI, dan pengujian pada branch aktif adalah sumber kebenaran teknis.
2. `docs/SABABUKA_REDESIGN_SPEC.md` adalah arah produk dan UI/UX hasil audit Claude. Baca sebelum mengubah frontend.
3. Bila spesifikasi menyebut modul sebagai placeholder tetapi modul tersebut sudah berfungsi pada kode terbaru, pertahankan fungsi yang ada dan perbarui dokumentasinya; jangan menonaktifkan fitur hanya karena catatan lama.
4. Keputusan pengguna terbaru mengungguli catatan lama. Jaga `AGENTS.md` dan `CLAUDE.md` tetap selaras ketika arsitektur atau aturan kerja berubah.

## Menjalankan dan memeriksa

Gunakan Node.js 22+ dan pnpm 11.

```bash
# frontend
cd frontend
pnpm check
pnpm build

# backend
cd backend
pnpm check
pnpm test:e2e

# perubahan kontrak API
cd frontend
pnpm api:types
pnpm api:types:check
```

Untuk pengembangan lokal, jalankan `pnpm dev` masing-masing dari `backend/` dan `frontend/`. Frontend memakai port 5173 dan mem-proxy `/api` ke backend pada port 3001.

## Aturan perubahan

- Pertahankan perubahan pengguna yang tidak berkaitan dan periksa working tree sebelum mengedit.
- Perubahan database harus berupa migration baru, didahului backup, aman dijalankan ulang bila memungkinkan, dan diverifikasi setelah diterapkan.
- OPD mengusulkan dan mengisi indikator secara manual; jangan mengubahnya menjadi auto-generate atau semiotomatis tanpa keputusan produk baru.
- Bank Data punya menu sendiri (migration 082) untuk BAPPERIDA, Walidata Diskominfosantik, dan Developer; Bupati dan OPD tidak (keputusan pemilik, 18 Nov 2026).
- Pemetaan sumber ke indikator adalah tugas BAPPERIDA: izin `connector.map` (migration 083) untuk BAPPERIDA dan Developer mencakup menyusun dan menyetujui mapping, tautan Seri Data, pencarian kandidat, saran riwayat, pratinjau staging, dan registri sumber OPD. Impor, aktivasi aliran, rahasia konektor, dan Bank Data tetap Developer (`connector.manage`) (keputusan pemilik, 18 Nov 2026).
- Impor Bank Data (BPS dan Satu Data) sepenuhnya manual oleh Developer lewat katalog impor di halaman Konektor dengan pratinjau metadata; sinkron otomatis dihapus (keputusan pemilik, 18 Nov 2026).
- Dashboard Eksekutif memakai empat tab (Ringkasan, Capaian target, Peta kecamatan, Semua indikator); peta kecamatan berbentuk peta di kiri dan rincian di kanan (lembar bawah di ponsel) agar reaksi klik langsung terlihat (keputusan pemilik, 18 Nov 2026).
- Peta kecamatan (keputusan pemilik, 17 Nov 2026): satu-satunya peta ada di Dashboard Eksekutif (bagian Peta kecamatan, endpoint `/executive/districts`); menu "Analisis Indikator" tanpa peta. Seri dengan nilai di minimal 8 kecamatan dihitung otomatis dari asal apa pun; target tingkat kecamatan, bila kelak ada, otomatis menghasilkan status tercapai atau belum tercapai.
- Usulan indikator OPD yang sedang direview dapat dikembalikan BAPPERIDA dengan alasan (aksi `return`, izin `indicator.approve`, alasan min. 10 karakter): status kembali ke draf, alasan tampil di indikator dan dikirim sebagai notifikasi, lalu pengaju memperbaiki dan mengajukan ulang (keputusan pemilik, 18 Nov 2026).
- Koreksi capaian terbit (keputusan pemilik, 17 Nov 2026): BAPPERIDA dapat "Buka kembali untuk revisi" pada pelaporan berstatus approved (aksi `reopen`, izin `submission.return`, alasan wajib min. 10 karakter). Publikasi aktif ditarik, status kembali ke returned, nilai lama disimpan di audit, lalu OPD mengirim ulang dan BAPPERIDA menyetujui kembali (terbit sebagai versi baru). Indikator yang belum diisi dapat dibuka satu per satu (tanpa menarik publikasi; tabel `submission_open_indicators`, migration 079): OPD hanya mengisi indikator yang dibuka. Pengiriman sebagian (minimal satu indikator terisi) diizinkan.
- Pengecualian Bank Data (permintaan pemilik, 14 Nov 2026): Developer dapat mengimpor massal variabel BPS dan tabel Satu Data menjadi indikator `origin_type = bank_data` yang langsung aktif dan terbit tanpa verifikasi OPD/BAPPERIDA. Semuanya wajib berlabel "Bank Data · belum diverifikasi" dan direvisi OPD/BAPPERIDA bila ada selisih. Tahun konektor 1990-2035 (tidak dikunci pada periode jabatan).
- Data Bupati hanya boleh berasal dari data yang disetujui dan dipublikasikan. Pertahankan RBAC, pemisahan kewenangan, provenance, dan audit trail.
- Autentikasi hanya email/username dan kata sandi. MFA (TOTP/recovery code) sengaja dihapus atas keputusan pemilik (10 Nov 2026, migration 057); jangan menambahkannya kembali tanpa permintaan pemilik.
- Fitur Keuangan Daerah dan Layanan Publik dihapus atas keputusan pemilik (17 Nov 2026, migration 074); jangan menambahkannya kembali tanpa permintaan pemilik.
- Developer (superadmin) dapat "Bertindak sebagai" BAPPERIDA, Diskominfosantik, BPS, Bupati, atau OPD tertentu dengan wewenang penuh (permintaan pemilik, 12 Nov 2026; sebelumnya mode pratinjau hanya baca). Aksi tercatat atas nama akun Developer asli dengan `metadata.acting_as` di audit. Aturan pemisahan petugas (pengaju/reviewer/verifikator yang sama) tidak berlaku bagi Developer (keputusan pemilik, 12 Nov 2026); tetap berlaku bagi pengguna lain.
- Nilai beda antarsumber tidak pernah dipilih otomatis: ditandai konflik, ditetapkan BAPPERIDA/OPD pemilik (menu Konsolidasi Sumber); nilai identik dari sumber berbeda tetap dua baris bersumber (lihat `docs/external-connectors.md`).
- Jangan commit secret, dump database, hasil ekspor privat, cache audit, atau artefak build.
- Perubahan UI wajib menjaga aksesibilitas, state loading/empty/error, serta diuji pada desktop, tablet, dan mobile.
- Pakai util tanggal bersama dengan zona waktu aplikasi; jangan menambah format tanggal lokal yang baru.
- Untuk perubahan UI besar, gunakan branch dan pull request. Perbaikan terverifikasi yang diminta langsung dapat masuk ke branch utama sesuai arahan pemilik.
- Pesan commit ringkas dan deskriptif dalam Bahasa Indonesia atau mengikuti konvensi commit repository.

## Prinsip UI/UX inti

- Halaman keputusan dibuka dengan narasi dan status yang mudah dipahami; grafik menjadi bukti pendukung.
- Tonjolkan satu aksi utama sesuai peran dan tahap workflow.
- Setiap halaman harus menjawab tindakan pengguna berikutnya.
- Menu mengikuti role dan permission dari backend; jangan menampilkan rute yang tidak didukung.
- Tombol approve, verifikasi, kirim, dan kembalikan harus mudah ditemukan serta tetap mematuhi kewenangan backend.
- Pertahankan identitas visual pemerintah Kabupaten Kapuas dan konsistensi token di `frontend/src/ui-system.css` serta `frontend/src/styles.css`.

## Repository dan sinkronisasi

Repository pribadi pemilik adalah sumber utama. Repository organisasi adalah mirror. Sebelum push, pastikan remote lokal menunjuk ke tujuan yang benar, hindari force-push tanpa cadangan branch, dan verifikasi hash commit remote setelah sinkronisasi.

## Gaya teks dan tampilan (keputusan pemilik, 15 Nov 2026)

- Jangan memakai tanda pisah panjang (em dash) atau sedang (en dash) di teks apa pun: antarmuka, pesan galat, nama indikator hasil impor, jawaban asisten, prompt, dokumentasi, dan komentar. Pakai tanda hubung biasa (-), koma, titik dua, atau titik. Rentang ditulis 2018-2023. Backend membersihkan keluaran lewat `plainDash` (`backend/src/services/plain-text.ts`) dan frontend lewat `plain` (`frontend/src/text.ts`); impor baru wajib menulis tanda hubung biasa.
- Jangan memakai garis aksen berwarna di sisi kartu, panel, atau kutipan (border-left atau border-top tebal, box-shadow inset). Tandai status dengan lencana, ikon, atau latar tipis.
- Jawaban asisten ditulis seperti paparan analis kepada Bupati: baku, ringkas, berbasis angka, tanpa basa-basi dan emoji.

## Skill bersama

Skill proyek disimpan di `.claude/skills/` dan dipakai bersama oleh Codex dan Claude agar penilaian UI konsisten. Codex dapat membacanya langsung dari folder ini.

- `impeccable`: audit, critique, polish, dan hardening antarmuka (hierarki, aksesibilitas, responsive, state kosong dan galat). Konteks produknya ada di `PRODUCT.md`.
- `webapp-testing`: uji aplikasi lokal dengan Playwright (tangkapan layar desktop, tablet, mobile, log browser). Jalankan backend port 3001 dan frontend port 5173 lebih dulu.

Hasil audit yang berupa tangkapan layar atau cache alat (`.impeccable/`) tidak di-commit.
