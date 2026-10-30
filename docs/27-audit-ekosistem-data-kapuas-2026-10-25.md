# Audit Ekosistem Data Kabupaten Kapuas

**Bahan paparan untuk BAPPERIDA Kabupaten Kapuas** · **Tanggal penyusunan:** 25 Oktober 2026
**Status:** temuan teknis untuk pengambilan keputusan, bukan penilaian kinerja OPD

## 1. Tujuan

Audit ini memotret kondisi sumber data yang dapat menjadi fondasi SABABUKA BERSINAR. Pemeriksaan mencakup:

- seri publikasi *Kabupaten Kapuas Dalam Angka* 2017-2026;
- katalog CKAN Satu Data Kabupaten Kapuas;
- kemampuan SABABUKA saat ini dalam menerima, memverifikasi, dan menyajikan data eksternal;
- risiko kualitas, duplikasi, perubahan definisi, provenance, dan kesinambungan seri waktu.

Audit tidak menilai benar atau salahnya substansi setiap angka. Validasi substansi tetap memerlukan produsen data, walidata, pembina statistik, dan BAPPERIDA.

## 2. Prinsip audit

1. Setiap angka temuan mempunyai tanggal snapshot, metode hitung, dan sumber.
2. Kegagalan ekstraksi tidak diperlakukan sebagai ketiadaan data.
3. Jumlah tabel tidak disamakan dengan jumlah indikator.
4. Perbedaan antar-sumber tidak dirata-ratakan atau dipilih otomatis.
5. Kesimpulan analitis dipisahkan dari fakta hasil pengukuran.

Artefak audit BPS tersimpan pada:

- `research/output/bps-kapuas-dalam-angka-2017-2026-audit.json`;
- `research/output/bps-kapuas-dalam-angka-2017-2026-ringkasan.csv`;
- `research/audit_bps_history.py` sebagai prosedur reproduksi.

Snapshot audit CKAN tersimpan pada `research/output/ckan-audit.json` dan dibuat oleh `research/audit_ckan.mjs`.

## 3. Temuan utama

### 3.1 BPS menyediakan seri tahunan yang kuat, tetapi tidak seluruh edisi siap diproses dengan cara yang sama

Sepuluh halaman publikasi resmi BPS Kabupaten Kapuas untuk edisi 2017-2026 berhasil diidentifikasi. Audit mencatat URL halaman, URL unduhan, ukuran berkas, jumlah halaman, dan SHA-256 setiap PDF. PDF hanya dipakai pada proses audit sementara; berkas mentah tidak perlu menjadi penyimpanan produksi SABABUKA.

| Edisi | Halaman PDF | Halaman dengan teks yang dapat diekstrak | Inventaris tabel hasil rekonsiliasi | Catatan |
|---:|---:|---:|---:|---|
| 2017 | 386 | 346 | 170 | Teks tersedia; format dan susunan lebih lama |
| 2018 | 398 | 351 | 173 | Inventaris tabel terbesar pada rentang audit |
| 2019 | 418 | 361 | 154 | Struktur mulai berubah dibanding 2018 |
| 2020 | 461 | 1 | Tidak dapat dihitung otomatis | Hampir seluruh isi berbasis gambar; memerlukan OCR atau pemeriksaan manual |
| 2021 | 461 | 404 | 136 | Kembali memiliki lapisan teks yang memadai |
| 2022 | 464 | 406 | 134 | Struktur relatif dekat dengan 2021 |
| 2023 | 444 | 382 | 123 | Ada penyederhanaan atau konsolidasi tabel |
| 2024 | 448 | 421 | 119 | Jumlah tabel terdeteksi terendah di antara edisi berbasis teks |
| 2025 | 454 | 426 | 128 | Jumlah tabel kembali bertambah |
| 2026 | 430 | 403 | 129 | Secara volume dekat dengan edisi 2025 |

**Batas interpretasi:** inventaris di atas menghitung identitas tabel yang direkonsiliasi dari daftar tabel dan badan publikasi. Angka tersebut tidak menunjukkan jumlah indikator unik. Satu tabel dapat memuat banyak variabel, sedangkan satu indikator dapat muncul pada lebih dari satu tabel.

### 3.2 Pola perubahan BPS tidak mendukung pemetaan berdasarkan nomor tabel saja

Tema besar publikasi bertahan lintas tahun: geografi dan iklim, pemerintahan, penduduk dan ketenagakerjaan, sosial, pertanian, energi, perdagangan, transportasi, keuangan, pengeluaran, PDRB, dan perbandingan wilayah. Namun pada tingkat tabel terjadi:

- penambahan dan penghapusan tabel;
- penggabungan tabel yang sebelumnya terpisah;
- perubahan judul, cakupan tahun, satuan, klasifikasi, dan instansi sumber;
- perubahan susunan bab serta nomor tabel;
- jeda keterbacaan mesin pada edisi 2020.

Implikasinya, SABABUKA perlu mencocokkan data berdasarkan konsep, definisi, satuan, wilayah, periode, sumber, dan versi metodologi. Nomor tabel hanya menjadi locator dokumen, bukan identitas indikator permanen.

### 3.3 Satu Data Kapuas sudah memiliki katalog besar, tetapi distribusi dan metadatanya belum seimbang

Snapshot CKAN diperbarui pada 25 Oktober 2026. Hasil pemetaan organisasi tidak berubah dibanding snapshot 13 September 2026 dan mencatat:

| Ukuran | Hasil terukur |
|---|---:|
| Dataset yang dilaporkan portal | 3.927 |
| Dataset yang terpetakan ke 25 organisasi pada hasil `package_search` per organisasi | 3.906 |
| Dataset yang perlu direkonsiliasi terhadap organisasi | 21 |
| Resource pada dataset yang terpetakan | 4.009 |
| Dataset pada dua organisasi katalog terbesar | 3.812 atau 97,6% dari dataset terpetakan |
| Dataset tanpa lisensi yang disebutkan | 3.833 atau 98,1% |
| Dataset tanpa tag | 1.608 atau 41,2% |
| Resource geospasial teridentifikasi | 93 |

Dua koleksi terbesar adalah:

- **Data Pemerintah Kabupaten Kapuas 2025:** 2.061 dataset;
- **Data PPID Kabupaten Kapuas 2011-2026:** 1.751 dataset.

Konsentrasi tersebut berarti angka katalog tinggi belum otomatis mencerminkan pemerataan kesiapan data OPD. Sebagian OPD hanya mempunyai sedikit dataset dan beberapa belum mempunyai dataset.

### 3.4 Deskripsi tersedia tidak selalu berarti metadata sudah bermutu

Snapshot menemukan deskripsi pada seluruh dataset yang terpetakan, tetapi audit kuantitatif ini tidak membuktikan bahwa deskripsi tersebut:

- spesifik terhadap dataset;
- menjelaskan definisi variabel;
- menyebut satuan, cakupan wilayah, periode, dan frekuensi;
- mencantumkan metodologi atau batas penggunaan;
- konsisten dengan isi resource.

Karena itu kelengkapan metadata harus dinilai per-field, bukan hanya dari keberadaan kolom deskripsi.

### 3.5 Format terstruktur tersedia, tetapi kesiapan analitik masih perlu diuji sampai isi file

Snapshot mencatat 1.921 resource berformat yang berpotensi diproses mesin. Angka ini mencakup CSV, XLS/XLSX, JSON, GeoJSON, KML, SHP, WMS, atau WFS. Format file belum membuktikan bahwa isinya mempunyai:

- satu baris per observasi;
- tipe numerik yang konsisten;
- kode wilayah baku;
- periode yang eksplisit;
- unit dan definisi;
- identitas indikator yang stabil;
- nilai kosong dan nol yang dibedakan dengan benar.

Audit isi perlu dijalankan per kelompok prioritas sebelum suatu resource masuk ke data mart SABABUKA.

### 3.6 Data geospasial perlu diperlakukan sebagai paket, bukan file terpisah

Sebagian besar resource geospasial teridentifikasi berada pada DPUPR. Komponen SHP, SHX, DBF, dan PRJ merupakan satu paket. Portal dan SABABUKA perlu mencatat sistem koordinat, skala, tanggal representasi, pemilik layer, klasifikasi akses, serta kode wilayah.

### 3.7 Konektor SABABUKA saat ini belum mencakup seluruh sejarah data

Kode dan skema konektor aktif masih berfokus pada periode RPJMD 2025-2029 serta pola parsing tertentu. Kondisi ini memadai untuk pilot terkontrol, tetapi belum cukup untuk:

- memuat seri historis 2017-2024 secara umum;
- menangani perubahan definisi lintas edisi;
- membaca struktur XLSX yang beragam;
- menyimpan marker putus seri;
- membuat katalog dokumen yang file aslinya tetap berada di sumber.

## 4. Kondisi kesiapan saat ini

| Lapisan | Status | Penjelasan |
|---|---|---|
| Katalog sumber | Sebagian siap | CKAN dan BPS mempunyai jalur publik yang dapat diinventarisasi |
| Metadata minimum | Perlu penguatan | Lisensi, tag, definisi, frekuensi, dan kualitas metadata belum merata |
| File terstruktur | Tersedia, belum seragam | Format mesin tersedia tetapi skema isi perlu diuji |
| Seri waktu | Belum kanonik | Perubahan tabel dan definisi belum dipetakan sebagai versi konsep |
| Provenance | Fondasi tersedia di SABABUKA | Perlu diperluas sampai locator tabel/halaman dan checksum resource |
| Geospasial | Kandidat pilot | Memerlukan standardisasi paket dan kode wilayah |
| Analitik pimpinan | Fondasi tersedia | Hanya boleh memakai data disetujui dan dipublikasikan |
| Machine learning | Belum layak untuk semua indikator | Kelayakan harus diuji per seri dan melalui backtesting |

## 5. Implikasi untuk BAPPERIDA

1. BAPPERIDA perlu menetapkan kamus indikator dan konteks penggunaan, bukan hanya daftar file.
2. OPD tetap menjadi pemilik substansi data sektoral.
3. Walidata menjaga standar, metadata, dan pertukaran data.
4. BPS membina konsep, metodologi, klasifikasi, serta kualitas statistik.
5. SABABUKA menyimpan fakta terstruktur dan provenance, sedangkan dokumen asli tetap di sumber resmi.
6. Perbedaan angka ditampilkan bersama definisi dan status verifikasi. Sistem tidak memilih atau merata-ratakan otomatis.

## 6. Keputusan prioritas yang disarankan

### Prioritas tata kelola

- Rekonsiliasi 21 dataset yang belum terpetakan ke organisasi.
- Tetapkan metadata wajib: produsen, walidata, definisi, satuan, periode, wilayah, frekuensi, lisensi, akses, dan tanggal pemutakhiran.
- Gunakan ID kanonik untuk indikator, wilayah, organisasi, dataset, resource, dan versi metodologi.
- Tetapkan prosedur koreksi dan supersesi data.

### Prioritas teknis

- Bangun **Bank Data Kapuas** sebagai katalog metadata dan data terstruktur.
- Pertahankan file PDF/XLSX/ZIP pada sumber resmi; SABABUKA menyimpan tautan, checksum, status tautan, locator, dan hasil ekstraksi yang disetujui.
- Tambahkan pemeriksaan tautan, perubahan checksum, duplikasi resource, dan keterlambatan pembaruan.
- Pisahkan staging, canonical observations, published data mart, dan analytical features.

### Prioritas analitik

- Mulai dari statistik deskriptif yang dapat diaudit: perubahan tahunan, capaian target, volatilitas, ketimpangan wilayah, missingness, dan anomali.
- Jalankan proyeksi hanya pada seri yang cukup panjang, stabil, dan lolos backtesting.
- Gunakan model bahasa untuk menyusun narasi dari fakta yang sudah dihitung, bukan untuk menghasilkan angka.

## 7. Sumber resmi

- BPS Kabupaten Kapuas, halaman publikasi *Kabupaten Kapuas Dalam Angka* 2017-2026: `https://kapuaskab.bps.go.id/id/publication`
- Satu Data Kabupaten Kapuas, CKAN API: `https://satudata.kapuaskab.go.id/api/3/action`
- Kode dan migration SABABUKA pada branch aktif repository ini.

## 8. Keterbatasan audit

- Snapshot CKAN menggambarkan kondisi saat pengambilan data, bukan kondisi permanen portal.
- Audit katalog belum memvalidasi kebenaran substantif seluruh isi 4.009 resource.
- Edisi BPS 2020 memerlukan OCR atau pemeriksaan manual untuk inventaris tabel penuh.
- Kesamaan judul tidak otomatis berarti kesamaan konsep; perubahan metodologi harus dikonfirmasi oleh produsen data atau BPS.
- Rekomendasi prioritas bukan penetapan resmi dan perlu disepakati dalam forum tata kelola data.
