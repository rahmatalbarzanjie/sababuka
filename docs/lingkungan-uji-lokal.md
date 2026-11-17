# Lingkungan uji lokal berisi salinan data produksi

Lingkungan ini dipakai untuk menguji tombol dan alur yang mengubah data (pelaporan OPD, verifikasi,
penerbitan) tanpa menyentuh produksi. Data diambil dari produksi dengan akses baca saja, lalu
diamankan: tanpa kata sandi, sesi, notifikasi, audit, rahasia konektor, dan email asli.

## Isi
- Database `sababuka_test` (PostgreSQL 16 + PostGIS di WSL Ubuntu), seluruh migration diterapkan lebih dulu.
- Data referensi dan nilai: organisasi, kategori, indikator, target, periode, observasi, publikasi, batch.
- Akun: email diganti `<peran>-<opd>-<4 hex>@uji.local`; `bupati@sababuka.com` dan `developer@sababuka.com`
  dipertahankan; akun Claude Ops menjadi `ops@uji.local`. Semua memakai kata sandi uji lokal yang sama.
- Tidak tersalin: tabel yang tidak dapat dibaca role baca-saja (`indicator_responsible_opd`,
  `indicator_series_links`, `bank_data_sync_*`, `system_secrets`), serta bukti dukung berkas.

## Menyiapkan
1. Pasang PostgreSQL: `apt install postgresql postgresql-16-postgis-3` di WSL, jaga WSL tetap hidup.
2. Buat role dan database lokal, aktifkan `postgis`, `pgcrypto`, `citext`.
3. Salin `backend/.env.example` menjadi `backend/.env.uji` (berkas `.env.*` tidak masuk git), isi `DATABASE_URL` lokal.
4. `pnpm db:migrate` dengan environment itu.
5. `tools/lingkungan-uji/muat-data-produksi.sh`: mengosongkan tabel data lokal lalu menyalin dari produksi (baca saja).
6. Jalankan `tools/lingkungan-uji/anonimkan-akun.sql` lewat `psql -v hash=<argon2id kata sandi uji>`.
7. Backend: `npx tsx src/server.ts`; frontend: `pnpm dev` (port 5173, proksi ke 3001).

Jangan pernah mengarahkan skrip ini ke database produksi sebagai tujuan; skrip hanya membaca dari produksi.
Salinan data lokal tidak boleh di-commit atau dibagikan.
