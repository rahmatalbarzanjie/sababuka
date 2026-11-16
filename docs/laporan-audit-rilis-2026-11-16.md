# Laporan Audit Kesiapan Rilis SABABUKA BERSINAR

Tanggal: 16 November 2026
Status: tahap 1 (tinjauan kode, konfigurasi, dokumen, dan data produksi). Tahap 2 (uji alur per peran dan uji otorisasi dengan akun login) menunggu kata sandi dari pemilik.
Metode: pembacaan kode dan konfigurasi, pemeriksaan otomatis (type-check, build, uji unit, audit dependensi), pemeriksaan header produksi, dan kueri baca saja ke database produksi. Tidak ada data, kode, atau konfigurasi produksi yang diubah.

## 1. Ringkasan

Tidak ditemukan temuan kritis. Fondasi keamanan inti kuat: kata sandi Argon2id, sesi dan token berbasis hash, CSRF pada seluruh rute mutasi, RBAC berlapis permission dan scope, validasi skema pada input, unggahan berkas dengan daftar tipe, pemeriksaan tanda tangan berkas dan pencegahan path traversal, rahasia konektor terenkripsi AES-256-GCM, serta jejak audit lengkap. Header keamanan produksi lengkap (HSTS, CSP ketat, X-Frame-Options DENY).

Ada 2 temuan tinggi, 8 sedang, dan 9 rendah. Dua temuan tinggi sebaiknya selesai sebelum rilis. Sisa temuan dapat dijadwalkan.

| Tingkat | Jumlah |
| --- | --- |
| Kritis | 0 |
| Tinggi | 2 |
| Sedang | 8 |
| Rendah | 9 |

## 2. Hasil pemeriksaan otomatis

| Pemeriksaan | Hasil |
| --- | --- |
| Frontend type-check (`pnpm check`) | Lulus |
| Frontend build (`pnpm build`) | Lulus, bundel utama 307 kB (gzip 94 kB), halaman dipecah per rute |
| Frontend `pnpm audit --prod` | Tidak ada kerentanan |
| Backend `pnpm check` | Lulus: 70 uji, 60 lulus, 0 gagal, 10 dilewati |
| Backend `pnpm audit --prod` | 11 temuan (5 rendah, 6 sedang), tanpa tingkat tinggi atau kritis |
| Kontrak tipe (`pnpm api:types:check`) | Lulus (namun lihat S-04) |
| Kesehatan produksi | `/api/v1/health` 200, versi 0.1.0; layanan API, nginx, PostgreSQL, dan fail2ban aktif; disk terpakai 14%; waktu aktif 4 hari |
| Migrasi produksi | Terpasang sampai 072, sama dengan berkas terakhir di repositori |

Catatan: 10 uji yang dilewati adalah uji integrasi yang membutuhkan database. Komputer ini tidak memiliki PostgreSQL lokal dan Docker tidak berjalan, sehingga uji tersebut tidak dapat dijalankan dalam audit ini. Alur CI sudah menyediakan PostgreSQL untuk uji tersebut; status CI terakhir di cabang utama perlu dikonfirmasi.

## 3. Temuan tinggi

**T-01. Role baca database produksi masih memiliki SELECT pada tabel rahasia.**
Role `sababuka` (dipakai untuk akses baca) masih dapat membaca `auth_sessions`, `password_reset_tokens`, `connector_secrets`, dan `assistant_sessions`. Isinya berupa hash token dan rahasia terenkripsi, jadi tidak dapat langsung dipakai ulang, tetapi hak ini tidak diperlukan untuk audit dan memperbesar dampak bila kunci SSH bocor.
Rekomendasi: jalankan `REVOKE SELECT` pada keempat tabel tersebut (dan `system_secrets`) untuk role `sababuka`. Pemilik atau superuser database yang menjalankan; role baca saja tidak berwenang.

**T-02. Uji integrasi backend tidak terverifikasi untuk rilis ini.**
Alur kritis (verifikasi, pelaporan, publikasi, konsolidasi, lintas peran) hanya diuji lewat uji integrasi yang membutuhkan database, dan 10 uji itu dilewati secara lokal.
Rekomendasi: pastikan seluruh job CI cabang utama hijau pada commit yang akan dirilis, atau jalankan `pnpm test:integration` terhadap database lokal sebelum rilis.

## 4. Temuan sedang

**S-01. Alamat IP klien dapat dipalsukan lewat X-Forwarded-For.**
Fastify memakai `trustProxy: true`, sedangkan nginx menambahkan X-Forwarded-For di belakang Cloudflare. Nilai paling kiri dapat diatur penyerang, sehingga pembatas laju per IP dapat dilewati dan IP pada audit trail tidak dapat dipercaya. Penguncian akun setelah 5 kegagalan tetap melindungi dari tebak kata sandi per akun.
Rekomendasi: percayai hanya jumlah proxy yang tepat (mis. `trustProxy: 2`) atau gunakan header `CF-Connecting-IP`, dan ubah nginx agar menimpa, bukan menambah, header tersebut.

**S-02. Dependensi backend belum diperbarui.**
Fastify 5.12.5 di bawah versi tertambal 5.12.6, ditambah `fast-uri`, `uuid` (melalui exceljs), dan `ip-address` (melalui rate-limit).
Rekomendasi: perbarui Fastify ke 5.12.6 atau lebih baru, perbarui plugin terkait, jalankan ulang `pnpm audit`.

**S-03. Konfigurasi deploy di repositori tidak mencerminkan produksi.**
Berkas nginx di `deploy/` masih memakai `sababuka.31-97-105-154.sslip.io` dan `dev.sababuka.com`. Konfigurasi produksi aktual (`sababuka.com` di belakang Cloudflare) dan skrip `sababuka-deploy` tidak ada di repositori, sehingga server tidak dapat direproduksi dari repositori.
Rekomendasi: simpan salinan konfigurasi produksi dan skrip deploy (tanpa rahasia) di `deploy/`, dan hapus berkas usang.

**S-04. Kontrak OpenAPI tidak lengkap.**
Sekitar 28 endpoint yang berjalan belum didokumentasikan, antara lain `opd-profiles`, `connectors/series-links`, `connectors/bank-data/*`, `connectors/mappings/express-*`, `executive/analysis`, `executive/insights`, `submissions/{id}/guidance`, `categories/actions/submit-all`, `me/announcement`, dan `me/preview-options`. Versi masih `1.0.0-draft` dan server masih `dev.sababuka.com`. Pemeriksaan `api:types:check` lulus karena hanya membandingkan berkas dengan dirinya sendiri, bukan dengan rute nyata.
Rekomendasi: lengkapi OpenAPI untuk seluruh rute, perbarui server menjadi `https://sababuka.com/api/v1`, dan tambah uji yang membandingkan daftar rute dengan OpenAPI.

**S-05. Alur GitHub Pages masih mempublikasikan prototipe lama.**
`.github/workflows/deploy-pages.yml` menerbitkan folder `web-revision` (prototipe statis) pada setiap push ke cabang utama. Ini bertentangan dengan arah proyek (bukan lagi demo statis) dan menayangkan konten lama ke publik.
Rekomendasi: nonaktifkan alur tersebut dan matikan GitHub Pages bila tidak dipakai.

**S-06. Pencadangan belum mencakup berkas bukti dan hanya berada di satu server.**
Skrip hanya mencadangkan database dengan retensi 14 hari di server yang sama. Berkas bukti dukung di `/var/lib/sababuka/evidence` tidak dicadangkan, dan tidak ada salinan di luar server maupun catatan uji pemulihan. Timer berjalan normal (terakhir 6 jam sebelum audit).
Rekomendasi: cadangkan direktori bukti, kirim salinan harian ke lokasi lain, dan lakukan uji pemulihan berkala yang dicatat.

**S-07. Titik tunggal pada akun penting.**
Hanya ada 1 akun Superadmin (Developer) aktif, 1 Pimpinan, dan 1 Kominfo. Kehilangan akses salah satunya menghentikan fungsi terkait.
Rekomendasi: siapkan akun cadangan atau prosedur pemulihan terdokumentasi, terutama untuk Superadmin.

**S-08. Kelengkapan data realisasi indikator RPJMD.**
Dari 69 indikator RPJMD aktif, 42 belum memiliki satu pun data realisasi pada tahun apa pun. Target sudah ada untuk semua indikator. Pengingat pelaporan sudah disiapkan untuk 20 OPD. Selain itu 5 OPD belum memiliki akun aktif atau undangan.
Rekomendasi: tindak lanjuti pengingat, buatkan akun untuk 5 OPD, dan tetapkan batas waktu pelaporan sebelum dashboard pimpinan dipakai untuk keputusan.

## 5. Temuan rendah

- **R-01. Data anomali dari BPS.** `BPS_180` (Rasio Murid-Guru SD, 2015) bernilai -9, tidak masuk akal untuk rasio. `BPS_389` (Laju Pertumbuhan Penduduk 2021) bernilai -0,02, dapat sah. Perlu tinjauan BAPPERIDA lewat Konsolidasi Sumber.
- **R-02. Nama Bank Data kembar.** Lima nama indikator Bank Data muncul dua kali dengan kode berbeda (mis. Rasio Murid-Guru: `BPS_176` dan `BPS_172`; beberapa Anggota DPRD). Pembeda tabel sumber perlu ditampilkan pada nama atau label.
- **R-03. Sesi kedaluwarsa tidak dibersihkan.** 111 sesi kedaluwarsa lebih dari 30 hari masih tersimpan (total 348). Tambahkan pembersihan berkala.
- **R-04. Sisa MFA.** `.env.example` masih memuat `MFA_ISSUER` dan `MFA_ENCRYPTION_KEY`; kolom `mfa_required` dan beberapa skrip masih menyentuhnya. Tidak berbahaya, tetapi sebaiknya dibersihkan agar selaras dengan keputusan pemilik (migration 057).
- **R-05. Pelanggaran gaya tampilan (keputusan 15 Nov 2026).** `vitality.css` memuat garis aksen atas pada kartu metrik (`.metric-card::before`), bilah aksen samping pada menu aktif (`.nav-link.active::before`), dan garis gradien di bawah judul. `styles.css` baris 1117 dan 2226 serta `vitality.css` baris 113 memakai `border-left-color` aksen. Perlu diganti dengan lencana, ikon, atau latar tipis.
- **R-06. Tanda pisah panjang.** Hanya 11 kemunculan, seluruhnya di migrasi lama (015, 016, 029, 037) yang tidak boleh diubah; teks yang tampil sudah dibersihkan migrasi 072. Antarmuka, backend, dan dokumen bersih.
- **R-07. Alamat usang `dev.sababuka.com`.** Masih ada di `android/` (4 berkas, termasuk URL bawaan APK), `docs/api/openapi.yaml`, dokumen lama, dan berkas nginx. APK yang dibangun dengan nilai bawaan akan membuka alamat yang sudah dihapus dari DNS.
- **R-08. Berkas biner terlacak di `output/`.** Dokumen docx dan pptx (sekitar 2,6 MB) ikut terlacak meski `.gitignore` mengecualikannya. Perlu ditinjau isinya dan dikeluarkan dari repositori bila tidak untuk publik.
- **R-09. Pengambilan berkas impor Bank Data.** Unduhan `resource.url` dari katalog CKAN tidak dibatasi host dan ukuran, dan mengikuti pengalihan. Hanya dapat dipicu Superadmin dan sumbernya tepercaya, jadi risikonya kecil; tambahkan daftar host dan batas ukuran sebagai pertahanan berlapis. Kebijakan kata sandi baru hanya menuntut panjang 12 karakter tanpa pemeriksaan kata sandi umum.

## 6. Hal yang sudah baik

- Autentikasi: Argon2id, penguncian akun (5 kegagalan, 15 menit), respons seragam untuk akun tidak dikenal, cookie httpOnly, sameSite lax, dan secure di produksi.
- Otorisasi: permission per rute, scope organisasi, pemisahan kewenangan, dan pengecualian Developer tercatat (`metadata.acting_as`). Superadmin sebagai satu-satunya yang dapat memakai "Bertindak sebagai".
- Input: skema validasi dengan `additionalProperties: false`, batas ukuran badan 1 MB, tidak ditemukan SQL dengan interpolasi string.
- Unggahan: daftar tipe, pemeriksaan tanda tangan berkas, nama penyimpanan acak, mode 0600, dan unduhan berupa lampiran.
- SSRF: pemeriksa website dibatasi HTTPS dan domain resmi serta menolak alamat privat; URL resource konektor dicocokkan dengan host sumber.
- Rahasia: tidak ada rahasia atau kunci privat di berkas terlacak; skrip administrasi membaca kata sandi dari variabel lingkungan; kunci enkripsi gagal aman.
- Integritas data produksi: tidak ada indikator RPJMD tanpa pemilik, tanpa versi aktif ganda, tanpa relasi primer yang selisih, atau observasi pada versi tidak aktif. Semua observasi bank data berlabel sumber. Tidak ada konflik antarsumber yang terbuka. Tidak ada OPD dengan lebih dari satu PIC aktif.
- Header produksi lengkap, TLS dan HSTS aktif, SSH hanya kunci, fail2ban aktif, dan layanan API dijalankan dengan pembatasan systemd.

## 7. Belum diaudit (menunggu kata sandi Developer)

1. Penelusuran alur tiap peran di produksi: OPD, BAPPERIDA, Diskominfosantik, BPS, Pimpinan, dan Developer.
2. Uji otorisasi negatif: akses lintas peran dan lintas OPD, serta percobaan IDOR pada endpoint berparameter.
3. Uji responsif (desktop, tablet, iPhone), aksesibilitas, mode gelap, dan state loading, kosong, galat pada seluruh menu.
4. Uji fungsional pelaporan, verifikasi, publikasi, dan konsolidasi pada data nyata, tanpa mengubah data yang bukan uji.
5. Konfirmasi status CI cabang utama dan uji integrasi.

## 8. Urutan tindak lanjut yang disarankan

1. Sebelum rilis: T-01, T-02, S-02, S-05, dan R-07 (URL APK).
2. Sebelum pemakaian oleh pimpinan: S-01, S-03, S-04, S-06, dan tindak lanjut S-08.
3. Berkala: S-07, R-01 sampai R-06, R-08, dan R-09.

Catatan pelaksanaan audit: untuk membaca database produksi, berkas kueri sementara disalin ke `/tmp` server dengan akun baca saja lalu dihapus segera setelah dijalankan. Tidak ada tabel atau data yang diubah.

## 9. Status tindak lanjut (branch `fix/audit-rilis-2026-11-16`)

Sudah diperbaiki di branch, menunggu tinjauan dan penggabungan:

| Temuan | Perbaikan |
| --- | --- |
| S-01 | Pengaturan `TRUST_PROXY_HOPS` (bawaan 2 di produksi, 0 di lokal) menggantikan `trustProxy: true`; ditambah uji. |
| S-02 | Fastify 5.12.5 menjadi 5.12.8; temuan audit dependensi turun dari 11 menjadi 10, sisanya melalui `fast-uri`, `uuid`, dan `ip-address`. |
| S-05 | Alur GitHub Pages dihapus. |
| R-04 | Variabel MFA dihapus dari `.env.example`. |
| R-05 | Garis aksen kartu metrik, bilah menu aktif, dan warna `border-left` dihapus dari CSS. |
| R-07 | URL APK, OpenAPI, dan README Android memakai `https://sababuka.com`. |

Belum dikerjakan: T-01 (REVOKE oleh pemilik), T-02 (konfirmasi CI), S-03, S-04, S-06, S-07, S-08, R-01 sampai R-03, R-06, R-08, R-09, dan seluruh tahap 2.

## 10. Hasil tahap 2 (uji dengan login Developer, 16 November 2026)

Metode: login Developer di produksi, lalu "Bertindak sebagai" BAPPERIDA, Diskominfosantik, Pembina Statistik BPS, Pimpinan, dan OPD (Dinas Kesehatan dan BKAD). Hanya permintaan baca (GET) yang dikirim; tidak ada data yang diubah. Sesi diakhiri setelah pengujian.

### Otorisasi dan sesi (API)

- Matriks 40 endpoint x 7 konteks peran sesuai rancangan: Pimpinan hanya Dashboard Eksekutif dan publikasi terbit; Pembina Statistik tidak dapat membuka pengguna, audit, konektor, atau dashboard pimpinan; OPD tidak dapat membuka pengguna, peran, audit, konektor, atau sistem; menu Pengaturan hanya untuk Developer.
- Uji lintas OPD (IDOR) dari OPD Dinas Kesehatan terhadap data OPD lain: capaian, bukti dukung, catatan pembinaan, profil OPD, dokumen profil, dan periode tersedia, semuanya ditolak 403. Data milik sendiri tetap dapat dibuka (kontrol 200).
- Seluruh endpoint tanpa sesi ditolak 401. Login salah 401. Logout tanpa token CSRF 403. Peran pratinjau tidak valid ditolak 400.
- IP pada audit login kini berisi alamat klien (bukan alamat Cloudflare), sehingga perbaikan S-01 bekerja di produksi.
- Catatan: saat "Bertindak sebagai", daftar notifikasi adalah milik akun Developer, bukan milik peran yang dipratinjau. Ini perilaku rancangan, tetapi perlu diketahui agar tidak dikira kebocoran.

### Antarmuka (193 pemuatan halaman, 6 peran, desktop/tablet/iPhone, mode terang dan gelap)

- Tidak ada halaman yang meluap horizontal, tidak ada halaman tanpa satu `h1`, tidak ada tombol atau tautan tanpa nama, tidak ada gambar tanpa `alt`, tidak ada tanda pisah panjang, dan tidak ada halaman kosong.
- Mode terang: tidak ada teks di bawah rasio kontras 4,5:1.
- U-01 (diperbaiki): mode gelap memiliki empat permukaan berlatar terang tetap sehingga teks hampir tak terbaca (rasio 1,05 sampai 2,5): langkah alur Kurasi & Publikasi, kartu identitas PIC di Profil Data OPD, tombol saran Asisten, dan chip aktif pada dashboard. Setelah perbaikan, pemeriksaan ulang menunjukkan 0 temuan kontras pada halaman tersebut.
- U-02: skrip analitik Cloudflare (`static.cloudflareinsights.com/beacon.min.js`) diblokir CSP dan menimbulkan galat konsol di setiap halaman. Matikan injeksi otomatis Web Analytics di Cloudflare, atau tambahkan host itu ke `script-src` dan `connect-src`.
- U-03: filter pada Pemantauan OPD (`/admin/opd-monitoring`) memakai `select` tanpa label yang terbaca pembaca layar.
- U-04: 16 dari 50 halaman mobile memiliki target sentuh 24 px (kotak centang pada daftar hak akses, menu, kategori, dan matriks indikator; kolom cari). Memenuhi batas minimum WCAG 2.2 AA (24 px), tetapi di bawah 44 px yang disarankan.
- U-05: header keamanan ganda dari tiga lapis (nginx, aplikasi, Cloudflare), misalnya `X-Content-Type-Options` dan HSTS muncul dua kali. Tidak berbahaya, tetapi sebaiknya satu lapis saja.
- U-06: satu permintaan `/me` menerima 502 saat deploy berlangsung (jeda beberapa detik ketika layanan dimulai ulang). Pengguna yang aktif saat deploy dapat terlempar ke halaman login. Pertimbangkan deploy di luar jam kerja atau mulai ulang bertahap.

### Belum dicakup

Uji fungsional yang mengubah data (kirim capaian, verifikasi, publikasi, impor) tidak dijalankan di produksi agar data nyata tidak terpengaruh; sebaiknya dilakukan di lingkungan uji. Navigasi papan ketik dan pembaca layar hanya diperiksa lewat atribut otomatis, bukan uji manual. Dari pemeriksaan ukuran huruf kolom isian di mobile, hasil otomatis mencampur kotak centang sehingga belum dapat disimpulkan; verifikasi manual di iPhone disarankan.
