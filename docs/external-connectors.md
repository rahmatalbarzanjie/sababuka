# Konektor sumber eksternal

SABABUKA memakai konektor eksplisit untuk menghubungkan indikator tahunan dengan sumber resmi. Konektor tidak mencocokkan judul secara otomatis dan tidak menimpa data manual.

## Sumber yang tersedia

- **Satu Data Kapuas** memakai katalog CKAN. Pencarian katalog tersedia dari menu Konektor dan mengambil metadata paket/resource. Resource CSV atau JSON harus dipilih dan dipetakan ke indikator tertentu.
- **BPS Kabupaten Kapuas** memakai WebAPI BPS. Status awalnya `Menunggu API key` sampai `BPS_API_KEY` diatur di environment backend. Setelah key tersedia, mapping membutuhkan URL endpoint resource BPS yang eksplisit.

Superadmin dapat mengelola key BPS dari **Konfigurasi Sistem → API BPS Kabupaten Kapuas**. Tombol **Simpan & Uji Koneksi** menguji key lebih dulu, lalu menyimpannya dalam bentuk terenkripsi dengan `CONNECTOR_ENCRYPTION_KEY`. Nilai key tidak pernah dikembalikan ke browser, log, audit, atau pesan error. Tombol **Nonaktifkan / Hapus key** menghapus ciphertext dari database. `BPS_API_KEY` environment tetap dibaca sebagai fallback kompatibilitas, tetapi tidak dapat ditulis dari aplikasi.

Tombol **Simpan & Uji Koneksi** menyimpan key terenkripsi walau uji koneksi gagal, sehingga operator tidak perlu mengetik ulang; status gagal dan alasannya ditampilkan. Setiap uji dicatat sebagai riwayat append-only pada `connector_check_history` (maksimal 100 entri terakhir per sumber, migration 054) dan ditampilkan di panel API BPS. Key dan respons mentah tidak ikut tersimpan di riwayat.

Contoh konfigurasi lokal ada di `backend/.env.example`. Jangan menyimpan API key di Git, seed, atau metadata dataset.
Skrip demo menyimpan master key konektor di `backend/tmp/connector-encryption-key` yang di-ignore Git agar ciphertext tetap bisa dibuka setelah restart lokal; environment produksi harus menyediakan `CONNECTOR_ENCRYPTION_KEY` dari secret manager.

## Alur penggunaan

1. Cari resource di katalog atau siapkan endpoint BPS.
2. Buat mapping draf ke satu versi indikator tahunan. Mapping wajib mencantumkan field tahun, nilai, dan kode wilayah; rentang yang diterima 2024-2029 (periode jabatan bupati; konstanta `CONNECTOR_YEAR_MIN`/`CONNECTOR_YEAR_MAX` dan CHECK `connector_staging_year_check`, migration 053). Target RPJMD tetap 2025-2029 dan wilayah default Kabupaten Kapuas `6203`.
3. BAPPERIDA menyetujui lalu mengaktifkan mapping.
4. Jalankan **Preview sinkronisasi**. Data diambil ke staging, divalidasi tahun, wilayah, nilai numerik, dan satuan. Baris yang tidak valid ditahan dan tidak masuk batch.
5. Tinjau preview, lalu impor. Impor membuat batch `api_import` terpisah dengan checksum, URL, waktu pengambilan, dan status sumber `verified_direct`; batch manual tidak diubah.

Tombol **Uji koneksi** pada setiap konektor menampilkan profile terukur: keterjangkauan, waktu respons, identitas platform, jumlah dataset dan resource yang dapat diproses, publisher, cakupan tahun, serta error yang sudah disanitasi. Profile juga menampilkan kandidat kategori dan indikator yang sudah `approved` atau `active` saja. Skor dan alasan kata kunci hanya bahan review; kandidat tidak pernah otomatis membuat master baru, menyetujui mapping, atau mengimpor nilai. Endpoint website/API OPD dapat ditambahkan dengan kontrak profile yang sama, tetapi belum dinyatakan terhubung sampai konektornya benar-benar diimplementasikan.

Konektor hanya bertugas mengambil realisasi dari sumber resmi. Target RPJMD/Renstra tetap menjadi data perencanaan yang dikelola di SABABUKA. Jika dua sumber menghasilkan angka berbeda, buat mapping sumber pendukung dan tahan keputusan sampai diverifikasi, jangan memilih diam-diam.

## Hak akses

Ruang konektor, mapping kandidat, dan isi preview staging hanya dapat dibuka oleh akun Developer atau Superadmin dengan role `superadmin` berscope `global`. Pemeriksaan ini diterapkan pada API, bukan hanya dengan menyembunyikan menu. Walidata, BPS, OPD, BAPPERIDA, dan pimpinan tidak dapat membaca nilai mentah staging.

Mapping kandidat boleh dibuat untuk indikator berstatus `opd_verification`. Mapping draf boleh menjalankan preview, tetapi tidak dapat disetujui, diaktifkan, dijadwalkan, atau diimpor sampai indikator berstatus `approved` atau `active`. Preview tidak menulis ke `data_batches`, `observations`, dashboard pimpinan, maupun publikasi.

## Rujukan data untuk OPD (hanya-baca)

Saat mengusulkan atau menyusun indikator, OPD dapat membuka panel "Cari rujukan data" di formulir indikator untuk menelusuri katalog Satu Data Kapuas. Endpoint `GET /reference/datasets` memakai izin `reference.search` (OPD, BAPPERIDA, Superadmin) dan dibatasi 20 permintaan per menit.

- Hanya metadata yang dikembalikan: judul, deskripsi singkat, organisasi, format, jumlah resource, dan tautan halaman dataset. URL resource, kredensial, dan nilai data tidak pernah ikut.
- Tombol "Pakai sebagai sumber data" hanya mengisi kolom teks sumber data; OPD tetap mengisi dan menyetujui seluruh isi indikator secara manual.
- Panel ini tidak membuat mapping, staging, atau impor. Rujukan BPS menyusul setelah penelusur BPS tersedia.

## Retensi dan penghapusan staging

- Nilai mentah pada `connector_staging_values` disimpan maksimal 90 hari sejak connector run dibuat.
- Pembersihan diperiksa otomatis oleh scheduler backend setiap menit, serta saat daftar mapping dibuka, preview baru dijalankan, atau riwayat preview dibaca.
- Setelah masa retensi, nilai mentah dihapus dan `staging_purged_at` dicatat.
- Ringkasan run, checksum, URL sumber, waktu pengambilan, dan audit event tetap disimpan untuk ketertelusuran.
- Jika preview masih dibutuhkan setelah masa retensi, Developer harus mengambil ulang sumber untuk membuat run baru.
- Perubahan masa retensi harus dibuat melalui migration baru dan dicatat pada dokumen ini; jangan menonaktifkan pembersihan hanya dari UI.
