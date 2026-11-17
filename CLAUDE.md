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
- Koreksi capaian terbit (keputusan pemilik, 17 Nov 2026): BAPPERIDA dapat "Buka kembali untuk revisi" pada pelaporan berstatus approved (aksi `reopen`, izin `submission.return`, alasan wajib min. 10 karakter). Publikasi aktif ditarik, status kembali ke returned, nilai lama disimpan di audit, lalu OPD mengirim ulang dan BAPPERIDA menyetujui kembali (terbit sebagai versi baru). Pengiriman sebagian (minimal satu indikator terisi) diizinkan.
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
