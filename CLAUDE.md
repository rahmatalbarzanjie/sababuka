# CLAUDE.md - Panduan Claude Code untuk SABABUKA

Panduan ini berlaku untuk seluruh repository dan sengaja diselaraskan dengan `AGENTS.md`. Jika salah satunya diperbarui karena perubahan arsitektur atau kebijakan kerja, perbarui keduanya.

## Konteks proyek

**SABABUKA BERSINAR** adalah sistem full-stack Kabupaten Kapuas untuk indikator RPJMD, pelaporan OPD, verifikasi BAPPERIDA, pembinaan statistik, publikasi, dan dashboard Bupati.

- Frontend: React 19 + TypeScript + Vite di `frontend/`.
- Backend: Fastify + TypeScript di `backend/`.
- Database: PostgreSQL/PostGIS dengan migration berurutan di `backend/database/migrations/`.
- Kontrak API: `docs/api/openapi.yaml`; tipe hasil generate: `frontend/src/generated/`.
- Bahasa UI: Bahasa Indonesia.

Repository ini bukan lagi build statis HTML/CSS/ES Modules dan tidak sedang menargetkan migrasi Next.js. Jangan mengembalikan arsitektur ke versi demo lama.

## Sumber kebenaran redesign

Baca `docs/SABABUKA_REDESIGN_SPEC.md` sebelum menyentuh UI. Dokumen tersebut menyimpan arah desain hasil audit dan mockup Claude, tetapi status implementasi harus selalu diverifikasi terhadap kode terbaru. Fitur yang sudah berjalan tidak boleh dinonaktifkan hanya karena pernah dicatat sebagai placeholder.

Prinsip inti:

1. Buka halaman keputusan dengan narasi dan status; grafik adalah pendukung.
2. Tonjolkan satu aksi utama sesuai peran.
3. Setiap halaman menjawab tindakan pengguna berikutnya.
4. Menu ditentukan oleh role dan permission backend.
5. Pertahankan aksesibilitas, responsive layout, serta loading, empty, dan error state.

## Perintah verifikasi

Gunakan Node.js 22+ dan pnpm 11.

```bash
cd frontend
pnpm check
pnpm build

cd ../backend
pnpm check
pnpm test:e2e
```

Jika OpenAPI berubah:

```bash
cd frontend
pnpm api:types
pnpm api:types:check
```

Pengembangan lokal memakai backend port 3001 dan frontend port 5173.

## Kebiasaan kerja

- Baca status Git dan pertahankan perubahan pengguna yang tidak berkaitan.
- Gunakan migration baru untuk perubahan skema; backup dan verifikasi database sebelum/selesai penerapan.
- OPD mengusulkan dan mengisi indikator secara manual, bukan auto-generate atau semiotomatis.
- Bank Data punya menu sendiri (migration 082) untuk BAPPERIDA, Walidata Diskominfosantik, dan Developer; Bupati dan OPD tidak (keputusan pemilik, 18 Nov 2026).
- Pemetaan sumber ke indikator adalah tugas BAPPERIDA: izin `connector.map` (migration 083) untuk BAPPERIDA dan Developer mencakup menyusun dan menyetujui mapping, tautan Seri Data, pencarian kandidat, saran riwayat, pratinjau staging, dan registri sumber OPD. Impor, aktivasi aliran, rahasia konektor, dan Bank Data tetap Developer (`connector.manage`) (keputusan pemilik, 18 Nov 2026).
- Variabel BPS yang dimensi utamanya kategori (mis. PDRB menurut lapangan usaha) diimpor per kategori sebagai seri tingkat kabupaten (`bank-series.ts`); variabel per kecamatan atau kabupaten tidak berubah.
- Hasil tindakan (berhasil, gagal, perhatian) tampil sebagai toast (`toast.ts`, `ToastHost`), bukan lencana di atas halaman. Token CSRF per tab dipulihkan lewat `POST /auth/csrf` (header `X-SABABUKA-Client: web`) bila hilang atau usang (keputusan pemilik, 18 Nov 2026).
- Impor Bank Data (BPS dan Satu Data) sepenuhnya manual oleh Developer lewat katalog impor di halaman Konektor dengan pratinjau metadata; sinkron otomatis dihapus (keputusan pemilik, 18 Nov 2026).
- Dashboard Eksekutif memakai empat tab (Ringkasan, Capaian target, Peta kecamatan, Semua indikator); peta kecamatan berbentuk peta di kiri dan rincian di kanan (lembar bawah di ponsel) agar reaksi klik langsung terlihat (keputusan pemilik, 18 Nov 2026).
- Dashboard Eksekutif beralur runut (keputusan pemilik, 18 Nov 2026; mockup disetujui): Beranda membuka dengan narasi positif dari angka (template, bukan kalimat bebas) dan tiga angka yang bisa diklik (Tercapai, Belum tercapai, Belum ada realisasi) ke tab Capaian terfilter; tab Peta kecamatan berlabel Wilayah. Lembar indikator berurutan: 1 Capaian, 2 Tren, 3 Tabulasi, 4 Spasial (peta kiri, rincian kanan), 5 Sumber, 6 Tindak lanjut. Status capaian (tercapai/belum tercapai) dipisah dari status tren (membaik/memburuk). Kolom Tindak lanjut hanya arahan baku sistem berlabel "Arahan sistem, belum tanggapan OPD" karena tanggapan OPD belum ada datanya; fitur tanggapan OPD (penyebab selisih, rencana percepatan, ditinjau BAPPERIDA) adalah pengembangan lanjut, bersama batas waktu pelaporan dan pengingat. Asisten punya alat `capaian_target` dan dilarang menyatakan OPD telah atau akan melakukan sesuatu.
- Warna dashboard (keputusan pemilik, 18 Nov 2026): hijau untuk tercapai atau membaik, merah untuk belum tercapai atau memburuk (lencana `danger`), abu untuk belum dinilai. Legenda berupa strip `InlineLegend` di dalam card yang memakainya, tanpa legenda global di dasar halaman dan tanpa tooltip. Peta kecamatan berwarna merah ke hijau dengan dua mode: Kondisi (indikator unggul dikurangi yang perlu perhatian) dan Pertumbuhan (indikator membaik dikurangi memburuk), dihitung di `district-summary-service.ts`.
- Peta kecamatan (keputusan pemilik, 17 Nov 2026): satu-satunya peta ada di Dashboard Eksekutif (bagian Peta kecamatan, endpoint `/executive/districts`); menu "Analisis Indikator" tanpa peta. Seri dengan nilai di minimal 8 kecamatan dihitung otomatis dari asal apa pun; target tingkat kecamatan, bila kelak ada, otomatis menghasilkan status tercapai atau belum tercapai.
- Usulan indikator OPD yang sedang direview dapat dikembalikan BAPPERIDA dengan alasan (aksi `return`, izin `indicator.approve`, alasan min. 10 karakter): status kembali ke draf, alasan tampil di indikator dan dikirim sebagai notifikasi, lalu pengaju memperbaiki dan mengajukan ulang (keputusan pemilik, 18 Nov 2026).
- Koreksi capaian terbit (keputusan pemilik, 17 Nov 2026): BAPPERIDA dapat "Buka kembali untuk revisi" pada pelaporan berstatus approved (aksi `reopen`, izin `submission.return`, alasan wajib min. 10 karakter). Publikasi aktif ditarik, status kembali ke returned, nilai lama disimpan di audit, lalu OPD mengirim ulang dan BAPPERIDA menyetujui kembali (terbit sebagai versi baru). Indikator yang belum diisi dapat dibuka satu per satu (tanpa menarik publikasi; tabel `submission_open_indicators`, migration 079): OPD hanya mengisi indikator yang dibuka. Pengiriman sebagian (minimal satu indikator terisi) diizinkan.
- Pengecualian Bank Data (permintaan pemilik, 14 Nov 2026): Developer dapat mengimpor massal variabel BPS dan tabel Satu Data menjadi indikator `origin_type = bank_data` yang langsung aktif dan terbit tanpa verifikasi OPD/BAPPERIDA. Semuanya wajib berlabel "Bank Data · belum diverifikasi" dan direvisi OPD/BAPPERIDA bila ada selisih. Tahun konektor 1990-2035 (tidak dikunci pada periode jabatan).
- Pertahankan RBAC, pemisahan kewenangan, provenance, audit trail, serta aturan bahwa dashboard Bupati hanya membaca data terpublikasi.
- Autentikasi hanya email/username dan kata sandi. MFA (TOTP/recovery code) sengaja dihapus atas keputusan pemilik (10 Nov 2026, migration 057); jangan menambahkannya kembali tanpa permintaan pemilik.
- Fitur Keuangan Daerah dan Layanan Publik dihapus atas keputusan pemilik (17 Nov 2026, migration 074); jangan menambahkannya kembali tanpa permintaan pemilik.
- Developer (superadmin) dapat "Bertindak sebagai" BAPPERIDA, Diskominfosantik, BPS, Bupati, atau OPD tertentu dengan wewenang penuh (permintaan pemilik, 12 Nov 2026; sebelumnya mode pratinjau hanya baca). Aksi tercatat atas nama akun Developer asli dengan `metadata.acting_as` di audit. Aturan pemisahan petugas (pengaju/reviewer/verifikator yang sama) tidak berlaku bagi Developer (keputusan pemilik, 12 Nov 2026); tetap berlaku bagi pengguna lain.
- Nilai beda antarsumber tidak pernah dipilih otomatis: ditandai konflik, ditetapkan BAPPERIDA/OPD pemilik (menu Konsolidasi Sumber); nilai identik dari sumber berbeda tetap dua baris bersumber (lihat `docs/external-connectors.md`).
- Jangan commit secret, dump database, ekspor privat, cache lokal, atau build output.
- Uji perubahan UI pada desktop, tablet, dan mobile.
- Perubahan UI besar menggunakan branch dan pull request kecuali pemilik meminta langsung ke branch utama.
- Repository pribadi pemilik adalah sumber utama; repository organisasi menjadi mirror. Verifikasi tujuan remote sebelum push.

Gunakan `frontend/src/ui-system.css` dan `frontend/src/styles.css` sebagai implementasi token visual yang berjalan. Keputusan pengguna terbaru mengungguli catatan lama, lalu dokumentasikan perubahan agar `AGENTS.md`, `CLAUDE.md`, dan spesifikasi tetap sinkron.

## Gaya teks dan tampilan (keputusan pemilik, 15 Nov 2026)

- Jangan memakai tanda pisah panjang (em dash) atau sedang (en dash) di teks apa pun: antarmuka, pesan galat, nama indikator hasil impor, jawaban asisten, prompt, dokumentasi, dan komentar. Pakai tanda hubung biasa (-), koma, titik dua, atau titik. Rentang ditulis 2018-2023. Backend membersihkan keluaran lewat `plainDash` (`backend/src/services/plain-text.ts`) dan frontend lewat `plain` (`frontend/src/text.ts`); impor baru wajib menulis tanda hubung biasa.
- Jangan memakai garis aksen berwarna di sisi kartu, panel, atau kutipan (border-left atau border-top tebal, box-shadow inset). Tandai status dengan lencana, ikon, atau latar tipis.
- Jawaban asisten ditulis seperti paparan analis kepada Bupati: baku, ringkas, berbasis angka, tanpa basa-basi dan emoji.

## Skill bersama

Skill proyek berada di `.claude/skills/` dan dipakai bersama dengan Codex (lihat `AGENTS.md`).

- `impeccable`: audit, critique, polish, dan hardening antarmuka; konteks produk ada di `PRODUCT.md`.
- `webapp-testing`: uji aplikasi lokal dengan Playwright untuk desktop, tablet, dan mobile.

Hasil audit berupa tangkapan layar atau cache alat (`.impeccable/`) tidak di-commit.
