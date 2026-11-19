# SABABUKA BERSINAR

SABABUKA adalah ruang kerja tata kelola indikator pembangunan Kabupaten Kapuas. Pengguna utamanya adalah OPD sebagai produsen data, BAPPERIDA sebagai pengarah dan verifikator substansi, Diskominfosantik sebagai Walidata, pengelola sistem, pembina statistik, dan Bupati.

## Prinsip produk

- Setiap halaman menjelaskan apa yang sedang dilihat dan tindakan berikutnya.
- Dataset adalah katalog data yang memiliki identitas, pemilik, sumber, metadata, dan versi.
- Pusat Sinkronisasi adalah satu-satunya ruang untuk sumber, konektor, data mentah, pengolahan, pemetaan, dan lineage.
- Topik membantu penemuan data; fokus pembangunan mengikat indikator pada prioritas kebijakan. Keduanya tidak digabung.
- RPJMD dan Renstra menjadi dokumen acuan target. Capaian tetap berasal dari pelaporan atau data terverifikasi.
- Data mentah bersifat privat dan tidak boleh tampil pada dashboard Bupati sebelum disetujui serta dipublikasikan.
- Bahasa antarmuka adalah Bahasa Indonesia. Istilah teknis diberi bantuan kontekstual singkat.

## Arah visual

Ada dua gaya yang berjalan bersamaan. Keduanya mengikuti identitas resmi Kabupaten Kapuas dan wajib punya mode terang dan gelap yang setara.

**Ruang kerja (OPD, BAPPERIDA, Diskominfosantik, pembina statistik, pengelola sistem).** Navy, hijau, dan aksen emas; tipografi Source Sans 3; sidebar; permukaan bersih; hierarki kuat; gerak singkat; kepadatan informasi yang nyaman untuk pekerjaan administrasi. Tabel desktop berubah menjadi kartu yang mudah dibaca pada layar kecil.

**Portal Bupati dan halaman masuk (keputusan pemilik, 19 Nov 2026).** Bergaya portal data pemerintah, bukan dashboard web. Berlaku bagi peran Bupati lewat kelas `.workspace.portal` (`frontend/src/portal.css`) dan bagi halaman masuk serta pendaftaran (`frontend/src/auth.css`).

- Tipografi Poppins (400, 500, 600, 700). Poppins hanya dipakai di portal Bupati dan halaman masuk; ruang kerja tetap Source Sans 3.
- Navy tua sebagai warna utama (chip aktif, menu aktif, lencana). Oranye hanya untuk satu aksi utama per layar, dengan teks navy agar kontrasnya lolos, tidak pernah teks putih di atas oranye. Hijau untuk tercapai atau membaik, merah untuk belum tercapai atau memburuk, abu untuk belum dinilai.
- Bentuk membulat: kartu 12 sampai 16 px, kontrol dan tombol berbentuk pil. Status ditandai lewat lencana, ikon, atau latar tipis, tanpa garis aksen sisi.
- Pola halaman Bupati: judul narasi yang dihitung dari angka, kotak cari, pita tiga angka yang bisa diklik, kartu indikator berlabel sektor dan status (dengan sparkline bila ada deret tren). Navigasi satu tingkat di bilah atas: Beranda, Wilayah, Indikator (chip Semua indikator, Tren terbaru, Fokus kebijakan), dan Tanya. Di layar sempit navigasi menjadi tab bawah seperti aplikasi. Tidak ada bilah tab kedua di dalam dashboard.
- Mode aplikasi (dibuka dari APK Android dengan penanda `SABABUKA-Android`, atau `?mode=app` untuk uji): hero navy, tanpa footer, tab bawah.
- Menu aksesibilitas bagi Bupati: ukuran teks, mode gelap, dan kontras tinggi, tersimpan di perangkat. Target sentuh minimal 44 px di layar sempit atau sentuh.
- Ilustrasi tugu Kapuas pada halaman masuk dibingkai panggung navy karena warnanya dirancang untuk latar gelap. Tidak memakai maskot, logo, atau ilustrasi pihak lain.

## Larangan

- Jangan membuat modul ganda untuk fungsi yang sama.
- Jangan mengubah proses usulan indikator manual OPD menjadi otomatis.
- Jangan menampilkan data staging sebagai data resmi.
- Jangan menonaktifkan Profil Data OPD.
- Jangan menambahkan placeholder baru atau menandai fitur berfungsi sebagai `Segera`.
