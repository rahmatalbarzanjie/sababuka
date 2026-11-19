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
- Variabel BPS yang dimensi utamanya kategori (mis. PDRB menurut lapangan usaha) diimpor per kategori sebagai seri tingkat kabupaten (`bank-series.ts`); variabel per kecamatan atau kabupaten tidak berubah.
- Hasil tindakan (berhasil, gagal, perhatian) tampil sebagai toast (`toast.ts`, `ToastHost`), bukan lencana di atas halaman. Token CSRF per tab dipulihkan lewat `POST /auth/csrf` (header `X-SABABUKA-Client: web`) bila hilang atau usang (keputusan pemilik, 18 Nov 2026).
- Impor Bank Data (BPS dan Satu Data) sepenuhnya manual oleh Developer lewat katalog impor di halaman Konektor dengan pratinjau metadata; sinkron otomatis dihapus (keputusan pemilik, 18 Nov 2026).
- Dashboard Eksekutif memakai empat bagian (Ringkasan, Capaian target, Peta kecamatan, Semua indikator; kini dipilih lewat menu atas portal, lihat butir berikutnya); peta kecamatan berbentuk peta di kiri dan rincian di kanan (lembar bawah di ponsel) agar reaksi klik langsung terlihat (keputusan pemilik, 18 Nov 2026).
- Tampilan Bupati bergaya portal (keputusan pemilik, 19 Nov 2026; `frontend/src/portal.css`, `auth.css`, `portalNav.ts`; hanya peran Bupati lewat kelas `.workspace.portal`, peran lain tetap Source Sans 3 dan sidebar). Navigasi satu tingkat di bilah atas, tab bawah di layar sempit: Beranda, Wilayah, Indikator (chip Semua indikator, Tren terbaru, Fokus kebijakan), dan Tanya. Menu ini memetakan ke hash `/dashboard#ringkasan|peta|indikator|tren|fokus`, jadi bilah tab lama dihapus dan tautan lama tetap berlaku. Poppins, navy sebagai warna utama, oranye hanya untuk satu aksi utama (teks navy, bukan putih), kartu indikator berlabel sektor dan status. Mode aplikasi aktif dari APK (penanda `SABABUKA-Android`) atau `?mode=app`. Menu aksesibilitas (ukuran teks, mode gelap, kontras tinggi) khusus Bupati. Halaman masuk dan pendaftaran memakai gaya yang sama. Rincian di `PRODUCT.md`.
- Dashboard Eksekutif beralur runut (keputusan pemilik, 18 Nov 2026; mockup disetujui): Beranda membuka dengan narasi positif dari angka (template, bukan kalimat bebas) dan tiga angka yang bisa diklik (Tercapai, Belum tercapai, Belum ada realisasi) yang memfilter kartu indikator di Beranda (satu tampilan memuat indikator tercapai dan belum tercapai; menu Capaian dihapus, tautan lama #capaian membuka Beranda). Di Wilayah, ringkasan kecamatan memuat angka yang bisa dipilih (Unggul, Sedang, Perlu perhatian, Membaik, Stabil, Memburuk) dan daftar indikator yang menyusun angka itu, bukan daftar kecamatan tertinggi dan terendah. Lembar indikator dibuka dengan Narasi data (templat dari angka tersimpan, bukan kalimat bebas) sebelum bagian 1 Capaian; tab Peta kecamatan berlabel Wilayah. Lembar indikator berurutan: 1 Capaian, 2 Tren, 3 Tabulasi, 4 Spasial (peta kiri, rincian kanan), 5 Sumber, 6 Rekomendasi kepada OPD. Status capaian (tercapai/belum tercapai) dipisah dari status tren (membaik/memburuk). Alur berhenti pada rekomendasi sistem kepada OPD (keputusan pemilik, 18 Nov 2026: konfirmasi atau tanggapan OPD dihapus dari rencana; jangan menambahkannya tanpa permintaan pemilik). Asisten punya alat `capaian_target` dan dilarang menyatakan OPD telah atau akan melakukan sesuatu.
- Matriks RPJMD dan analisis silang (permintaan pemilik, 18-19 Nov 2026; migration 085): tabel `indicator_matrix_meta` dan `indicator_responsible_opd` menyimpan OPD utama dan pendukung, level, halaman, serta sumber resmi dari lembar kerja matriks. Fokus kebijakan dan kelompok isu memakai `policy_focuses` dan `categories`; pengelompokan adalah hasil analisis, bukan klasifikasi resmi RPJMD. Dashboard Eksekutif punya tab Fokus kebijakan (`/executive/focus`); Lembar indikator memuat bagian 6 Keterkaitan lintas OPD (`/executive/indicators/:id/cross-analysis`) sebelum 7 Rekomendasi kepada OPD. Analisis silang (`cross-analysis-service.ts`, alat asisten `analisis_silang` dan `ringkasan_fokus`) membandingkan indikator hanya pada tahun yang sama, memakai korelasi peringkat hanya bila minimal 5 tahun data bersama (tidak pernah disebut sebab-akibat), menyebut kecamatan prioritas hanya bila indikator punya data kecamatan, dan melabeli keterkaitan selain Tautan Seri Data sebagai usulan sistem yang belum divalidasi BAPPERIDA. Validasi relasi (permintaan pemilik, 19 Nov 2026; migration 086, tabel `indicator_relation_reviews`): BAPPERIDA dan Developer (izin `connector.map`) dapat memvalidasi, mengecualikan, atau memulihkan keterkaitan usulan sistem langsung di bagian Keterkaitan lintas OPD (`PUT /executive/indicators/:id/relations/:related_id`, tercatat di audit); keterkaitan yang divalidasi berlabel Divalidasi BAPPERIDA, yang dikecualikan tidak dipakai analisis dan rekomendasi. Perbandingan memakai tahun bersama terbaru kedua indikator, bukan tahun terbaru masing-masing. Relasi OPD utama dan pendukung per indikator diatur BAPPERIDA dan Developer (izin `connector.map`) di halaman Konektor, panel Relasi OPD per indikator (`GET/PUT /connectors/responsible-opd`, tercatat di audit `indicator.responsible_opd_set`); panel ini tidak mengubah pemilik pelaporan indikator dan mempertahankan dasar penetapan asal bila OPD dan perannya tidak berubah.
- Warna dashboard (keputusan pemilik, 18 Nov 2026): hijau untuk tercapai atau membaik, merah untuk belum tercapai atau memburuk (lencana `danger`), abu untuk belum dinilai. Legenda berupa strip `InlineLegend` di dalam card yang memakainya, tanpa legenda global di dasar halaman dan tanpa tooltip. Peta kecamatan berwarna merah ke hijau dengan dua mode: Kondisi (indikator unggul dikurangi yang perlu perhatian) dan Pertumbuhan (indikator membaik dikurangi memburuk), dihitung di `district-summary-service.ts`.
- Peta kecamatan (keputusan pemilik, 17 Nov 2026): satu-satunya peta ada di Dashboard Eksekutif (bagian Peta kecamatan, endpoint `/executive/districts`); menu "Analisis Indikator" dihapus (keputusan pemilik, 18 Nov 2026, migration 084): tren, tabulasi, spasial, sumber, dan rekomendasi per indikator ada di Lembar indikator Dashboard Eksekutif, rekonsiliasi sumber di Konsolidasi Sumber, dan grup menu Bank Data berlabel Data konteks. Seri dengan nilai di minimal 8 kecamatan dihitung otomatis dari asal apa pun; target tingkat kecamatan, bila kelak ada, otomatis menghasilkan status tercapai atau belum tercapai.
- Usulan indikator OPD yang sedang direview dapat dikembalikan BAPPERIDA dengan alasan (aksi `return`, izin `indicator.approve`, alasan min. 10 karakter): status kembali ke draf, alasan tampil di indikator dan dikirim sebagai notifikasi, lalu pengaju memperbaiki dan mengajukan ulang (keputusan pemilik, 18 Nov 2026).
- Koreksi capaian terbit (keputusan pemilik, 17 Nov 2026): BAPPERIDA dapat "Buka kembali untuk revisi" pada pelaporan berstatus approved (aksi `reopen`, izin `submission.return`, alasan wajib min. 10 karakter). Publikasi aktif ditarik, status kembali ke returned, nilai lama disimpan di audit, lalu OPD mengirim ulang dan BAPPERIDA menyetujui kembali (terbit sebagai versi baru). Indikator yang belum diisi dapat dibuka satu per satu (tanpa menarik publikasi; tabel `submission_open_indicators`, migration 079): OPD hanya mengisi indikator yang dibuka. Pengiriman sebagian (minimal satu indikator terisi) diizinkan.
- Pengecualian Bank Data (permintaan pemilik, 14 Nov 2026): Developer dapat mengimpor massal variabel BPS dan tabel Satu Data menjadi indikator `origin_type = bank_data` yang langsung aktif dan terbit tanpa verifikasi OPD/BAPPERIDA. Semuanya wajib berlabel "Bank Data · belum diverifikasi" dan direvisi OPD/BAPPERIDA bila ada selisih. Tahun konektor 1990-2035 (tidak dikunci pada periode jabatan).
- Data Bupati hanya boleh berasal dari data yang disetujui dan dipublikasikan. Pertahankan RBAC, pemisahan kewenangan, provenance, dan audit trail.
- Pemantauan kredit model AI (permintaan pemilik, 19 Nov 2026): kunci API Anthropic diatur Developer di halaman Sistem, panel Model AI. Setiap panggilan nyata mencatat kondisinya di `system_settings` (`assistant.llm_health`: ok, credit_exhausted, invalid_key, error); saat berubah menjadi bermasalah Developer menerima notifikasi satu kali dan panel menampilkan peringatan. Tanpa perubahan pada peran atau konteks jawaban asisten.
- Logo resmi SABABUKA BERSINAR (permintaan pemilik, 19 Nov 2026): berkas PNG dari aset logo pemilik di `frontend/public/brand/` (logo horizontal terang dan gelap, lambang) dan `frontend/public/icons/`, `favicon-32.png`, `favicon.ico`; komponen `SababukaLockup` dan `SababukaMark` di `frontend/src/branding/SababukaBrand.tsx`, gaya di `brand.css`. Logo SVG lama dihapus. Jangan mengubah warna atau bentuk logo.
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
