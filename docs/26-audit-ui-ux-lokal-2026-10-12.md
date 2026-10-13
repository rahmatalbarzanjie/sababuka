# Audit dan Perapian UI/UX Lokal SABABUKA

Tanggal audit: 12 Oktober 2026
Lingkungan: full-stack lokal, tidak dipublikasikan
Status awal: inventaris dan temuan dicatat sebelum perubahan kode

## 1. Batas dan metode

Audit ini melanjutkan bukti render pada `.qa/ui-audit/`, `.qa/modal-audit/`, audit konsistensi 7 Oktober, dan audit lintas role 9 Oktober. Pemeriksaan 12 Oktober menambahkan pembacaan seluruh source React/CSS, matriks route-permission, state loading/empty/error, build TypeScript, serta kesiapan preview full-stack lokal.

Perubahan dibatasi pada presentasi, aksesibilitas, responsivitas, dan pola interaksi. Aturan bisnis, permission, status workflow, serta data tidak diubah. Tidak ada deploy, sinkronisasi source, atau publikasi produksi.

## 2. Inventaris per peran dan alur

| Peran | Landing | Halaman/alur utama yang diperiksa |
|---|---|---|
| Pengelola Sistem (`superadmin`) | `/admin` | Beranda administrasi; kesiapan OPD; organisasi; pengguna dan pendaftaran; peran/hak akses; menu; konfigurasi; keamanan akun; seluruh modul melalui pratinjau role |
| Pimpinan | `/dashboard` | Ringkasan pimpinan; analisis/peta; keuangan; layanan publik; Asisten Data; Rilis Data; notifikasi |
| Verifikator BAPPERIDA | `/operations` | Beranda tugas; kelompok isu; matriks indikator; verifikasi pelaporan; kurasi/publikasi; audit substantif; notifikasi |
| Walidata Diskominfosantik | `/connectors` | Ruang Walidata; status konektor; mapping; preview sinkronisasi; profil sumber OPD; audit teknis; notifikasi |
| Admin/PIC OPD | `/operations` | Beranda tugas; Profil Data OPD; indikator lingkup OPD; pelaporan realisasi; dokumen pendukung; perbaikan hasil review; notifikasi |
| Peran gabungan | sesuai prioritas landing | BAPPERIDA + PIC OPD serta Walidata + PIC OPD; menu dan aksi mengikuti gabungan permission dan scope |

Rute autentikasi yang diperiksa terpisah: `/login`, `/register`, `/activate`, dan `/security/setup`.

Total inventaris: 26 route terproteksi, 4 route autentikasi, 5 peran utama, 2 kombinasi peran, tabel administrasi/operasional, kartu mobile pelaporan dan indikator, modal formulir/detail/konfirmasi, popover profil/notifikasi, drawer bantuan, serta state loading, kosong, sukses, peringatan, dan error.

## 3. Temuan sebelum perubahan 12 Oktober

| ID | Prioritas | Temuan | Dampak | Keputusan |
|---|---|---|---|---|
| A11Y-01 | P1 | Tidak ada skip-link ke konten utama dan target fokus pergantian route berada pada teks breadcrumb. | Pengguna keyboard harus melewati navigasi berulang; pengumuman halaman kurang kuat. | Perbaiki lokal. |
| A11Y-02 | P1 | Drawer bantuan bukan dialog modal, belum mengunci/mengembalikan fokus. Sidebar mobile juga belum menahan fokus saat terbuka. | Fokus dapat berpindah ke konten di belakang overlay. | Perbaiki lokal. |
| A11Y-03 | P1 | Kontainer tabel horizontal tidak fokusable dan tidak memiliki nama region. | Pengguna keyboard/pembaca layar sulit menemukan dan menggeser kolom di luar layar. | Perbaiki lokal. |
| RWD-01 | P1 | Tabel administrasi/analitik pada ponsel memakai scroll horizontal dengan kolom pertama sticky, tetapi petunjuk geser belum terlihat konsisten. | Status/tindakan dapat dianggap tidak tersedia. | Tambahkan affordance global; kartu mobile tetap dipakai untuk pelaporan/indikator. |
| A11Y-04 | P2 | Dialog memakai `aria-label` alih-alih relasi eksplisit ke heading; empty state belum diumumkan sebagai status. | Struktur aksesibel kurang konsisten. | Perbaiki komponen bersama. |
| A11Y-05 | P2 | Tidak ada fallback `prefers-reduced-motion`; spinner dan transisi selalu bergerak. | Pengguna yang mengurangi animasi tetap menerima motion. | Perbaiki global. |
| A11Y-06 | P2 | Checkbox native kecil terdeteksi audit meski sebagian besar berada dalam label/baris besar. Beberapa pola label belum menjamin tinggi target 44 px. | Area klik tidak seragam, terutama pada ponsel. | Perbesar area label, bukan mengubah aturan bisnis. |
| UI-01 | P2 | State loading menggunakan beberapa wrapper (`page-loading`, `panel-loading`, spinner inline); empty/error telah terpusat tetapi semantik belum sepenuhnya sama. | Pengalaman menunggu cukup konsisten secara visual, tetapi pengumuman pembaca layar berbeda. | Samakan semantik komponen bersama. |
| TEST-01 | P1 | Preview browser baru tidak dapat dibuka melalui kontrol browser aplikasi; server lokal sendiri berhasil hidup. | Verifikasi visual baru bergantung pada bukti render terdahulu sampai jalur browser tersedia. | Lanjutkan build/DOM/source audit; catat keterbatasan. |

### Temuan lanjutan dari bukti mobile pengguna

| ID | Prioritas | Temuan | Keputusan/perbaikan |
|---|---|---|---|
| RWD-02 | P1 | Toolbar pencarian, ukuran halaman, tombol aksi, filter status, dan pagination pecah menjadi susunan yang tidak seimbang pada ponsel. | Ubah toolbar menjadi grid responsif, filter status menjadi deret geser horizontal, dan pagination menjadi grid tiga kolom yang konsisten. |
| RWD-03 | P1 | Kartu Matriks Indikator dan sumber data OPD terlalu padat; nama panjang mendorong badge/tindakan. | Susun ulang header kartu mobile, clamp dua baris dengan ellipsis, pertahankan judul lengkap melalui atribut `title`, dan rapikan fakta/tindakan. |
| UI-02 | P1 | Pesan ringkasan pimpinan menampilkan dua ikon centang karena ikon ditulis di isi dan juga ditambahkan komponen Notice. | Hapus ikon isi yang duplikat; komponen Notice menjadi sumber ikon tunggal. |
| UI-03 | P1 | Kredit “Dikembangkan oleh” berada di sidebar dan tampil janggal pada ponsel. | Pindahkan ke footer workspace yang mengikuti lebar konten. |
| UI-04 | P1 | Panel “Simpan draf sebelum mengirim” terus menempel dan terlalu besar pada ponsel. | Hilangkan perilaku sticky, rapikan menjadi grid tindakan ringkas, dan pertahankan fungsi simpan/kirim. |
| UI-05 | P2 | Panah select ukuran halaman terasa terlalu jauh dari angka; beberapa kartu/teks panjang tidak dipotong. | Persempit kontrol menjadi 72-74 px dan terapkan ellipsis/clamp pada konten panjang. |
| UI-06 | P2 | Teks antarmuka masih memakai em/en dash yang tidak konsisten. | Ganti seluruh em/en dash di source frontend dengan tanda hubung biasa `-`. |
| FEATURE-01 | P1 | Belum ada pemberitahuan satu kali setelah login yang dapat diatur Developer. | Tambahkan enable/disable, judul, isi, URL gambar opsional, label/URL tombol opsional, pratinjau, penyimpanan setting, endpoint tersaring, dan modal sekali per login. |

## 4. Temuan yang tidak diubah karena menyentuh aturan bisnis atau data

- rekonsiliasi publikasi aktif versus eligibility data;
- duplikasi form OPD–periode dan kebijakan revisi;
- default periode pelaporan serta validasi tahun berjalan;
- SLA, tenggat, PIC, dan eskalasi antrean;
- bulk approval baseline RPJMD;
- isi dan status data demo/resmi;
- permission, scope organisasi, serta urutan workflow.

Semua butir tersebut tetap mengikuti audit lintas role 9 Oktober dan memerlukan keputusan produk/pemilik data.

## 5. Hasil perbaikan dan pengujian

### Perbaikan yang diterapkan

1. Menambahkan skip-link keyboard ke konten utama.
2. Memindahkan fokus ke region konten utama setiap route berubah dan memberi nama region dari judul/subjudul halaman.
3. Mengubah drawer bantuan menjadi dialog modal aksesibel dengan judul terhubung, focus trap, Escape, dan restore focus.
4. Menambahkan focus trap, Escape, serta restore focus pada navigasi mobile.
5. Menjadikan seluruh kontainer tabel horizontal sebagai region fokusable bernama, termasuk tabel yang baru muncul setelah request API selesai.
6. Menambahkan petunjuk visual “Geser tabel ke samping” pada viewport sampai 760 px dan focus ring pada kontainer tabel.
7. Menghubungkan judul modal dengan `aria-labelledby`, memperjelas label tombol tutup, dan mempertahankan focus trap/restore focus komponen modal.
8. Menambahkan semantik status pada spinner/empty state dan menyembunyikan ikon dekoratif dari pembaca layar.
9. Menambahkan `scope="col"` pada header tabel yang dapat diurutkan.
10. Menyamakan area target checkbox/label menjadi minimum 44 px dan checkbox menjadi 20 px.
11. Menambahkan fallback `prefers-reduced-motion` untuk animasi/transisi.
12. Memperbesar target tombol tampil/sembunyikan kata sandi serta tombol teks autentikasi menjadi minimum 44 px.
13. Menyamakan toolbar mobile lintas Kelompok Isu, Matriks Indikator, Pelaporan, Verifikasi, Publikasi, Audit, Organisasi, Pengguna, dan halaman tabel lainnya.
14. Merapikan pagination mobile: ringkasan/urutan terbaca, spasi “Halaman n dari n” benar, serta tombol sebelumnya/berikutnya proporsional.
15. Merapikan kartu indikator dan kartu sumber OPD, termasuk judul dua baris dengan ellipsis, badge yang tidak terdorong, fakta dua kolom, dan tindakan yang tetap terjangkau.
16. Menghapus ikon centang duplikat pada ringkasan pimpinan.
17. Memindahkan kredit pengembang dari sidebar ke footer konten.
18. Mengubah panel simpan/kirim Profil Data OPD menjadi panel non-sticky; pada ponsel tombol tersusun ringkas.
19. Mengganti seluruh em dash/en dash di source frontend dengan tanda hubung biasa.
20. Mempertahankan langkah 1-3 pada Rincian Capaian Indikator sesuai keputusan pengguna.
21. Menambahkan popup pemberitahuan sekali setelah login serta panel pengaturan Developer dengan enable/disable, isi, gambar opsional melalui URL, tautan opsional, dan tombol pratinjau.

### Hasil pengujian

| Pemeriksaan | Hasil |
|---|---|
| TypeScript frontend (`pnpm check`) | Lulus |
| Build produksi frontend (`pnpm build`) | Lulus; 1.605 modul ditransformasi |
| Build TypeScript backend (`pnpm build`) | Lulus |
| Health API lokal | `ok` |
| Respons frontend lokal | HTTP 200 dan root aplikasi tersedia |
| Unit/service backend (`pnpm test`) | 14 lulus, 0 gagal, 7 integration test dilewati karena database integration khusus tidak disediakan |
| Audit browser halaman login/registrasi | 6 state: desktop 1440×1000, tablet 768×1024, mobile 390×844 |
| Overflow horizontal pada 6 state publik | 0 |
| Kontrol tanpa nama aksesibel pada 6 state publik | 0 |
| Target interaktif di bawah 40 px pada 6 state publik | 0 setelah perbaikan |
| Render login mobile 390×844 pada 12 Oktober | Tidak ada overflow horizontal; 0 tombol di bawah 40 px |
| Endpoint pemberitahuan tanpa sesi | Ditolak 401 `AUTH_REQUIRED` sesuai desain |
| Pemeriksaan em/en dash di `frontend/src` | 0 temuan |
| Pemeriksaan whitespace diff | Lulus |

Bukti baru berada di `.qa/ui-audit-2026-10-12/`. Bukti area terautentikasi terdahulu tetap berada di `.qa/ui-audit/` dan `.qa/modal-audit/`.

### Cakupan visual dan keterbatasan

- Login dan registrasi dirender ulang pada desktop, tablet, dan ponsel dengan Chrome headless lokal.
- Area terautentikasi diperiksa dari seluruh source/DOM, matriks permission, build, serta 34 screenshot halaman dan 22 state dialog audit sebelumnya. Perubahan 12 Oktober berada pada komponen/layout bersama sehingga berlaku untuk seluruh peran dan route.
- Browser aplikasi berhasil membuka dan mengukur halaman login lokal. Sesi akun tersimpan yang dicoba sudah tidak valid; password tidak diubah dan data akun tidak dimutasi. Karena itu screenshot baru area terautentikasi lintas role belum dapat diambil ulang pada sesi ini.
- Gambar popup saat ini dikonfigurasi melalui URL HTTPS/HTTP atau path lokal aplikasi; belum ada penyimpanan/upload berkas gambar khusus.
- Integration test berbasis database khusus tidak dijalankan; tidak ada migrasi, seed, atau mutasi data.
- Bundle JavaScript masih memunculkan warning ukuran chunk sekitar 551 kB. Ini isu performa pemuatan, bukan kegagalan build, dan memerlukan code-splitting terpisah.
- Belum dilakukan uji screen reader nyata, zoom 200%, perangkat sentuh fisik, jaringan lambat, atau UAT pegawai.

## 6. Keputusan akhir lokal

Perapian yang tidak mengubah bisnis/data sudah selesai dan lulus pemeriksaan teknis yang tersedia. Aplikasi tetap **lokal** dan **belum dikirim ke produksi**. Temuan produk/data pada bagian 4 serta audit lintas role 9 Oktober tetap menunggu keputusan pemilik proses.
