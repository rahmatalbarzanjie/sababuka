# Rencana Penyelesaian Kesenjangan SABABUKA

Tanggal penyusunan: 21 November 2026  
Status: rencana disetujui untuk ditinjau, belum ada perubahan kode aplikasi  
Pemilik keputusan produk: Pemilik SABABUKA  
Pelaksana teknis berikutnya: Codex atau Claude Code

> Keputusan produk terbaru mengenai penghapusan role Walidata Diskominfosantik, Bank Data BPS, Dashboard Analisis BAPPERIDA, dan chat Bupati tercatat dalam `docs/30-rencana-penyederhanaan-peran-ui-dan-chat-bupati-2026-11-21.md`. Dokumen 30 mengungguli bagian dokumen ini yang masih menyebut Walidata aktif atau Dashboard Eksekutif untuk Bupati.

## 1. Tujuan

Dokumen ini menjadi sumber serah terima untuk menyelesaikan kesenjangan yang ditemukan setelah pemeriksaan kode, migration, OpenAPI, pengujian, dan laporan audit SABABUKA.

Rencana ini sengaja dibuat sebelum perubahan kode. Setiap pelaksana harus membaca `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`, dan dokumen ini sebelum mengerjakan fase mana pun.

Sasaran akhirnya:

1. implementasi sesuai keputusan produk terbaru;
2. tidak ada sinkronisasi atau impor otomatis Bank Data;
3. kewenangan BAPPERIDA, Developer, Walidata, OPD, BPS, dan Bupati konsisten pada UI dan backend;
4. seluruh endpoint aktif tercakup OpenAPI;
5. workflow utama terbukti melalui pengujian dengan database uji;
6. data dan akun OPD siap dipakai untuk proses pemerintahan;
7. deployment, backup, pemulihan, dan monitoring dapat dijalankan oleh petugas selain pengembang awal;
8. dokumentasi dan buku panduan sesuai dengan aplikasi yang benar-benar berjalan.

## 2. Batas pekerjaan

### Termasuk

- penghapusan penjadwal sinkronisasi dan impor otomatis;
- penyelarasan kewenangan konektor;
- pembaruan bantuan peran dan teks antarmuka;
- pelengkapan OpenAPI;
- pengujian integrasi dan E2E workflow nyata;
- hardening unduhan sumber, sesi, dan kata sandi;
- backup database dan bukti dukung;
- konfigurasi deployment yang dapat direproduksi;
- audit kesiapan data dan akun OPD;
- pembaruan dokumentasi serta buku panduan setelah UI stabil.

### Tidak termasuk tanpa keputusan produk baru

- auto-generate atau semiotomatis indikator OPD;
- sinkronisasi Bank Data terjadwal;
- impor otomatis setelah validasi;
- MFA;
- Keuangan Daerah dan Layanan Publik;
- peta di luar Dashboard Eksekutif;
- konfirmasi atau tanggapan OPD atas rekomendasi Bupati;
- perubahan warna atau bentuk logo resmi;
- pemilihan otomatis nilai saat sumber berbeda.

## 3. Baseline hasil pemeriksaan

### 3.1 Kondisi repository

- Branch lokal saat dokumen dibuat: `main`.
- Branch lokal tertinggal 2 commit dari `origin/main`.
- Dua commit tersebut mengubah identitas kaki halaman menjadi Pemerintah Kabupaten Kapuas.
- Ada berkas tidak terlacak milik pengguna di `.impeccable/` dan `output/`. Jangan dihapus atau dimasukkan ke commit tanpa pemeriksaan.
- Migration terakhir: `086_validasi_relasi_indikator.sql`.
- Migration berikutnya harus memakai nomor 087 atau nomor berikutnya bila branch sudah berubah.

### 3.2 Hasil pemeriksaan kode lokal

- Type-check frontend lulus.
- Pengujian frontend: 6 lulus, 0 gagal.
- Type-check backend lulus.
- Pengujian backend: 105 terdeteksi, 94 lulus, 0 gagal, 11 dilewati.
- Pengujian yang dilewati membutuhkan PostgreSQL dan mencakup workflow penting.
- Playwright hanya menguji proteksi halaman dan login dengan API tiruan.

### 3.3 Kesenjangan tervalidasi

1. Penjadwal backend masih berjalan setiap 60 detik melalui `backend/src/server.ts`.
2. `ConnectorService.runDueSchedules()` masih dapat menjalankan sinkronisasi dan impor otomatis.
3. UI masih menawarkan `scheduled` dan `auto_import` pada `ConnectorsPage.tsx`.
4. Skema dan migration lama masih mengizinkan `scheduled`, `next_sync_at`, dan `auto_import`.
5. Bantuan Walidata masih menyebut pemetaan, impor, dan penjadwalan sinkronisasi.
6. Bantuan Bupati masih menyebut Rilis Data dan alur lama.
7. OpenAPI belum memuat seluruh endpoint yang berjalan.
8. Konfigurasi deployment repository masih memakai alamat `sslip.io`, bukan konfigurasi produksi yang dapat direproduksi.
9. Backup repository hanya mencakup PostgreSQL pada server yang sama, belum mencakup bukti dukung dan salinan offsite.
10. Tidak ada pembersihan berkala sesi kedaluwarsa.
11. Unduhan berkas konektor belum memiliki pembatasan host dan ukuran yang cukup.
12. Kebijakan kata sandi belum menolak kata sandi umum.
13. Pengujian browser belum mencakup workflow lintas peran dengan database nyata.
14. Dokumentasi status deployment dan peran masih memiliki informasi lama.

### 3.4 Baseline data yang harus diperbarui

Laporan audit 16 November 2026 mencatat 42 dari 69 indikator RPJMD belum memiliki realisasi dan 5 OPD belum memiliki akun aktif atau undangan. Angka ini hanya baseline historis. Jangan mengutipnya sebagai kondisi terbaru tanpa audit baca saja ke produksi.

## 4. Prinsip pelaksanaan

1. Kerjakan per fase dan jangan mencampur perubahan besar yang tidak berkaitan.
2. Buat branch sebelum perubahan kode. Gunakan awalan yang sesuai kebijakan agen, misalnya `codex/fix-manual-connectors` atau branch padanan untuk Claude.
3. Sebelum sinkronisasi Git, periksa perubahan pengguna dan gunakan `git pull --ff-only` hanya bila aman.
4. Jangan mengubah migration yang sudah diterapkan. Semua koreksi database memakai migration baru.
5. Backup dan rencana rollback wajib tersedia sebelum mutation produksi.
6. Pengujian yang membutuhkan perubahan data harus dilakukan pada database uji atau staging, bukan data produksi.
7. Data produksi hanya dibaca untuk audit kecuali pemilik memberi persetujuan eksplisit.
8. Jangan menyimpan secret, dump, bukti privat, cache audit, atau hasil build di Git.
9. Jangan memakai tanda pisah panjang atau sedang pada teks baru.
10. Perbarui dokumen ini setelah setiap fase dengan bukti pengujian dan commit terkait.

## 5. Urutan fase

## Fase 0 - Kunci baseline dan siapkan jalur kerja

Status: belum dimulai

### Tujuan

Memastikan pekerjaan dimulai dari branch terbaru tanpa menghilangkan perubahan pengguna.

### Langkah

1. Jalankan `git status --short --branch`.
2. Catat seluruh berkas tidak terlacak dan perubahan lokal.
3. Perbarui referensi remote.
4. Bandingkan `HEAD..origin/main`.
5. Lakukan fast-forward hanya jika tidak menimpa perubahan lokal.
6. Jalankan migration inventori, type-check, test unit, dan test integrasi pada database uji.
7. Simpan hasil baseline pada bagian Log Pelaksanaan dokumen ini.
8. Buat branch untuk Fase 1.

### Kriteria selesai

- branch sejajar dengan sumber utama yang benar;
- perubahan pengguna tetap utuh;
- seluruh versi alat dan database uji tercatat;
- hasil awal frontend, backend, integration, dan E2E terdokumentasi.

### Risiko dan rollback

- Jangan melakukan rebase atau reset pada worktree kotor.
- Jika fast-forward tidak aman, hentikan dan minta keputusan pemilik.

## Fase 1 - Hapus sinkronisasi dan impor otomatis

Status: belum dimulai

### Keputusan produk yang ditegakkan

- Impor Bank Data BPS dan Satu Data hanya manual oleh Developer.
- BAPPERIDA mengelola pemetaan sumber ke indikator melalui `connector.map`.
- Developer mengelola impor, aktivasi aliran, secret, dan Bank Data melalui `connector.manage`.
- Walidata tidak menjalankan pemetaan substansi, impor, atau sinkronisasi otomatis.

### Perubahan backend

1. Hapus interval penjadwal dari `backend/src/server.ts`.
2. Hapus `ConnectorService.runDueSchedules()` dan notifikasi terkait jadwal.
3. Hapus dukungan nilai `scheduled` dan `auto_import` dari tipe serta validasi route.
4. Pertahankan tindakan manual yang memang masih diperlukan:
   - pratinjau sumber;
   - pemetaan oleh BAPPERIDA;
   - persetujuan pemetaan;
   - impor eksplisit oleh Developer;
   - pengujian koneksi manual;
   - audit trail.
5. Pastikan endpoint impor, aktivasi, secret, dan Bank Data tetap mensyaratkan `connector.manage` dan Superadmin.
6. Pastikan endpoint mapping tetap mensyaratkan `connector.map`.

### Migration database

Buat migration baru, jangan mengubah migration 032 atau migration lama.

Isi migration yang direncanakan:

1. ubah seluruh `sync_mode = 'scheduled'` menjadi `manual`;
2. set `sync_interval_minutes = NULL`;
3. set `next_sync_at = NULL`;
4. ubah seluruh `verification_mode = 'auto_import'` menjadi `preview_required`;
5. ganti CHECK constraint agar hanya menerima `manual` dan `preview_required`, atau sederhanakan kolom setelah analisis kompatibilitas;
6. pertahankan histori run dan audit yang sudah ada;
7. catat migration pada `schema_migrations`.

Sebelum migration produksi:

- buat backup database;
- kueri jumlah profil `scheduled` dan `auto_import`;
- simpan hasil sebelum dan sesudah;
- pastikan tidak ada run yang sedang aktif.

### Perubahan frontend

1. Hapus opsi Terjadwal otomatis.
2. Hapus opsi Impor otomatis jika valid.
3. Ubah teks pipeline dari pengambilan sesuai jadwal menjadi proses manual terkontrol.
4. Ubah istilah Walidata pada halaman konektor sesuai kewenangan terbaru.
5. Tampilkan dengan jelas siapa yang dapat memetakan dan siapa yang dapat mengimpor.
6. Pertahankan loading, empty, error, toast, responsive, dan aksesibilitas.

### Pengujian wajib

- unit test menolak payload `scheduled`;
- unit test menolak `auto_import`;
- integration test BAPPERIDA dapat membuat dan menyetujui mapping;
- integration test BAPPERIDA tidak dapat mengimpor;
- integration test Walidata tidak dapat memetakan atau mengimpor;
- integration test Developer dapat pratinjau dan mengimpor manual;
- migration test memastikan seluruh profil lama menjadi manual;
- audit test memastikan aktor asli dan `acting_as` tetap tercatat.

### Kriteria selesai

- tidak ada `setInterval` untuk konektor;
- tidak ada `runDueSchedules`;
- tidak ada opsi `scheduled` atau `auto_import` pada UI dan API;
- tidak ada profil dengan jadwal aktif setelah migration;
- impor hanya terjadi setelah tindakan eksplisit Developer;
- seluruh pengujian kewenangan lulus.

## Fase 2 - Selaraskan bantuan peran dan teks antarmuka

Status: belum dimulai

### Bagian yang diperbarui

1. Bantuan Bupati:
   - Beranda;
   - Wilayah;
   - Indikator;
   - Fokus kebijakan;
   - Tanya Sababuka.
2. Bantuan OPD:
   - usulan indikator manual;
   - pelaporan realisasi;
   - bukti dukung;
   - pengiriman sebagian;
   - perbaikan setelah dikembalikan.
3. Bantuan BAPPERIDA:
   - review indikator;
   - mapping sumber;
   - review capaian;
   - validasi relasi;
   - publikasi.
4. Bantuan Walidata:
   - kualitas teknis;
   - profil sumber;
   - interoperabilitas dan pembinaan teknis;
   - tanpa pemetaan substansi, impor, atau jadwal otomatis.
5. Bantuan Developer:
   - konfigurasi sistem;
   - secret;
   - impor manual Bank Data;
   - monitoring dan audit.

### Pengujian wajib

- setiap bantuan hanya menyebut menu yang benar-benar tersedia untuk peran tersebut;
- tidak ada teks sinkronisasi otomatis;
- tidak ada teks Rilis Data pada petunjuk portal Bupati bila menu itu tidak tampil;
- pemeriksaan desktop, tablet, dan ponsel;
- navigasi papan ketik dan pembaca layar untuk drawer bantuan.

### Kriteria selesai

- bantuan peran sesuai menu dan izin backend;
- seluruh istilah sama antara sidebar, judul, breadcrumb, dan buku panduan;
- tidak ada petunjuk yang mengarahkan pengguna ke tindakan yang tidak berwenang.

## Fase 3 - Lengkapi OpenAPI dan pengujian kontrak

Status: belum dimulai

### Endpoint prioritas

Lengkapi sekurang-kurangnya:

- `/opd-profiles` dan dokumen profil;
- `/connectors/series-links`;
- `/connectors/bank-data/*`;
- endpoint pratinjau dan impor manual;
- `/connectors/mappings/express-*` bila masih dipertahankan;
- `/executive/analysis`;
- `/executive/insights`;
- `/submissions/{id}/guidance`;
- `/categories/actions/submit-all`;
- `/me/announcement`;
- `/me/preview-options`;
- seluruh endpoint relasi OPD dan analisis silang;
- endpoint Model AI dan status kesehatannya.

### Langkah

1. Inventaris seluruh route Fastify beserta method, path, permission, body, query, response, dan error.
2. Bandingkan dengan `docs/api/openapi.yaml`.
3. Tambahkan schema request dan response yang belum ada.
4. Pastikan server produksi memakai `https://sababuka.com/api/v1`.
5. Regenerasi tipe frontend.
6. Tambahkan test yang gagal bila route aktif tidak tercantum dalam OpenAPI.
7. Tambahkan pengecualian eksplisit hanya untuk endpoint internal yang benar-benar tidak dipublikasikan.

### Kriteria selesai

- seluruh route aktif terpetakan;
- `pnpm api:types:check` lulus;
- test perbandingan route dan OpenAPI lulus;
- frontend tidak mendefinisikan ulang tipe API yang seharusnya berasal dari kontrak.

## Fase 4 - Pengujian workflow nyata pada database uji

Status: belum dimulai

### Lingkungan

- PostgreSQL/PostGIS terisolasi;
- migration dari kosong sampai versi terbaru;
- akun uji anonim per peran;
- tidak memakai data produksi;
- hasil pengujian dapat dibuang setelah selesai.

### Skenario minimum

1. OPD mengusulkan indikator manual.
2. BAPPERIDA mengembalikan usulan dengan alasan minimal 10 karakter.
3. OPD memperbaiki dan mengajukan ulang.
4. BAPPERIDA menyetujui dan mengaktifkan indikator.
5. OPD membuat pelaporan dan mengisi minimal satu indikator.
6. OPD mengunggah bukti dan mengirim sebagian.
7. BAPPERIDA mengembalikan indikator tertentu.
8. OPD hanya dapat mengubah indikator yang dibuka.
9. BAPPERIDA menyetujui dan publikasi menjadi versi baru.
10. Bupati hanya melihat data terbit.
11. Nilai berbeda antarsumber menghasilkan konflik.
12. OPD pemilik atau BAPPERIDA menetapkan nilai valid dengan catatan.
13. BAPPERIDA memetakan sumber, tetapi tidak dapat mengimpor.
14. Developer melakukan pratinjau dan impor manual.
15. Walidata dan OPD ditolak ketika mencoba tindakan di luar kewenangan.
16. Developer bertindak sebagai peran lain dan audit menyimpan aktor asli.
17. Model AI gagal aman saat kredit habis atau key tidak valid.

### E2E browser

Tambahkan pengujian Playwright untuk desktop, tablet, dan ponsel:

- login tiap peran;
- menu sesuai izin;
- workflow OPD dan BAPPERIDA;
- portal Bupati;
- konektor manual;
- loading, kosong, galat, toast;
- tema terang dan gelap;
- fokus papan ketik dasar.

### Kriteria selesai

- seluruh integration test berjalan, tidak dilewati;
- workflow utama lulus tanpa mock API;
- tidak ada akses lintas OPD atau IDOR;
- hasil test tersimpan sebagai artefak CI tanpa data rahasia.

## Fase 5 - Kesiapan data dan akun OPD

Status: belum dimulai

### Audit baca saja

Perbarui angka produksi untuk:

- jumlah indikator RPJMD aktif;
- indikator tanpa realisasi;
- indikator tanpa target;
- indikator tanpa pemilik utama;
- OPD tanpa akun aktif;
- OPD tanpa Profil Data;
- pelaporan draf, dikembalikan, menunggu, dan disetujui;
- publikasi aktif dan versi yang ditarik;
- konflik sumber terbuka;
- data Bank Data yang belum diverifikasi;
- satuan, target, duplikasi nama, dan nilai anomali.

### Tindak lanjut organisasi

1. Tetapkan PIC aktif untuk seluruh OPD dalam lingkup pilot.
2. Tetapkan tenggat pelaporan.
3. Konfirmasi satuan dan target janggal kepada pemilik data.
4. Selesaikan indikator yang belum memiliki realisasi atau beri alasan resmi belum tersedia.
5. Validasi hubungan OPD utama dan pendukung.
6. Catat keputusan dalam audit trail atau dokumen resmi.

### Kriteria selesai

- tidak ada OPD pilot tanpa PIC;
- tidak ada indikator tanpa pemilik;
- seluruh kekosongan realisasi memiliki status dan penanggung jawab;
- anomali data memiliki keputusan tertulis;
- Dashboard Bupati tidak memakai data yang belum disetujui, kecuali Bank Data yang jelas berlabel belum diverifikasi.

## Fase 6 - Backup, restore, deployment, dan monitoring

Status: belum dimulai

### Backup

1. Backup PostgreSQL harian.
2. Backup `/var/lib/sababuka/evidence`.
3. Salinan terenkripsi di lokasi berbeda.
4. Retensi harian, mingguan, dan bulanan sesuai keputusan pemilik.
5. Checksum dan laporan keberhasilan backup.
6. Alert bila backup gagal.

### Restore drill

1. Pulihkan database ke server uji.
2. Pulihkan berkas bukti.
3. Verifikasi hubungan metadata dan berkas.
4. Ukur waktu pemulihan.
5. Dokumentasikan RPO dan RTO aktual.
6. Simpan berita acara atau bukti latihan.

### Deployment

1. Simpan konfigurasi nginx produksi tanpa secret di `deploy/`.
2. Dokumentasikan Cloudflare, TLS, systemd, direktori, permission, dan environment.
3. Dokumentasikan langkah deploy dan rollback.
4. Hindari jeda 502 dengan strategi restart yang aman atau maintenance window.
5. Tambahkan pemeriksaan kesehatan setelah deploy.
6. Pastikan konfigurasi repository sesuai server produksi.

### Monitoring

- kesehatan API dan database;
- penggunaan disk;
- backup terakhir;
- error rate dan 5xx;
- kegagalan konektor manual;
- kesehatan Model AI;
- sesi dan percobaan login gagal;
- sertifikat TLS;
- kapasitas penyimpanan bukti.

### Kriteria selesai

- restore database dan bukti pernah berhasil;
- konfigurasi produksi dapat direproduksi dari repository dan secret manager;
- rollback pernah diuji;
- alert sampai ke petugas yang ditetapkan;
- tidak ada ketergantungan tunggal pada satu pengembang.

## Fase 7 - Hardening keamanan dan pemeliharaan

Status: belum dimulai

### Pekerjaan

1. Tambahkan pembersihan sesi kedaluwarsa terjadwal dan teraudit.
2. Batasi host unduhan konektor ke daftar yang disetujui.
3. Tolak redirect ke host yang tidak disetujui atau alamat privat.
4. Batasi ukuran unduhan melalui metadata dan pembacaan stream.
5. Batasi tipe konten dan format berkas sebelum parsing.
6. Tambahkan daftar kata sandi umum yang ditolak.
7. Siapkan akun Developer cadangan atau prosedur pemulihan dua petugas.
8. Hilangkan header keamanan ganda bila dapat dilakukan tanpa menurunkan perlindungan.
9. Matikan Cloudflare Web Analytics atau sesuaikan CSP secara terkendali.
10. Lakukan dependency audit, security scan, dan uji beban.

### Kriteria selesai

- tidak ada sesi kedaluwarsa lama di database;
- unduhan besar atau dari host lain ditolak sebelum memenuhi memori;
- kata sandi umum ditolak dengan pesan yang mudah dipahami;
- pemulihan akses Developer terdokumentasi dan diuji;
- tidak ada galat CSP berulang di konsol produksi.

## Fase 8 - Dokumentasi dan buku panduan final

Status: belum dimulai

### Dokumen yang diperbarui

- `README.md`;
- `PRODUCT.md` bila keputusan produk berubah;
- `AGENTS.md` dan `CLAUDE.md` bila aturan kerja berubah;
- `docs/role-workflow.md`;
- `docs/external-connectors.md`;
- `docs/api/openapi.yaml` dan changelog;
- laporan audit rilis terbaru;
- runbook deploy, backup, restore, dan insiden;
- buku panduan Bupati;
- buku panduan seluruh OPD;
- panduan BAPPERIDA, Walidata, BPS, dan Developer bila diminta.

### Aturan

1. Ambil ulang capture setelah UI dan kaki halaman final.
2. Gunakan data contoh anonim.
3. Jangan mencantumkan kata sandi atau alamat akun uji internal.
4. Render DOCX dan PDF, lalu periksa seluruh halaman.
5. Tulis tanggal dan versi aplikasi pada sampul.

### Kriteria selesai

- dokumentasi tidak menyebut fitur yang sudah dihapus;
- setiap peran membaca petunjuk yang sama dengan aplikasi;
- buku panduan sesuai capture versi final;
- Claude dan Codex dapat memahami status proyek dari repository tanpa percakapan lama.

## 6. Pembagian pull request yang disarankan

Jangan membuat satu pull request raksasa. Gunakan pembagian berikut:

1. PR 1: penghapusan scheduler, migration manual-only, dan test kewenangan.
2. PR 2: bantuan peran dan teks konektor.
3. PR 3: OpenAPI lengkap dan route coverage test.
4. PR 4: integration test dan Playwright workflow.
5. PR 5: hardening unduhan, sesi, dan kata sandi.
6. PR 6: backup, deploy, restore, dan monitoring.
7. PR 7: dokumentasi dan buku panduan final.

Setiap PR wajib memuat:

- tujuan;
- keputusan produk yang ditegakkan;
- daftar berkas;
- migration dan dampak data;
- hasil pengujian;
- risiko;
- rollback;
- capture untuk perubahan UI;
- pernyataan bahwa perubahan pengguna lain tetap dipertahankan.

## 7. Gerbang sebelum perubahan produksi

Perubahan produksi hanya boleh dilakukan bila:

- branch dan commit telah ditinjau;
- CI hijau;
- integration dan E2E database uji lulus;
- backup baru tersedia;
- rollback tertulis;
- migration diuji dari salinan data;
- pemilik menyetujui waktu perubahan;
- tidak ada proses pelaporan aktif yang akan terganggu;
- hasil pascadeploy diverifikasi per peran.

## 8. Definisi selesai keseluruhan

Pekerjaan dinyatakan selesai hanya bila seluruh kondisi berikut terpenuhi:

1. Tidak ada sinkronisasi atau impor otomatis.
2. Kewenangan frontend dan backend sesuai keputusan terbaru.
3. OpenAPI mencakup seluruh route aktif.
4. Seluruh integration test berjalan tanpa skip pada CI rilis.
5. Workflow lintas peran lulus dengan database uji.
6. Data dan akun OPD memiliki status kesiapan terkini.
7. Backup database dan bukti berhasil dipulihkan.
8. Deployment dan rollback dapat dilakukan dari runbook.
9. Hardening unduhan, sesi, dan kata sandi selesai.
10. Dokumentasi dan buku panduan sesuai aplikasi final.

## 9. Instruksi serah terima untuk Claude Code

Claude Code harus melakukan urutan berikut saat melanjutkan:

1. Baca `AGENTS.md` sampai selesai.
2. Baca `CLAUDE.md` sampai selesai.
3. Baca dokumen ini sampai selesai.
4. Jalankan `git status --short --branch`.
5. Jangan menghapus `.impeccable/` atau `output/` yang tidak berkaitan.
6. Periksa apakah branch masih tertinggal dari `origin/main`.
7. Tentukan fase pertama yang belum selesai dari tabel Status Fase.
8. Jangan mengerjakan fase berikutnya sebelum kriteria fase aktif terpenuhi.
9. Setelah bekerja, perbarui tabel Status Fase dan Log Pelaksanaan.
10. Cantumkan commit, pengujian, migration, risiko, dan pekerjaan yang tersisa.

Claude tidak boleh menganggap percakapan ini tersedia. Semua keputusan yang diperlukan untuk melanjutkan harus diambil dari repository, terutama `AGENTS.md`, `CLAUDE.md`, dan dokumen ini.

## 10. Status fase

| Fase | Status | Bukti atau catatan |
| --- | --- | --- |
| 0. Baseline | Sedang dikerjakan | Branch kerja dan perubahan lokal sudah diinventaris. Baseline database menunggu PostgreSQL terisolasi. |
| 1. Manual-only konektor | Sedang dikerjakan | Scheduler, route otomatis, dan UI otomatis sudah dihapus pada branch. Migration 087 belum diuji pada database. |
| 2. Bantuan peran | Sedang dikerjakan | Teks aktif Bupati, BPS, BAPPERIDA, Developer, dan OPD sudah diselaraskan. Audit dokumentasi lama belum selesai. |
| 3. OpenAPI | Sedang dikerjakan | Kontrak chat, catatan Bank Data, impor manual, dan riwayat impor diperbarui serta tipe digenerasi ulang. Coverage seluruh route masih perlu diaudit. |
| 4. Integration dan E2E | Sedang dikerjakan | Playwright mock Bupati dan BPS lulus. Sebanyak 11 test database tetap dilewati sampai PostgreSQL uji tersedia. |
| 5. Data dan akun OPD | Belum dimulai | Perlu audit produksi terbaru |
| 6. Operasi produksi | Belum dimulai | Backup bukti dan restore drill belum terbukti |
| 7. Hardening | Belum dimulai | Sesi dan unduhan konektor perlu penguatan |
| 8. Dokumentasi final | Belum dimulai | Dilakukan setelah perilaku dan UI stabil |

Nilai status yang boleh dipakai: `Belum dimulai`, `Sedang dikerjakan`, `Selesai`, atau `Terblokir` dengan alasan.

## 11. Log pelaksanaan

Tambahkan entri baru di bagian bawah. Jangan menghapus riwayat lama.

### 21 November 2026 - Penyusunan rencana

- Pemeriksaan dilakukan tanpa perubahan kode aplikasi.
- Frontend type-check lulus dan 6 test frontend lulus.
- Backend type-check lulus; 94 test lulus, 0 gagal, 11 integration test dilewati karena database tidak tersedia pada proses tersebut.
- Kesenjangan scheduler, auto import, bantuan peran, OpenAPI, operasi produksi, dan testing dicatat.
- Dokumen ini dibuat sebagai sumber serah terima untuk Codex dan Claude Code.

### 21 November 2026 - Implementasi keputusan penyederhanaan peran

- Pekerjaan dilakukan pada branch `codex/sederhanakan-peran-chat-bupati` dan mengikuti dokumen 30 sebagai sumber utama.
- Kode manual-only konektor, role Diskominfosantik sebagai OPD, Bank Data BPS, Dashboard Analisis BAPPERIDA, serta riwayat chat Bupati sudah ditulis.
- Migration 087, 088, dan 089 belum diterapkan karena PostgreSQL uji tidak tersedia. Status fase tidak boleh dinaikkan menjadi Selesai sebelum migration dan integration test nyata lulus.
- Type-check frontend dan backend, unit test, build frontend, serta Playwright mock Bupati dan BPS lulus.
- Tangkapan layar desktop dan ponsel mengungkap masalah scroll chat, kemudian masalah tersebut diperbaiki dan diuji ulang.
- Gerbang produksi tetap mengikuti bagian 7. Backup, rollback, migration rehearsal, test database tanpa skip, review branch, dan persetujuan waktu rilis masih wajib.

