# Blueprint Bank Data Kapuas dan Analitik SABABUKA

**Versi rancangan:** 25 Oktober 2026
**Status:** siap diterjemahkan menjadi backlog produk, migration, kontrak API, dan implementasi bertahap

## 1. Sasaran

Bank Data Kapuas menghimpun metadata, seri indikator, observasi terverifikasi, dan hubungan antar-sumber mengenai Kabupaten Kapuas. Dokumen besar tetap berada pada sumber resmi. SABABUKA menyimpan informasi yang dibutuhkan untuk pencarian, pembandingan, audit, dan analisis.

Keberhasilan diukur dari kemampuan pengguna untuk:

- menemukan data tanpa mengetahui instansi penerbitnya terlebih dahulu;
- memahami definisi, satuan, periode, wilayah, dan kualitasnya;
- membuka file asli pada sumber resmi;
- menelusuri setiap angka sampai ke dataset, resource, tabel/halaman, dan versi;
- menggunakan data terpublikasi sebagai bukti dashboard pimpinan;
- menjalankan analitik lanjutan tanpa mengabaikan kewenangan dan kualitas data.

## 2. Arsitektur informasi

### Menu utama

Tambahkan **Bank Data Kapuas** sebagai satu menu utama. Subfitur ditempatkan sebagai tab di dalam halaman agar sidebar tidak penuh.

| Tab | Tujuan | Pengguna utama |
|---|---|---|
| Jelajah Data | Pencarian terpadu berdasarkan tema, wilayah, periode, produsen, dan kualitas | Semua pengguna |
| Indikator & Seri Waktu | Nilai terstruktur, tren, target, revisi, dan putus seri | BAPPERIDA, pimpinan, peneliti |
| Dataset & Dokumen | Katalog dataset dan resource eksternal | Semua pengguna sesuai akses |
| Sumber Data | Profil produsen, portal, API, dan riwayat kesehatan sumber | Walidata, BAPPERIDA |
| Kualitas Data | Missingness, duplikasi, link rot, anomali, keterlambatan, dan isu metadata | Walidata, BPS, pengelola |

**Pusat Sinkronisasi Data** tetap terpisah. Bank Data berfungsi untuk menemukan dan memakai data; Pusat Sinkronisasi dipakai operator untuk mapping, staging, validasi, dan impor.

## 3. Model konseptual

```text
Source
  └── Dataset
        ├── Dataset version
        ├── External resource
        ├── Metadata profile
        └── Indicator mapping
              └── Observation
                    ├── Provenance locator
                    ├── Quality result
                    ├── Approval/publication
                    └── Analytical result
```

### Entitas minimum

#### Source

- nama dan jenis sumber;
- organisasi pemilik;
- domain resmi;
- metode akses: CKAN, API, halaman publikasi, file terjadwal, manual;
- klasifikasi akses;
- frekuensi yang diharapkan;
- waktu pemeriksaan terakhir dan status kesehatan.

#### Dataset

- ID kanonik;
- judul dan deskripsi;
- produsen serta walidata;
- tema dan urusan pemerintahan;
- cakupan waktu dan wilayah;
- frekuensi;
- lisensi;
- metodologi;
- klasifikasi akses;
- status kurasi.

#### External resource

- URL sumber asli;
- format, MIME type, ukuran;
- tanggal modifikasi sumber;
- ETag/checksum jika tersedia;
- waktu pemeriksaan terakhir;
- status tautan;
- kebijakan pembukaan: langsung, peringatan domain luar, atau memerlukan autentikasi.

#### Indicator concept

- kode dan nama indikator;
- definisi operasional;
- satuan;
- arah kinerja;
- agregasi yang sah;
- dimensi wilayah/kelompok;
- pemilik substansi;
- aturan pembulatan;
- versi metodologi dan tanggal berlaku.

#### Observation

- indikator;
- nilai serta status nilai kosong/nol;
- periode referensi;
- wilayah;
- dimensi disagregasi;
- dataset dan versi;
- locator tabel, halaman, sheet, sel, atau endpoint;
- status validasi, persetujuan, dan publikasi;
- waktu pengambilan dan checksum sumber.

## 4. Kebijakan penyimpanan

### Tidak disimpan dalam aplikasi produksi

- PDF, XLSX, CSV besar, ZIP, dan shapefile asli;
- salinan dokumen publik yang sudah tersedia pada sumber resmi;
- cache berkas tanpa masa retensi dan tujuan audit yang jelas.

### Disimpan dalam SABABUKA

- metadata katalog;
- URL dan identitas resource;
- checksum, ETag, ukuran, tanggal sumber;
- fakta/observasi yang telah dinormalisasi;
- provenance dan locator;
- hasil pemeriksaan kualitas;
- status workflow dan audit trail;
- hasil analitik yang dapat direproduksi.

File boleh berada sementara pada proses sinkronisasi. Setelah parsing dan verifikasi teknis selesai, file dihapus menurut kebijakan retensi staging. Bila regulasi mewajibkan arsip bukti, arsip ditempatkan pada repositori dokumen resmi atau object storage terpisah.

## 5. Alur data

```text
Daftar sumber
    ↓
Discovery metadata
    ↓
Pemeriksaan URL, format, checksum, dan lisensi
    ↓
Unduh sementara / panggil API
    ↓
Staging terisolasi
    ↓
Validasi tipe, periode, wilayah, unit, dan duplikasi
    ↓
Mapping ke indikator kanonik
    ↓
Konfirmasi produsen data
    ↓
Verifikasi BAPPERIDA / pembinaan statistik bila relevan
    ↓
Publikasi ke data mart
    ↓
Dashboard, Bank Data, API, dan analitik premium
```

Tidak ada auto-approve. Kegagalan parsing atau mapping berhenti di staging dan tidak memengaruhi data pimpinan.

## 6. Rancangan layar

### 6.1 Beranda Bank Data

Pertanyaan utama layar: **data Kapuas apa yang tersedia dan apakah layak digunakan?**

Susunan desktop:

1. judul dan pencarian utama;
2. ringkasan cakupan berupa angka tipografis, bukan kartu berikon;
3. koleksi tema dalam daftar editorial dua kolom;
4. data terbaru dan data yang memerlukan perhatian;
5. sumber utama beserta tanggal pembaruan;
6. panel metodologi singkat.

Pada telepon, pencarian tetap berada paling atas. Filter membuka drawer dan hasil menggunakan daftar satu kolom.

### 6.2 Hasil pencarian

Setiap hasil menampilkan:

- judul;
- tipe: indikator, dataset, dokumen, atau sumber;
- produsen;
- cakupan periode dan wilayah;
- format/resource;
- status kualitas dan tanggal diperbarui;
- akses publik/internal.

Filter memakai URL query agar hasil dapat dibagikan dan dibuka ulang.

### 6.3 Detail dataset

Urutan informasi:

1. kegunaan dataset dan status kualitas;
2. produsen, walidata, periode, wilayah, frekuensi, lisensi;
3. daftar resource eksternal;
4. indikator yang menggunakan dataset;
5. cakupan dan kelengkapan;
6. riwayat versi/perubahan;
7. metodologi dan catatan penggunaan.

Tombol resource menggunakan label **Buka di sumber resmi** atau **Unduh dari sumber** dengan ikon tautan eksternal. Sistem mencatat klik keluar tanpa mem-proxy file.

### 6.4 Detail indikator

Urutan informasi:

1. nilai terbaru, arah perubahan, dan status terhadap target;
2. definisi, satuan, periode, dan sumber rujukan;
3. grafik seri waktu dengan marker revisi dan putus seri;
4. perbandingan wilayah jika sah;
5. tabel observasi;
6. provenance setiap titik;
7. metodologi dan riwayat perubahan definisi.

### 6.5 Kualitas Data

Halaman ini bersifat operasional. Blok utama:

- sumber gagal diakses;
- resource berubah checksum;
- metadata wajib kosong;
- dataset terlambat diperbarui;
- kandidat duplikasi;
- observasi ditolak;
- seri putus atau definisi berubah.

Setiap masalah mempunyai pemilik, tenggat, status, dan tautan ke objek yang harus diperbaiki.

## 7. Dashboard pimpinan

Pertanyaan utama layar: **apa yang berubah, mengapa penting, dan tindakan apa yang perlu dipertimbangkan?**

Urutan penyajian:

1. **Kondisi saat ini**: narasi singkat dari data terpublikasi.
2. **Perubahan penting**: indikator membaik, memburuk, stagnan, atau belum diperbarui.
3. **Risiko keputusan**: target berisiko, kesenjangan wilayah, anomali, dan kualitas data.
4. **Tindak lanjut**: rekomendasi dengan OPD terkait dan dasar bukti.
5. **Bukti**: grafik, peta, tabel, serta tautan ke Bank Data.

Setiap kesimpulan menyediakan aksi **Lihat bukti data** yang membuka sumber, metode, periode, dan kualitasnya.

## 8. Mesin analitik

### Tahap deskriptif

- perubahan absolut dan persentase;
- perubahan poin persentase;
- capaian terhadap target;
- slope tren;
- volatilitas;
- missingness;
- kesenjangan wilayah;
- keterlambatan pembaruan;
- deteksi nilai ekstrem dengan aturan yang dapat dijelaskan.

### Tahap diagnostik

- perbandingan komponen pembentuk;
- drill-down wilayah dan kelompok;
- hubungan eksploratif antarindikator;
- rekonsiliasi sumber berbeda;
- penjelasan perubahan metodologi.

Hubungan statistik tidak ditulis sebagai sebab-akibat tanpa desain evaluasi kausal.

### Tahap prediktif

Proyeksi hanya berjalan bila seri:

- mempunyai jumlah titik yang memadai;
- tidak mempunyai perubahan definisi yang belum diselesaikan;
- memiliki interval waktu konsisten;
- lolos uji missingness dan outlier;
- mengalahkan baseline sederhana pada backtesting.

Model menampilkan interval ketidakpastian, periode data, metrik backtesting, dan alasan kelayakan. Seri tahunan pendek tidak menggunakan deep learning.

### Narasi AI

Perhitungan dilakukan mesin statistik deterministik. Model bahasa menerima paket fakta yang sudah dihitung dan hanya menyusun penjelasan. Semua angka pada keluaran harus berasal dari payload terstruktur dan memiliki sitasi.

Keluaran menyimpan:

- versi data;
- versi metode/model;
- waktu pembuatan;
- fakta pembentuk;
- sitasi;
- tingkat keyakinan dan peringatan;
- status review manusia.

## 9. Premium dan feature flag

Fitur premium dibuka pada lingkungan internal dengan label **Eksperimental**. Ketika rilis publik, backend menentukan entitlement berdasarkan pengguna, role, organisasi, lingkungan, dan masa berlaku.

Kode fitur mengikuti arah produk:

- `proyeksi`;
- `rekomendasi`;
- `narasi`;
- `benchmark`;
- `geo_equity`;
- `whatif`;
- `ai_full`.

Pemeriksaan izin diterapkan di API dan antarmuka. Frontend tidak menjadi satu-satunya pengaman. Katalog data publik tetap terbuka; premium diterapkan pada kemampuan analitik lanjutan.

## 10. Prinsip visual

- kanvas utama putih;
- navy sebagai warna teks dan struktur;
- biru pemerintah sebagai aksi/interaksi;
- hijau untuk data positif/terverifikasi;
- emas hanya untuk perhatian prioritas;
- tanpa gradien, glow, atau shadow dekoratif;
- panel dibedakan dengan border tenang dan langkah warna tipis;
- data utama memakai tipografi, bukan ikon dalam kotak berwarna;
- animasi hanya untuk feedback, loading, transisi drawer, dan perubahan state;
- `prefers-reduced-motion` selalu dihormati.

## 11. Footer aplikasi

Footer memuat:

- identitas SABABUKA BERSINAR;
- kepanjangan nama sistem;
- konteks Kabupaten Kapuas;
- penegasan bahwa informasi mengikuti kewenangan dan jejak audit;
- kredit tim pengembangan yang sudah disepakati.

Footer tidak menjadi sitemap dan tidak memuat tautan yang belum tersedia.

## 12. Keamanan dan tata kelola

- allowlist domain sumber resmi;
- cegah SSRF pada fetch resource;
- URL berkredensial tidak pernah dipublikasikan;
- klasifikasi publik/internal/terbatas/rahasia;
- minimisasi data pribadi;
- audit setiap impor, koreksi, persetujuan, publikasi, dan akses data terbatas;
- data pimpinan hanya berasal dari observasi disetujui dan dipublikasikan;
- checksum tidak menggantikan tanda tangan atau otorisasi produsen data.

## 13. Tahapan implementasi

### Fondasi katalog

- registri sumber, dataset, resource, versi, dan health check;
- pencarian dan filter;
- halaman detail dataset/sumber;
- tautan keluar dan audit click-through.

### Observasi kanonik

- versi definisi indikator;
- seri waktu lintas periode;
- marker revisi dan putus seri;
- provenance locator;
- perluasan konektor di luar 2025-2029.

### Kualitas dan kurasi

- dashboard kualitas;
- aturan metadata;
- kandidat duplikasi;
- workflow koreksi;
- approval dan publication gate.

### Analitik dan premium

- statistik deskriptif;
- narrative evidence pack;
- diagnostic drill-down;
- forecast eligibility dan backtesting;
- entitlement backend untuk internal dan publik.

## 14. Kriteria penerimaan rilis

- tidak ada data contoh yang tampil sebagai data resmi;
- setiap angka dashboard dapat ditelusuri ke sumber;
- file besar dibuka dari sumber, bukan disimpan di aplikasi;
- link rusak dan perubahan checksum terdeteksi;
- role tidak melihat menu atau data di luar kewenangan;
- loading, empty, error, permission denied, dan stale data tersedia;
- keyboard, focus, kontras, dan screen reader diperiksa;
- desktop, tablet, dan telepon lolos uji;
- frontend dan backend lulus `check`, build, serta pengujian yang relevan;
- fitur premium dapat diubah tanpa deployment frontend dan tidak membocorkan data terbatas.
