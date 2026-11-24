# Rencana Penyederhanaan Peran, UI, dan Chat Bupati

Tanggal keputusan: 21 November 2026  
Status: implementasi aktif pada branch `codex/sederhanakan-peran-chat-bupati`, belum siap dirilis ke produksi  
Kedudukan: keputusan ini menggantikan rancangan lama yang menempatkan Diskominfosantik sebagai peran Walidata dan Bupati sebagai pengguna Dashboard Eksekutif

## 1. Keputusan produk terbaru

1. Peran `kominfo` atau Walidata Diskominfosantik dihapus dari penggunaan aktif.
2. Pengguna Diskominfosantik menjadi pengguna OPD biasa dengan organisasi Diskominfosantik.
3. Seluruh pekerjaan pengaturan sumber, koneksi, secret, pratinjau impor, impor manual, dan riwayat impor menjadi kewenangan Developer.
4. Pemetaan Seri Data atau sumber ke indikator RPJMD menjadi kewenangan BAPPERIDA.
5. Fitur sinkronisasi otomatis, impor otomatis, interval, penjadwal, dan konfigurasi teknis yang tidak diperlukan dihapus.
6. BPS hanya membuka Bank Data untuk memantau data dan memberikan catatan pembinaan statistik.
7. Dashboard yang sebelumnya disebut Dashboard Pimpinan dipindahkan menjadi Dashboard Analisis BAPPERIDA.
8. Bupati tidak lagi masuk ke dashboard. Setelah login, Bupati langsung masuk ke tampilan percakapan seperti ChatGPT.
9. Bupati dapat membuat percakapan baru dan membuka kembali riwayat percakapan yang tersimpan.
10. Tampilan percakapan Bupati harus rapi, sederhana, responsif, dan nyaman pada ponsel.

## 2. Model aplikasi setelah penyederhanaan

```text
SABABUKA
|
+-- Bupati
|   +-- Tanya Sababuka
|       +-- Percakapan baru
|       +-- Riwayat percakapan
|       +-- Jawaban, grafik, tabel, dan sumber
|
+-- OPD
|   +-- Beranda Tugas
|   +-- Pelaporan Realisasi
|   +-- Indikator OPD
|   +-- Profil Data OPD
|   +-- Akun
|
+-- BAPPERIDA
|   +-- Beranda Tugas
|   +-- Dashboard Analisis
|   +-- Indikator dan Fokus Kebijakan
|   +-- Pemetaan Seri Data
|   +-- Verifikasi Pelaporan
|   +-- Publikasi dan Konsolidasi
|
+-- BPS
|   +-- Bank Data
|   +-- Catatan Pembina pada Bank Data
|   +-- Akun
|
+-- Developer
    +-- Dashboard Sistem
    +-- Pengguna, organisasi, dan akses
    +-- Sumber dan Impor Bank Data
    +-- Sistem, Model AI, dan audit
```

Tidak ada workspace Walidata terpisah setelah perubahan ini.

## 3. Jawaban tentang fungsi impor

Impor tetap diperlukan, tetapi hanya sebagai tindakan manual Developer.

Fungsi impor adalah mengambil data yang dipilih dari katalog resmi BPS atau Satu Data, lalu menyimpannya ke Bank Data SABABUKA agar:

- seri dapat dicari dan dipantau BPS;
- BAPPERIDA dapat menautkan seri dengan indikator RPJMD;
- asisten Bupati dapat membaca data yang tersedia;
- nilai memiliki sumber, tahun, wilayah, satuan, dan jejak audit;
- pembaruan data dapat dibandingkan dengan versi sebelumnya.

Impor tidak berarti data otomatis menjadi realisasi resmi OPD. Data hasil impor tetap berlabel `Bank Data - belum diverifikasi` sampai ada proses tata kelola yang sesuai.

### Alur impor yang dipertahankan

```text
Developer memilih katalog resmi
-> pratinjau metadata dan contoh nilai
-> Developer menekan Impor
-> sistem memvalidasi dan menyimpan Bank Data
-> riwayat impor dan sumber dicatat
-> BPS dapat memantau dan memberi catatan
-> BAPPERIDA dapat memetakan Seri Data ke indikator
```

### Alur yang dilarang

```text
jadwal otomatis
-> pengambilan otomatis
-> validasi otomatis
-> impor otomatis
```

## 4. Fitur sumber data yang dipertahankan dan dihapus

## 4.1 Dipertahankan untuk Developer

- status koneksi sumber resmi;
- pengaturan secret API BPS;
- katalog variabel BPS;
- katalog tabel Satu Data;
- pencarian katalog;
- pratinjau metadata;
- pratinjau tahun, satuan, wilayah, kategori, dan contoh nilai;
- tombol Impor manual;
- tombol Perbarui manual untuk seri yang pernah diimpor;
- riwayat impor;
- hasil berhasil, gagal, dan dilewati;
- sumber dan provenance;
- audit trail;
- perbaikan satuan yang dilakukan secara eksplisit dan teraudit.

## 4.2 Dipertahankan untuk BAPPERIDA

- daftar Seri Data yang sudah berada di Bank Data;
- pencarian kandidat berdasarkan nama dan metadata;
- tautan Seri Data ke indikator RPJMD;
- jenis tautan utama, pendukung, atau pembanding;
- persetujuan, perubahan, dan penghapusan tautan;
- relasi OPD utama dan pendukung;
- catatan BPS yang terkait dengan seri;
- peringatan bila seri belum diverifikasi atau memiliki catatan terbuka.

## 4.3 Dipertahankan untuk BPS

- membaca seluruh Bank Data;
- mencari dan memfilter sumber, tahun, wilayah, serta status catatan;
- membuka detail seri, metadata, satuan, nilai, sumber, dan riwayat pembaruan;
- menambahkan catatan pembinaan;
- melihat status tindak lanjut catatan;
- melihat tanggapan penyelesaian tanpa mengubah data.

## 4.4 Dihapus

- peran dan menu Walidata Diskominfosantik;
- mode `scheduled`;
- `sync_interval_minutes` pada alur aktif;
- `next_sync_at` pada alur aktif;
- penjadwal 60 detik di backend;
- `runDueSchedules()`;
- `auto_import`;
- tombol dan teks sinkronisasi otomatis;
- konfigurasi Aktif, Dijeda, dan Jadwal pada profil integrasi;
- Express Import All;
- sinkronisasi seluruh mapping sekaligus;
- notifikasi kegagalan jadwal kepada Walidata;
- pilihan teknologi konektor generik yang tidak dipakai pada tahap ini;
- wizard konektor yang meminta pengguna memilih API, CKAN, scraping, database, atau jadwal;
- pipeline UI yang terlalu panjang dan membuat pengguna berpindah-pindah;
- halaman Pembinaan Statistik terpisah untuk BPS jika seluruh fungsinya sudah berada di Bank Data;
- menu Dataset untuk OPD bila hanya berfungsi sebagai katalog baca yang tidak diperlukan untuk pelaporan.

### Catatan penghapusan

Data historis, audit, dan provenance tidak boleh langsung dihapus. Endpoint dan UI lama dinonaktifkan lebih dahulu, kemudian tabel atau kolom dibersihkan melalui migration baru setelah dipastikan tidak diperlukan untuk histori.

## 5. Rancangan peran dan kewenangan

## 5.1 Diskominfosantik sebagai OPD

### Migration

1. Identifikasi akun aktif dengan role `kominfo`.
2. Pastikan setiap akun terhubung ke organisasi Diskominfosantik.
3. Tambahkan role `opd` dengan scope organisasi Diskominfosantik.
4. Akhiri assignment role `kominfo` tanpa menghapus histori.
5. Hapus seluruh menu dan permission aktif dari role `kominfo`.
6. Tandai role `kominfo` tidak aktif.
7. Pertahankan kode role pada histori audit agar kejadian lama tetap dapat dibaca.

### Perubahan aplikasi

- hapus label Walidata dari UI;
- hapus tujuan login `/connectors` untuk role `kominfo`;
- hapus pilihan Bertindak sebagai Diskominfosantik;
- hapus bantuan Walidata;
- pendaftaran akun Diskominfosantik menggunakan paket role OPD;
- notifikasi teknis sumber dialihkan kepada Developer;
- Diskominfosantik hanya melihat data dan pekerjaan organisasi sendiri seperti OPD lain.

### Menu Diskominfosantik setelah migrasi

- Beranda Tugas;
- Pelaporan Realisasi;
- Indikator OPD;
- Profil Data OPD;
- Akun.

## 5.2 Developer

Developer menjadi pemilik tunggal fungsi teknis sumber data.

Menu sumber disederhanakan menjadi satu halaman `Sumber dan Impor` dengan tiga bagian:

1. Katalog impor.
2. Riwayat impor.
3. Pengaturan sumber dan secret.

Developer tidak menentukan hubungan substansi antara Seri Data dan indikator RPJMD. Hubungan tersebut tetap diputuskan BAPPERIDA.

## 5.3 BAPPERIDA

BAPPERIDA menjadi pemilik:

- Dashboard Analisis;
- indikator dan fokus kebijakan;
- pemetaan Seri Data;
- relasi OPD utama dan pendukung;
- verifikasi pelaporan;
- publikasi;
- konsolidasi sumber;
- validasi keterkaitan lintas OPD.

BAPPERIDA tidak mengatur secret dan tidak menjalankan impor Bank Data.

## 5.4 BPS

BPS dipertahankan sebagai `pembina_statistik` dengan kewenangan minimum.

Menu BPS:

1. Bank Data.
2. Akun saya.

Catatan pembinaan dibuat langsung pada detail Seri Data. Tidak ada halaman workflow terpisah yang memaksa BPS berpindah dari data yang sedang diperiksa.

BPS tidak dapat:

- mengubah nilai;
- mengimpor;
- memetakan;
- menerbitkan;
- menyetujui pelaporan;
- mengubah metadata sumber;
- mengakses administrasi pengguna.

## 5.5 Bupati

Bupati hanya memakai Tanya Sababuka. Tidak ada menu Dashboard Analisis, Bank Data, Publikasi, atau administrasi.

Asisten tetap hanya membaca data yang sudah terbit dan Bank Data yang diberi label secara jelas. Asisten tidak boleh menyatakan OPD telah atau akan melakukan tindakan tanpa bukti.

## 6. Rancangan catatan pembinaan BPS

## 6.1 Letak

Catatan tampil pada drawer atau lembar detail Seri Data di halaman Bank Data. BPS tidak perlu membuka halaman lain.

## 6.2 Isi catatan

- jenis: standar, metadata, metodologi, atau konsistensi;
- isi catatan;
- seri yang diperiksa;
- sumber dan periode yang terlihat saat catatan dibuat;
- pembuat dan waktu;
- status: Perlu ditinjau atau Sudah ditindaklanjuti;
- tanggapan penyelesaian.

## 6.3 Kewenangan

- BPS membuat catatan dan membaca tanggapan.
- Developer dan BAPPERIDA melihat catatan pada konteks pekerjaan masing-masing.
- Developer atau BAPPERIDA dapat menandai sudah ditindaklanjuti dengan catatan penyelesaian.
- Penyelesaian tidak mengubah nilai secara otomatis.

## 6.4 Model data yang disarankan

Buat tabel baru `bank_data_guidance_notes` agar catatan Bank Data tidak dicampur dengan catatan pelaporan OPD lama.

Kolom minimum:

- `id`;
- `indicator_id` atau identitas Seri Data;
- `guidance_type`;
- `notes`;
- `snapshot_json` untuk sumber, tahun, satuan, dan nilai ringkas saat catatan dibuat;
- `created_by` dan `created_at`;
- `resolved_by`, `resolved_at`, dan `resolution_notes`;
- constraint panjang catatan dan konsistensi status penyelesaian.

Catatan lama pada `submission_guidance_notes` dipertahankan sebagai histori baca saja. Jangan menghapusnya.

## 7. Dashboard Analisis BAPPERIDA

Komponen Dashboard Eksekutif yang masih berguna dipindahkan ke ruang BAPPERIDA:

- Ringkasan capaian;
- indikator tercapai, belum tercapai, dan belum ada realisasi;
- tren terbaru;
- peta kecamatan;
- fokus kebijakan;
- semua indikator;
- lembar indikator;
- analisis silang;
- rekomendasi kepada OPD.

### Penyesuaian

- nama UI menjadi `Dashboard Analisis`;
- tampil dalam workspace internal dengan sidebar, bukan portal Bupati;
- menu berada dekat Verifikasi Pelaporan dan Pemetaan Seri Data;
- data draf dan data internal diberi label yang jelas;
- tindakan BAPPERIDA dapat dibuka dari konteks indikator tanpa kembali ke beranda;
- tautan kembali selalu menuju posisi sebelumnya;
- filter tetap tersimpan selama sesi kerja.

### Hak akses

- `executive_dashboard.view` dicabut dari role Bupati;
- permission tersebut diberikan kepada BAPPERIDA dan Developer, atau diganti nama bila diperlukan;
- endpoint analisis tetap mematuhi scope dan tidak membuka data privat kepada Bupati.

## 8. Rancangan Tanya Sababuka untuk Bupati

Mode permukaan ini adalah `Operate`: Bupati datang untuk memperoleh jawaban dan bukti dengan cepat, bukan menjelajahi dashboard. Identitas visual tetap mengikuti SABABUKA, yaitu Poppins, navy, oranye yang terbatas pada satu aksi utama, logo resmi, mode terang dan gelap, serta tanpa garis aksen sisi. Acuan "seperti ChatGPT" dipakai untuk topologi percakapan, riwayat, dan composer, bukan untuk menyalin merek atau tampilan produk lain.

Hasil utama yang harus terbukti pada layar pertama:

- Bupati langsung memahami bahwa ia dapat bertanya tentang kondisi pembangunan;
- tombol Percakapan baru dan riwayat mudah ditemukan;
- pertanyaan dapat dikirim tanpa membuka menu lain;
- jawaban menampilkan bukti angka dan sumber di tempat yang sama;
- tidak ada sisa navigasi dashboard yang bersaing dengan percakapan.

Anti-goal:

- bukan dashboard yang diberi kotak chat;
- bukan halaman kosong generik tanpa identitas Kapuas;
- bukan tiruan visual ChatGPT;
- bukan percakapan yang memaksa pengguna membuka banyak halaman untuk melihat bukti;
- bukan UI desktop yang sekadar diperkecil untuk ponsel.

## 8.1 Halaman awal

Setelah login, Bupati langsung diarahkan ke `/assistant` atau route percakapan pengganti yang disepakati. `/dashboard` tidak lagi menjadi halaman awal Bupati.

Halaman menampilkan:

- logo dan nama Tanya Sababuka;
- tombol Percakapan baru;
- riwayat percakapan;
- area pesan;
- saran pertanyaan saat percakapan kosong;
- kolom pertanyaan yang selalu mudah dijangkau;
- tema, bantuan, notifikasi, dan profil secara ringkas.

## 8.2 Riwayat percakapan

Database saat ini sudah memiliki `assistant_sessions` dan `assistant_messages`. Yang belum tersedia adalah API daftar sesi, pembukaan sesi, dan UI riwayat.

Tambahkan endpoint:

- `GET /assistant/sessions`;
- `GET /assistant/sessions/{id}`;
- `PATCH /assistant/sessions/{id}` untuk mengganti judul atau mengarsipkan;
- `POST /assistant/sessions` untuk Percakapan baru.

Aturan:

- pengguna hanya dapat membaca sesi miliknya;
- sesi Developer saat Bertindak sebagai Bupati tetap milik Developer dan tercatat sebagai simulasi;
- judul awal dibuat dari pertanyaan pertama secara deterministik;
- percakapan tidak dihapus permanen pada versi pertama, hanya diarsipkan;
- pesan dan sumber dimuat dari server, bukan dari local storage;
- local storage hanya boleh menyimpan draf teks yang belum dikirim.

## 8.3 Tata letak desktop

```text
+----------------------+------------------------------------------+
| Percakapan baru      | Tanya Sababuka                            |
| Cari riwayat         |                                          |
|                      | Pesan Bupati                              |
| Hari ini             | Jawaban, grafik, tabel, dan sumber        |
| Judul percakapan     |                                          |
|                      |                                          |
| 7 hari terakhir      |                                          |
| Judul percakapan     | [ Tulis pertanyaan...             Kirim ]|
+----------------------+------------------------------------------+
```

## 8.4 Tata letak ponsel

- riwayat berada dalam drawer yang dibuka dengan tombol menu;
- tombol Percakapan baru tetap terlihat;
- area pesan memakai seluruh lebar layar;
- composer menempel di bawah dengan safe area;
- tabel dapat digulir horizontal di dalam kartu, bukan seluruh halaman;
- grafik menyesuaikan lebar;
- sumber dapat dibuka dan ditutup;
- target sentuh utama minimal 44 px;
- tidak ada tab bawah dashboard lama.

## 8.5 Jawaban agar tidak bolak-balik

Jawaban langsung memuat:

- ringkasan singkat;
- angka, tahun, satuan, dan status;
- grafik atau tabel jika relevan;
- sumber dan label verifikasi;
- keterbatasan data;
- pertanyaan lanjutan yang disarankan.

Bupati tidak diarahkan ke Dashboard Analisis. Rincian bukti dibuka dalam bagian yang dapat diperluas di percakapan. Tautan sumber asli tetap dapat dibuka pada tab baru.

## 8.6 State yang wajib

- percakapan kosong;
- memuat riwayat;
- sedang menganalisis;
- jawaban berhasil;
- data sebagian;
- data tidak cukup;
- model tidak tersedia;
- koneksi terputus;
- pengiriman ulang aman tanpa pesan ganda;
- riwayat kosong;
- sesi diarsipkan.

## 9. Alur kerja sederhana per peran

## 9.1 OPD

```text
Beranda Tugas
-> buka pekerjaan
-> isi atau perbaiki
-> simpan
-> kirim
-> kembali ke Beranda Tugas
```

Konsolidasi hanya muncul sebagai tugas bila ada konflik yang memerlukan OPD tersebut. Tidak perlu menjadi menu utama permanen.

## 9.2 BPS

```text
Bank Data
-> cari seri
-> buka detail
-> periksa metadata dan nilai
-> tulis catatan pada halaman yang sama
-> pantau status catatan
```

## 9.3 BAPPERIDA

```text
Beranda Tugas
-> pilih pelaporan, indikator, atau mapping yang perlu keputusan
-> periksa data dan konteks
-> putuskan
-> tugas berikutnya
```

Dashboard Analisis dapat membuka konteks indikator dan tindakan BAPPERIDA tanpa berpindah ke aplikasi lain.

## 9.4 Developer

```text
Sumber dan Impor
-> pilih katalog
-> pratinjau
-> impor manual
-> periksa hasil dan audit
```

## 9.5 Bupati

```text
Masuk
-> Tanya Sababuka
-> buat atau buka percakapan
-> baca jawaban dan sumber
-> ajukan pertanyaan lanjutan
```

## 10. Urutan implementasi

## Fase A - Baseline dan migration design

1. Sinkronkan branch secara aman.
2. Audit akun dan assignment role `kominfo`.
3. Audit profil integrasi scheduled atau auto import.
4. Audit menu dan permission BPS, BAPPERIDA, Bupati, Developer, dan OPD.
5. Audit sesi asisten yang sudah ada.
6. Buat backup database uji.
7. Tulis migration plan dan rollback query.

Kriteria selesai:

- jumlah akun terdampak diketahui;
- tidak ada data historis yang akan hilang;
- migration dapat dijalankan ulang dengan aman;
- rancangan permission disetujui.

## Fase B - Hapus Walidata dan otomatisasi

1. Migration role Diskominfosantik menjadi OPD.
2. Nonaktifkan role `kominfo`.
3. Hapus scheduler dan auto import.
4. Hapus endpoint, service, notification, dan UI yang tidak diperlukan.
5. Sederhanakan Developer menjadi Sumber dan Impor.
6. Pertahankan audit serta histori impor.

Kriteria selesai:

- tidak ada login aktif dengan role `kominfo`;
- Diskominfosantik bekerja sebagai OPD;
- tidak ada jadwal atau impor otomatis;
- hanya Developer dapat mengimpor;
- hanya BAPPERIDA dapat memetakan.

## Fase C - Bank Data dan catatan BPS

1. Buat permission `bank_data.view` bila permission sekarang terlalu luas.
2. Buat migration catatan Bank Data.
3. Buat endpoint daftar, tambah, dan selesaikan catatan.
4. Gabungkan catatan ke detail Bank Data.
5. Batasi menu BPS menjadi Bank Data dan Akun.
6. Pertahankan catatan pelaporan lama sebagai histori.

Kriteria selesai:

- BPS dapat memantau dan mencatat tanpa mengubah data;
- catatan terlihat oleh Developer dan BAPPERIDA;
- penyelesaian tercatat pada audit;
- BPS tidak dapat mengimpor, memetakan, atau menerbitkan.

## Fase D - Pindahkan dashboard ke BAPPERIDA

1. Cabut menu dashboard dari Bupati.
2. Tambahkan Dashboard Analisis ke BAPPERIDA.
3. Ubah label dan bantuan.
4. Gunakan shell internal, bukan portal Bupati.
5. Pertahankan filter dan konteks saat membuka detail.
6. Uji data draf, terbit, dan Bank Data agar labelnya jelas.

Kriteria selesai:

- Bupati tidak dapat membuka dashboard;
- BAPPERIDA memiliki dashboard lengkap;
- data privat tetap terlindungi;
- alur analisis ke tindakan tidak bolak-balik.

## Fase E - Chat Bupati dan riwayat

1. Tambahkan API daftar dan pembukaan sesi.
2. Tambahkan judul otomatis, ubah judul, dan arsip.
3. Ganti local storage sebagai sumber utama dengan database.
4. Bangun sidebar riwayat desktop dan drawer ponsel.
5. Buat Percakapan baru.
6. Muat pesan, grafik, tabel, sumber, dan status kecukupan.
7. Hapus navigasi dashboard lama dari Bupati.
8. Arahkan login Bupati langsung ke Tanya Sababuka.

Kriteria selesai:

- riwayat tetap tersedia setelah logout dan login ulang;
- sesi lama dapat dibuka;
- sesi pengguna lain ditolak;
- tampilan desktop dan ponsel lulus pemeriksaan;
- jawaban hanya memakai data yang diizinkan;
- Bupati tidak perlu berpindah ke dashboard untuk melihat bukti utama.

## Fase F - OpenAPI, test, dokumentasi, dan panduan

1. Lengkapi OpenAPI untuk role, Bank Data notes, impor manual, mapping, dan chat history.
2. Regenerasi tipe frontend.
3. Tambahkan integration test RBAC.
4. Tambahkan Playwright lintas peran.
5. Uji desktop, tablet, dan ponsel.
6. Perbarui `PRODUCT.md`, `role-workflow.md`, `external-connectors.md`, README, AGENTS, dan CLAUDE.
7. Ambil ulang capture dan perbarui buku panduan Bupati serta OPD.

Kriteria selesai:

- tidak ada dokumentasi yang menyebut Walidata aktif;
- seluruh route aktif tercakup OpenAPI;
- seluruh test database berjalan tanpa skip pada CI rilis;
- panduan sesuai UI final.

## 11. Pengujian penerimaan

### Role

- akun Diskominfosantik masuk sebagai OPD dan hanya melihat organisasi sendiri;
- role `kominfo` tidak dapat dipilih atau diberikan;
- BPS hanya melihat Bank Data dan Akun;
- BAPPERIDA dapat membuka Dashboard Analisis dan Mapping;
- Developer dapat mengimpor tetapi tidak mengambil keputusan mapping substansi;
- Bupati langsung masuk ke percakapan.

### Konektor

- payload scheduled ditolak;
- payload auto import ditolak;
- tidak ada proses latar yang mengambil data;
- satu impor hanya terjadi setelah klik dan konfirmasi Developer;
- impor mencatat sumber dan audit;
- BAPPERIDA tidak dapat mengimpor;
- Developer tidak dapat mengubah mapping tanpa permission yang sesuai.

### BPS

- catatan baru tersimpan pada seri yang tepat;
- snapshot konteks tidak berubah saat seri diperbarui;
- catatan terbuka dapat difilter;
- penyelesaian memerlukan catatan;
- BPS tidak dapat menyelesaikan catatannya sendiri bila kebijakan pemisahan petugas diterapkan.

### Bupati

- percakapan baru tersimpan;
- riwayat muncul setelah login ulang;
- judul dapat diubah;
- sesi dapat diarsipkan dan dipulihkan bila fitur pemulihan disediakan;
- akses ke sesi pengguna lain menghasilkan 403 atau 404;
- pesan ganda tidak tercipta saat koneksi lambat;
- sumber, tahun, dan label verifikasi tampil;
- tampilan 390 px tidak meluap horizontal;
- composer tidak tertutup keyboard atau safe area.

## 12. Pembagian pull request

1. PR 1: migration role dan matriks permission baru.
2. PR 2: hapus scheduler, auto import, dan UI konektor lama.
3. PR 3: Sumber dan Impor Developer serta Pemetaan Seri Data BAPPERIDA.
4. PR 4: Bank Data dan catatan BPS.
5. PR 5: Dashboard Analisis BAPPERIDA.
6. PR 6: API riwayat dan UI percakapan Bupati.
7. PR 7: OpenAPI, E2E, dokumentasi, dan buku panduan.

Setiap PR wajib memiliki migration impact, test, screenshot untuk UI, rollback, dan pembaruan log rencana.

## 13. Hal yang tidak boleh dilakukan

- menghapus role `kominfo` secara fisik bila merusak audit lama;
- menghapus catatan pembinaan lama;
- menghapus provenance impor;
- memindahkan mapping ke Developer;
- memberi BPS izin mengubah data;
- memberi Bupati akses ke data draf;
- menjadikan percakapan hanya tersimpan di browser;
- menambah streaming, unggahan berkas, atau fitur chat lain sebelum riwayat dasar stabil;
- mengubah produksi sebelum backup, test database uji, dan persetujuan pemilik.

## 14. Status pelaksanaan

| Fase | Status | Catatan |
| --- | --- | --- |
| A. Baseline | Sedang dikerjakan | Inventori kode dan working tree selesai. DB uji lokal (PostgreSQL 16 WSL) tersedia; dump sebelum migration dibuat (hilang saat WSL restart, DB uji tetap ada). |
| B. Role dan otomatisasi | Sedang dikerjakan | Migration 087, penghapusan scheduler, route lama, dan UI otomatisasi sudah ditulis. Migration 087 berhasil pada DB uji berisi data (36 pengguna utuh, role kominfo nonaktif, akun Diskominfosantik menjadi OPD, riwayat dipertahankan) dan pada DB kosong 001-089. |
| C. Bank Data BPS | Sedang dikerjakan | Migration 089, API catatan pembinaan, RBAC, audit, dan UI modal Bank Data sudah ditulis. Uji integrasi database nyata lulus (110 dari 110). |
| D. Dashboard BAPPERIDA | Sedang dikerjakan | Menu, label, redirect, dan permission dipindahkan ke BAPPERIDA. Matriks akses terverifikasi pada database nyata: menu dashboard hanya BAPPERIDA, Bupati dan Developer ditolak di /executive/dashboard. |
| E. Chat Bupati | Sedang dikerjakan | Migration 088, API riwayat, idempotensi pesan, sidebar desktop, drawer ponsel, judul, arsip, dan pemulihan sudah ditulis. Uji browser mock lulus, uji integrasi dan uji browser dengan database nyata lulus (kirim, muat ulang, judul, arsip, pulihkan). |
| F. Test dan dokumentasi | Sedang dikerjakan | OpenAPI dan tipe frontend diperbarui. Type-check, unit test, build, deteksi UI, serta Playwright mock Bupati dan BPS lulus. Integration test tanpa skip lulus 110 dari 110 pada DB kosong. Playwright dengan database nyata lulus 7 dari 7. Buku panduan belum selesai. |

## 15. Instruksi untuk Claude Code

1. Baca `AGENTS.md`, `CLAUDE.md`, dokumen 29, dan dokumen ini.
2. Dokumen ini menjadi sumber utama untuk perubahan peran dan UI yang diputuskan 21 November 2026.
3. Keputusan di dokumen ini mengungguli catatan lama mengenai Walidata dan portal dashboard Bupati.
4. Jangan mulai dari UI. Mulai dari audit assignment role, permission, dan data yang terdampak.
5. Jangan menghapus histori atau audit.
6. Kerjakan satu fase dan satu pull request pada satu waktu.
7. Setelah setiap pekerjaan, perbarui tabel status dan tambahkan log pelaksanaan.
8. Jika menemukan konflik dengan keputusan pemilik, hentikan fase dan minta keputusan sebelum mengubah kode.

## 16. Log pelaksanaan

### 21 November 2026 - Rencana dibuat

- Keputusan penghapusan peran Diskominfosantik sebagai Walidata dicatat.
- Diskominfosantik direncanakan menjadi OPD biasa.
- Pengaturan sumber dan impor manual dipindahkan ke Developer.
- Mapping tetap menjadi tugas BAPPERIDA.
- BPS dirancang hanya memakai Bank Data dan catatan pembinaan.
- Dashboard Analisis dipindahkan ke BAPPERIDA.
- Bupati dirancang langsung masuk ke Tanya Sababuka dengan riwayat percakapan tersimpan.
- Tidak ada perubahan kode atau database pada tahap ini.

### 21 November 2026 - Implementasi branch dan gerbang verifikasi

- Branch kerja: `codex/sederhanakan-peran-chat-bupati`.
- Migration baru yang belum diterapkan: `087_penyederhanaan_peran_dan_impor_manual.sql`, `088_riwayat_chat_bupati.sql`, dan `089_catatan_pembinaan_bank_data.sql`.
- Role `kominfo` dinonaktifkan melalui migration dan akun aktifnya direncanakan menjadi OPD Diskominfosantik tanpa menghapus histori assignment atau audit.
- Scheduler konektor dihapus dari proses server. Route sinkronisasi, impor run, express import, dan UI jadwal atau impor otomatis dihapus dari permukaan aktif.
- Halaman Developer disederhanakan untuk pengaturan sumber, pratinjau, impor manual, dan riwayat impor. Pemetaan tetap dibatasi untuk BAPPERIDA.
- Bank Data BPS mendapat catatan pembinaan yang menyimpan snapshot konteks dan tidak mengubah nilai. Penyelesaian catatan tercatat pada audit.
- Dashboard Analisis dipindahkan dari Bupati ke BAPPERIDA. Bupati diarahkan ke `/assistant` dan `/dashboard` tidak lagi menjadi tujuan Bupati.
- Tanya Sababuka mendapat riwayat server, percakapan baru, ganti judul, arsip, pulihkan, idempotensi pengiriman, grafik, tabel, sumber, sidebar desktop, dan drawer ponsel.
- Penyimpanan browser hanya dipakai untuk draf pertanyaan yang belum dikirim. Pesan dan sesi dibaca dari server.
- OpenAPI diperbarui dan tipe `frontend/src/generated/api-schema.d.ts` digenerasi ulang.
- Type-check frontend dan backend lulus. Build frontend lulus. Test frontend lulus 6 dari 6. Test backend lulus 99 dengan 11 test database dilewati karena PostgreSQL tidak tersedia.
- Playwright dengan API tiruan lulus 2 dari 2 untuk chat Bupati desktop dan ponsel serta Bank Data BPS. Tidak ada `pageerror` atau galat konsol. Tangkapan layar audit berada di `.impeccable/` dan tidak untuk di-commit.
- Pemeriksaan `impeccable detect` pada perubahan UI menghasilkan nol temuan.
- Masalah scroll yang membuat bilah atas menumpuk di atas percakapan ditemukan melalui tangkapan layar, diperbaiki, dan dilindungi assertion `window.scrollY = 0` pada uji browser.
- Gerbang rilis masih tertutup. PostgreSQL lokal port 5432 tidak tersedia dan WSL Docker tidak tersedia, sehingga migration dari salinan database, uji integrasi tanpa skip, backup, rollback, dan pemeriksaan pascamigrasi belum dapat dilakukan.
- Claude harus melanjutkan dari pengujian migration pada PostgreSQL terisolasi. Jangan menerapkan migration ke produksi sebelum backup baru, hasil before-after, seluruh integration test tanpa skip, dan persetujuan pemilik tersedia.


### 23 November 2026 - Validasi migration dan integration test pada PostgreSQL

- PostgreSQL 16 di WSL dinyalakan (`wsl -u root`, keeper `sleep 36000` agar WSL tidak mati). Migration 087-089 diterapkan ke `sababuka_test` (086 menjadi 089) tanpa kehilangan data; sebelumnya dump dibuat.
- Database kosong `sababuka_it` dibangun dari nol (postgis, pgcrypto, citext, migration 001-089, `test:seed-users`). Seluruh backend test: 110 lulus, 0 skip, 0 gagal. Type-check backend bersih.
- Regresi lama diperbaiki (commit a307a35): aksi `/indicator-versions/:id/actions/:action` menolak body kosong dengan 400 sehingga submit, approve, verify, activate, retire dari UI gagal. Perbaikan: `preValidation` di `governance.ts` menganggap body kosong sebagai objek kosong.
- Tes disesuaikan dengan keputusan 21 Nov: menu dashboard tidak lagi wajib bagi Superadmin; Dashboard Analisis dibaca BAPPERIDA, bukan Bupati.
- Catatan: seed integrasi menimpa kata sandi `developer@` dan `bupati@` pada DB `sababuka_test`. Tes integrasi dirancang untuk DB bersih (fixture email tetap), jadi jalankan di DB baru, bukan DB yang sudah dipakai berulang.
- Sisa: Playwright dengan database nyata (chat Bupati, Bank Data BPS), buku panduan, backup baru dan rencana rollback produksi, persetujuan pemilik sebelum produksi.

### 24 November 2026 - Playwright dengan database nyata

- Backend dan Vite dijalankan terhadap PostgreSQL WSL `sababuka_test`. Spec baru `backend/e2e/real-db.spec.ts` (kata sandi lewat `SABABUKA_REALDB_PASSWORD`): riwayat chat Bupati tersimpan di server, Bupati dialihkan dari `/dashboard` dan `/dashboard/bank-data` serta ditolak 403 oleh `/executive/dashboard`, dan catatan pembinaan BPS tersimpan setelah muat ulang. Seluruh suite Playwright lokal: 7 dari 7 lulus, dua kali berturut-turut.
- Bug ditemukan hanya oleh database nyata dan diperbaiki: `bank-data-guidance-service.ts` memakai tabel `sababuka.reporting_periods` yang tidak ada (galat 42P01, daftar catatan pembinaan gagal dimuat). Diganti `sababuka.periods` dengan `p.code::int`, sama seperti katalog Bank Data.
- Catatan lingkungan: WSL mati sendiri; jalankan keeper `wsl -d Ubuntu -u root -- sleep 36000` lalu `service postgresql start`. Akun uji `bupati@`, `developer@`, `bapperida@` pada DB uji diset `must_change_password=false`.
- Sisa sebelum produksi: buku panduan, backup produksi baru dan rencana rollback (sudah ada menurut pemilik), serta persetujuan pemilik.

### 24 November 2026 - Angka desimal dan bukti dukung

- Angka realisasi tampil sesuai input (1,234 tidak lagi menjadi 1,2340000000 pada isian): util `number-format.ts`, diterapkan pada form capaian, target indikator, publikasi, dan konsolidasi.
- Bukti dukung dihapus dari pelaporan OPD (4 endpoint, UI unggah, panel, OpenAPI). Tabel dan berkas lama dipertahankan. Backup lokal saja sampai keputusan lanjutan pemilik.
