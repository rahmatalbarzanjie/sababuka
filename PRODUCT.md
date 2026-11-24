# SABABUKA BERSINAR

SABABUKA adalah ruang kerja tata kelola indikator pembangunan Kabupaten Kapuas. Pengguna utamanya adalah OPD sebagai produsen data, termasuk Diskominfosantik sebagai OPD biasa, BAPPERIDA sebagai pengarah, pemeta, verifikator substansi, dan pengguna Dashboard Analisis, BPS sebagai pembina statistik melalui catatan Bank Data, Developer sebagai pengelola sumber dan impor, serta Bupati sebagai pengguna Tanya Sababuka.

## Prinsip produk

- Setiap halaman menjelaskan apa yang sedang dilihat dan tindakan berikutnya.
- Bank Data adalah katalog seri yang memiliki identitas, sumber, metadata, versi, provenance, status verifikasi, dan catatan pembinaan.
- Developer mengelola sumber, rahasia konektor, pratinjau, impor manual, dan riwayat impor dalam satu alur Sumber dan Impor.
- BAPPERIDA memetakan Seri Data ke indikator RPJMD. Mapping tidak menjadi kewenangan Developer, BPS, atau OPD.
- Sinkronisasi otomatis, jadwal, interval, dan impor otomatis tidak dipakai.
- Topik membantu penemuan data; fokus pembangunan mengikat indikator pada prioritas kebijakan. Keduanya tidak digabung.
- RPJMD dan Renstra menjadi dokumen acuan target. Capaian tetap berasal dari pelaporan atau data terverifikasi.
- Data mentah bersifat privat dan tidak boleh tampil dalam jawaban Bupati sebelum disetujui serta dipublikasikan.
- Bahasa antarmuka adalah Bahasa Indonesia. Istilah teknis diberi bantuan kontekstual singkat.

## Arah visual

Ada dua gaya yang berjalan bersamaan. Keduanya mengikuti identitas resmi Kabupaten Kapuas dan wajib punya mode terang dan gelap yang setara.

**Ruang kerja (OPD, BAPPERIDA, BPS, dan Developer).** Navy, hijau, dan aksen emas; tipografi Source Sans 3; sidebar; permukaan bersih; hierarki kuat; gerak singkat; kepadatan informasi yang nyaman untuk pekerjaan administrasi. Tabel desktop berubah menjadi kartu yang mudah dibaca pada layar kecil.

**Tanya Sababuka untuk Bupati dan halaman masuk.** Bupati memakai ruang percakapan yang tenang, langsung, dan berbasis data, bukan dashboard. Pola interaksinya mengikuti kemudahan aplikasi percakapan modern, tetapi tetap memakai identitas resmi SABABUKA dan Kabupaten Kapuas. Halaman masuk mempertahankan identitas visual yang sama.

- Tipografi Poppins (400, 500, 600, 700). Poppins hanya dipakai di Tanya Sababuka untuk Bupati dan halaman masuk; ruang kerja tetap Source Sans 3.
- Navy tua sebagai warna utama (chip aktif, menu aktif, lencana). Oranye hanya untuk satu aksi utama per layar, dengan teks navy agar kontrasnya lolos, tidak pernah teks putih di atas oranye. Hijau untuk tercapai atau membaik, merah untuk belum tercapai atau memburuk, abu untuk belum dinilai.
- Bentuk membulat: kartu 12 sampai 16 px, kontrol dan tombol berbentuk pil. Status ditandai lewat lencana, ikon, atau latar tipis, tanpa garis aksen sisi.
- Pola halaman Bupati: panel riwayat dan percakapan pada desktop, drawer riwayat pada ponsel, tombol Percakapan baru, pesan, bukti angka, tabel, grafik, sumber, dan composer yang selalu mudah dijangkau. Tidak ada menu dashboard atau tab bawah dashboard.
- Riwayat percakapan disimpan di server per pengguna. Penyimpanan lokal hanya untuk draf yang belum dikirim.
- Mode aplikasi yang dibuka dari APK Android dengan penanda `SABABUKA-Android`, atau `?mode=app` untuk uji, memakai ruang percakapan penuh tanpa footer dan menghormati safe area.
- Menu aksesibilitas (ukuran teks, kontras tinggi) dihapus atas permintaan pemilik, 19 Nov 2026; mode gelap lewat tombol di bilah atas. Target sentuh minimal 44 px di layar sempit atau sentuh.
- Ilustrasi tugu Kapuas pada halaman masuk dibingkai panggung navy karena warnanya dirancang untuk latar gelap. Tidak memakai maskot, logo, atau ilustrasi pihak lain.

## Larangan

- Jangan membuat modul ganda untuk fungsi yang sama.
- Jangan mengubah proses usulan indikator manual OPD menjadi otomatis.
- Jangan menampilkan data staging sebagai data resmi.
- Jangan mengaktifkan kembali role Walidata Diskominfosantik.
- Jangan mengarahkan Bupati ke Dashboard Analisis BAPPERIDA.
- Jangan menonaktifkan Profil Data OPD.
- Jangan menambahkan placeholder baru atau menandai fitur berfungsi sebagai `Segera`.
