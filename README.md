# SABABUKA BERSINAR

**Sistem Analisis Big Data Kabupaten Kapuas** adalah frontend dashboard eksekutif untuk memperlihatkan rancangan pemantauan indikator daerah, wilayah, kinerja OPD, keuangan, pelayanan publik, peringatan, sumber data, dan validasi data.

## Teknologi

Target arsitektur pengembangan adalah Next.js App Router, TypeScript, Tailwind CSS, Lucide Icons, dan Recharts. Pada paket demonstrasi ini tersedia juga build frontend mandiri berbasis HTML/CSS/ES Modules agar dapat dibuka tanpa layanan eksternal pada lingkungan presentasi.

> Catatan lingkungan pengerjaan: registry npm tidak dapat diakses pada sesi implementasi ini, sehingga dependensi Next.js tidak dapat dipasang dan lint/build Next.js tidak dapat dijalankan di container. Struktur data dan komponen antarmuka dibuat terpisah agar migrasi ke komponen Next.js tetap langsung.

## Menjalankan

```bash
npm run demo
```

Lalu buka `http://localhost:3000`.

## Pemeriksaan sintaks

```bash
npm run check
```

## Publikasi gratis melalui GitHub Pages

Proyek sudah dilengkapi workflow `.github/workflows/deploy-pages.yml`. Setiap push ke
branch `main` akan memeriksa sintaks JavaScript dan memublikasikan situs secara otomatis.

### 1. Buat repository GitHub

1. Masuk ke GitHub dan pilih **New repository**.
2. Beri nama, misalnya `sababuka-bersinar`.
3. Untuk akun GitHub Free, pilih **Public** agar GitHub Pages dapat digunakan gratis.
4. Jangan menambahkan README, `.gitignore`, atau license karena folder lokal sudah berisi
   proyek.

### 2. Hubungkan folder lokal

Jalankan dari PowerShell:

```powershell
cd "C:\Users\user\OneDrive\Documents\ChatGPT\sababuka-bersinar"
git init
git add .
git commit -m "Publikasi awal SABABUKA BERSINAR"
git branch -M main
git remote add origin https://github.com/USERNAME/sababuka-bersinar.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda. Jika diminta autentikasi, masuk melalui
jendela browser atau gunakan GitHub Credential Manager.

### 3. Aktifkan Pages

1. Buka repository di GitHub.
2. Pilih **Settings → Pages**.
3. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
4. Buka tab **Actions** dan tunggu workflow **Deploy SABABUKA to GitHub Pages** selesai.

Alamat publiknya akan berbentuk:

```text
https://USERNAME.github.io/sababuka-bersinar/
```

Pembaruan berikutnya cukup dikirim dengan:

```powershell
git add .
git commit -m "Perbarui dashboard"
git push
```

## Struktur data lokal

Semua data utama berada pada `src/data/data.js`. Nilai indikator tidak ditanam tersebar di kartu UI. Pada tahap integrasi, modul ini dapat diganti dengan adapter `src/services/` yang mengambil respons API dan memetakan bentuk datanya ke interface yang sama.

## Halaman

- Ringkasan Eksekutif
- Peta Wilayah
- Kinerja OPD
- Keuangan Daerah
- Pelayanan Publik
- Analisis dan Rekomendasi
- Pusat Peringatan
- Sumber Data
- Validasi Data
- Pengaturan

## State pengujian

Tambahkan `?state=error` untuk melihat error state. Loading skeleton tampil singkat saat halaman dimuat atau navigasi menu dilakukan. Empty state dapat diuji pada Kinerja OPD melalui pencarian yang tidak menghasilkan data.

## Interaksi

Navigasi menu, sidebar collapse, mobile drawer + overlay, tahun, tab grafik, pemilihan kecamatan, filter status OPD, pencarian global, drawer detail, validasi, sinkronisasi sumber, toast, dropdown profil, mode presentasi, reset filter, serta ekspor ringkasan lokal tersedia dalam sesi frontend.
