# CLAUDE.md - Panduan Claude Code untuk SABABUKA

Panduan ini berlaku untuk seluruh repository dan sengaja diselaraskan dengan `AGENTS.md`. Jika salah satunya diperbarui karena perubahan arsitektur atau kebijakan kerja, perbarui keduanya.

## Rencana kerja aktif

Sebelum melanjutkan perbaikan hasil audit November 2026, baca `docs/29-rencana-penyelesaian-kesenjangan-2026-11-21.md` dan `docs/30-rencana-penyederhanaan-peran-ui-dan-chat-bupati-2026-11-21.md`. Dokumen 30 menjadi sumber utama untuk perubahan role, Bank Data BPS, Dashboard Analisis BAPPERIDA, dan chat Bupati. Jangan mengubah kode untuk fase berikutnya sebelum kriteria fase aktif terpenuhi dan status dokumen diperbarui.

## Konteks proyek

**SABABUKA BERSINAR** adalah sistem full-stack Kabupaten Kapuas untuk indikator RPJMD, pelaporan OPD, verifikasi dan Dashboard Analisis BAPPERIDA, pembinaan statistik BPS, publikasi, serta Tanya Sababuka untuk Bupati.

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
- Bank Data punya menu sendiri untuk BAPPERIDA, BPS, dan Developer. BPS hanya memantau data dan memberikan catatan pembinaan, tanpa mengubah nilai. Bupati dan OPD tidak memiliki menu Bank Data (keputusan pemilik, 21 Nov 2026).
- Pemetaan sumber atau Seri Data ke indikator RPJMD sepenuhnya tugas BAPPERIDA. Developer hanya mengatur sumber, rahasia konektor, pratinjau, impor manual, dan riwayat impor. Jangan memberikan fungsi mapping kepada Developer atau OPD (keputusan pemilik, 21 Nov 2026).
- Variabel BPS yang dimensi utamanya kategori (mis. PDRB menurut lapangan usaha) diimpor per kategori sebagai seri tingkat kabupaten (`bank-series.ts`); variabel per kecamatan atau kabupaten tidak berubah.
- Hasil tindakan (berhasil, gagal, perhatian) tampil sebagai toast (`toast.ts`, `ToastHost`), bukan lencana di atas halaman. Token CSRF per tab dipulihkan lewat `POST /auth/csrf` (header `X-SABABUKA-Client: web`) bila hilang atau usang (keputusan pemilik, 18 Nov 2026).
- Impor Bank Data (BPS dan Satu Data) sepenuhnya manual oleh Developer lewat katalog impor di halaman Konektor dengan pratinjau metadata; sinkron otomatis dihapus (keputusan pemilik, 18 Nov 2026).
- Dashboard Eksekutif dipindahkan menjadi Dashboard Analisis BAPPERIDA. Struktur ringkasan, capaian target, wilayah, indikator, fokus kebijakan, dan lembar indikator dipertahankan sebagai alat analisis BAPPERIDA, bukan menu Bupati (keputusan pemilik, 21 Nov 2026).
- Setelah login, Bupati langsung masuk ke Tanya Sababuka dengan tampilan percakapan seperti ChatGPT. Bupati dapat membuat chat baru, membuka riwayat chat miliknya, mengganti judul, dan mengarsipkan chat. Riwayat tersimpan di server; penyimpanan lokal hanya untuk draf yang belum dikirim. Desktop memakai panel riwayat dan area percakapan, sedangkan ponsel memakai drawer riwayat dan composer yang aman terhadap safe area. Jawaban menampilkan narasi, angka, tabel, grafik, dan sumber di dalam percakapan agar Bupati tidak perlu bolak-balik ke dashboard (keputusan pemilik, 21 Nov 2026).
- Dashboard Analisis BAPPERIDA beralur runut: Ringkasan membuka dengan narasi berbasis angka dan tiga status yang dapat memfilter indikator. Wilayah memuat ringkasan kecamatan dan daftar indikator penyusunnya. Lembar indikator berurutan: Narasi data, Capaian, Tren, Tabulasi, Spasial, Sumber, Keterkaitan lintas OPD, dan Rekomendasi kepada OPD. Status capaian dipisah dari status tren. Peta kecamatan tetap berbentuk peta di kiri dan rincian di kanan, serta lembar bawah pada ponsel. Alur berhenti pada rekomendasi sistem kepada OPD; jangan menambah konfirmasi atau tanggapan OPD tanpa keputusan baru.
- Matriks RPJMD dan analisis silang (migration 085): tabel `indicator_matrix_meta` dan `indicator_responsible_opd` menyimpan OPD utama dan pendukung, level, halaman, serta sumber resmi dari lembar kerja matriks. Fokus kebijakan dan kelompok isu memakai `policy_focuses` dan `categories`; pengelompokan adalah hasil analisis, bukan klasifikasi resmi RPJMD. Dashboard Analisis BAPPERIDA punya tab Fokus kebijakan dan Lembar indikator memuat Keterkaitan lintas OPD sebelum Rekomendasi kepada OPD. Analisis silang membandingkan indikator hanya pada tahun yang sama, memakai korelasi peringkat hanya bila minimal 5 tahun data bersama, tidak pernah menyebut sebab-akibat, dan menyebut kecamatan prioritas hanya bila ada data kecamatan. BAPPERIDA saja yang dapat memvalidasi, mengecualikan, atau memulihkan keterkaitan usulan sistem serta mengatur OPD utama dan pendukung. Tindakan tetap tercatat di audit dan tidak mengubah pemilik pelaporan indikator.
- Warna dashboard (keputusan pemilik, 18 Nov 2026): hijau untuk tercapai atau membaik, merah untuk belum tercapai atau memburuk (lencana `danger`), abu untuk belum dinilai. Legenda berupa strip `InlineLegend` di dalam card yang memakainya, tanpa legenda global di dasar halaman dan tanpa tooltip. Peta kecamatan berwarna merah ke hijau dengan dua mode: Kondisi (indikator unggul dikurangi yang perlu perhatian) dan Pertumbuhan (indikator membaik dikurangi memburuk), dihitung di `district-summary-service.ts`.
- Peta kecamatan (keputusan pemilik, 17 Nov 2026): satu-satunya peta ada di Dashboard Eksekutif (bagian Peta kecamatan, endpoint `/executive/districts`); menu "Analisis Indikator" dihapus (keputusan pemilik, 18 Nov 2026, migration 084): tren, tabulasi, spasial, sumber, dan rekomendasi per indikator ada di Lembar indikator Dashboard Eksekutif, rekonsiliasi sumber di Konsolidasi Sumber, dan grup menu Bank Data berlabel Data konteks. Seri dengan nilai di minimal 8 kecamatan dihitung otomatis dari asal apa pun; target tingkat kecamatan, bila kelak ada, otomatis menghasilkan status tercapai atau belum tercapai.
- Usulan indikator OPD yang sedang direview dapat dikembalikan BAPPERIDA dengan alasan (aksi `return`, izin `indicator.approve`, alasan min. 10 karakter): status kembali ke draf, alasan tampil di indikator dan dikirim sebagai notifikasi, lalu pengaju memperbaiki dan mengajukan ulang (keputusan pemilik, 18 Nov 2026).
- Koreksi capaian terbit (keputusan pemilik, 17 Nov 2026): BAPPERIDA dapat "Buka kembali untuk revisi" pada pelaporan berstatus approved (aksi `reopen`, izin `submission.return`, alasan wajib min. 10 karakter). Publikasi aktif ditarik, status kembali ke returned, nilai lama disimpan di audit, lalu OPD mengirim ulang dan BAPPERIDA menyetujui kembali (terbit sebagai versi baru). Indikator yang belum diisi dapat dibuka satu per satu (tanpa menarik publikasi; tabel `submission_open_indicators`, migration 079): OPD hanya mengisi indikator yang dibuka. Pengiriman sebagian (minimal satu indikator terisi) diizinkan.
- Pengecualian Bank Data: Developer dapat memilih variabel BPS atau tabel Satu Data dari katalog, memeriksa pratinjau metadata dan nilai, lalu menjalankan impor manual ke seri `origin_type = bank_data`. Impor tidak menjadi realisasi resmi OPD dan wajib berlabel "Bank Data · belum diverifikasi" sampai ditetapkan melalui alur yang berwenang. BPS dapat memberikan catatan pembinaan tanpa mengubah nilai. Tahun sumber 1990-2035 dan tidak dikunci pada periode jabatan.
- Bukti dukung pelaporan OPD dihapus dari fitur (keputusan pemilik, 24 Nov 2026): tidak ada unggah, unduh, atau daftar berkas pada form capaian karena memberatkan server dan datanya umumnya sama. Endpoint `/submissions/:id/evidence*` dihapus; tabel `submission_evidence` dan berkas lama tidak dihapus agar riwayat aman. Pemeriksa menilai dari nilai, sumber, dan catatan. Dokumen acuan Profil OPD (RPJMD atau Renstra) tidak termasuk dan tetap ada.
- Angka yang tampil harus sama dengan yang dimasukkan (keputusan pemilik, 24 Nov 2026): kolom numeric(30,10) dikirim sebagai teks dengan nol di belakang, jadi isian ulang memakai `trimNumericText` dan tampilan memakai `formatStoredNumber` (`frontend/src/utils/number-format.ts`), tanpa pembulatan ke 4 digit.
- Akun uji per peran (permintaan pemilik, 24 Nov 2026, migration 090): `uji.opd` (Diskominfosantik, akun tambahan), `uji.bapperida`, `uji.bps`, `uji.bupati` dengan email `<nama>@sababuka.test`, untuk uji tampilan dan uji penetrasi. Tanpa akun Developer. Kata sandi hanya dipegang pemilik di luar repo, tidak wajib ganti saat masuk pertama. Nonaktifkan setelah pengujian: `UPDATE sababuka.users SET status = 'suspended' WHERE email LIKE 'uji.%@sababuka.test'`.
- Kondisi dan perkembangan OPD di Tanya Sababuka (permintaan pemilik, 24 Nov 2026, migration 091): alat `kondisi_opd` (`backend/src/services/opd-performance.ts`) menghitung skor 0-100 per OPD penanggung jawab utama dari data terbit: capaian terhadap target (bobot 50), arah tren (30), kelengkapan realisasi (20). Skor hanya untuk OPD dengan minimal 3 indikator bertarget dan satu realisasi terbit; kondisi baik (75+), cukup (55-74), perlu perhatian (35-54), perlu pembinaan (di bawah 35). Jawaban menjadi bahan evaluasi (kekuatan, kelemahan, indikator tertinggal, realisasi belum terbit, langkah pembinaan), tanpa menyimpulkan penyebab atau kelalaian OPD, dan bukan penilaian kinerja resmi. Hanya data disetujui dan terbit yang dipakai (status draf atau review tidak dibaca). Migration 091 menghapus seluruh riwayat chat lama sekali saja.
- Pertahankan RBAC, pemisahan kewenangan, provenance, audit trail, serta aturan bahwa jawaban Tanya Sababuka untuk Bupati hanya membaca data yang disetujui dan dipublikasikan.
- Pemantauan kredit model AI (permintaan pemilik, 19 Nov 2026): kunci API Anthropic diatur Developer di halaman Sistem, panel Model AI. Setiap panggilan nyata mencatat kondisinya di `system_settings` (`assistant.llm_health`: ok, credit_exhausted, invalid_key, error); saat berubah menjadi bermasalah Developer menerima notifikasi satu kali dan panel menampilkan peringatan. Tanpa perubahan pada peran atau konteks jawaban asisten.
- Logo resmi SABABUKA BERSINAR (permintaan pemilik, 19 Nov 2026): berkas PNG dari aset logo pemilik di `frontend/public/brand/` (logo horizontal terang dan gelap, lambang) dan `frontend/public/icons/`, `favicon-32.png`, `favicon.ico`; komponen `SababukaLockup` dan `SababukaMark` di `frontend/src/branding/SababukaBrand.tsx`, gaya di `brand.css`. Logo SVG lama dihapus. Jangan mengubah warna atau bentuk logo.
- Halaman depan sebelum masuk (permintaan pemilik, 19 Nov 2026; mockup disetujui): pengunjung tanpa sesi yang membuka `/` melihat `LandingPage` (logo, tagline, foto di kiri dan teks di kanan, nama Bupati H.M. Wiyatno, S.P. dan Wakil Bupati Dodo, S.P., tombol Masuk ke `/login`); alamat lain tanpa sesi tetap diarahkan ke `/login`, pengguna yang sudah masuk dari `/` langsung ke halaman peran. Foto resmi di `frontend/public/brand/`; ganti bila pimpinan berganti.
- Autentikasi hanya email/username dan kata sandi. MFA (TOTP/recovery code) sengaja dihapus atas keputusan pemilik (10 Nov 2026, migration 057); jangan menambahkannya kembali tanpa permintaan pemilik.
- Fitur Keuangan Daerah dan Layanan Publik dihapus atas keputusan pemilik (17 Nov 2026, migration 074); jangan menambahkannya kembali tanpa permintaan pemilik.
- Developer (superadmin) dapat "Bertindak sebagai" BAPPERIDA, BPS, Bupati, atau OPD tertentu dengan wewenang penuh. Diskominfosantik dipilih sebagai OPD, bukan role tersendiri. Aksi tercatat atas nama akun Developer asli dengan `metadata.acting_as` di audit. Aturan pemisahan petugas tidak berlaku bagi Developer dan tetap berlaku bagi pengguna lain.
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
