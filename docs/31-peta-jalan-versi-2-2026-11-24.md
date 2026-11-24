# Peta jalan SABABUKA Versi 2 (usulan)

Status: usulan pemilik, 24 November 2026. Daftar ini tidak mengubah arah Versi 1. Butir yang bertanda perlu keputusan tidak boleh dikerjakan sebelum pemilik memutuskan.

## Batas Versi 1

Bupati berkomunikasi dengan asisten hanya seputar data yang sudah terkumpul: perkembangan dan capaian terhadap RPJMD, tindak lanjut, wilayah yang perlu perhatian, OPD terkait, rekomendasi kepada OPD, dan evaluasi kondisi OPD. Langkah berikutnya: pengalaman dashboard Bupati dibuat lebih hidup (B1).

## Daya jual

- Kepala daerah bertanya langsung dan mendapat jawaban bersumber, bukan membuka banyak dashboard.
- Setiap angka dapat ditelusuri ke sumber, tahun, dan status verifikasinya.
- Pemisahan kewenangan: OPD mengisi, BAPPERIDA memverifikasi, Bupati membaca data terbit.
- Menilai kondisi OPD dari data terbit secara transparan, tanpa menyimpulkan penyebab.

## Fase 0 - Sekarang

Batasi Bupati pada percakapan dengan data yang sudah terkumpul, hidupkan pengalaman dashboard Bupati.

| Kode | Butir | Tema | Nilai | Usaha | Status |
|---|---|---|---|---|---|
| B1 | Dashboard Bupati lebih hidup | Pengalaman Bupati | Tinggi | sedang | Berikutnya |

**B1 Dashboard Bupati lebih hidup.** Halaman awal Bupati yang terasa hidup dengan tetap membatasi diri pada percakapan dengan data terkumpul: ringkasan visual status RPJMD, gerak halus, pembaruan terakhir, dan jalan pintas ke pertanyaan yang paling sering diajukan. Syarat: Chat Bupati yang rapi dan presisi sudah live; briefing, Pantauan, dan Catatan tidak termasuk (B7 sampai B9).

## Fase 1 - Menguatkan Kapuas

Perbandingan antardaerah, dokumen kajian, peringatan dini, dan syarat keamanan sebelum dijual.

| Kode | Butir | Tema | Nilai | Usaha | Status |
|---|---|---|---|---|---|
| B7 | Briefing harian | Pengalaman Bupati | Tinggi | kecil | Dicabut dari V1 |
| B8 | Pantauan indikator | Pengalaman Bupati | Sedang | kecil | Dicabut dari V1 |
| B9 | Catatan Bupati | Pengalaman Bupati | Sedang | kecil | Dicabut dari V1 |
| B2 | Bahan rapat dari jawaban dan catatan | Pengalaman Bupati | Tinggi | sedang | Usulan |
| P1 | Perbandingan dengan kabupaten dan kota se-Kalimantan Tengah | Perbandingan antardaerah | Tinggi | sedang | Usulan |
| P2 | Pembanding provinsi dan nasional | Perbandingan antardaerah | Sedang | kecil | Usulan |
| D1 | Perpustakaan kajian daerah | Dokumen kajian | Tinggi | sedang | Usulan |
| D2 | Jawaban berdasarkan dokumen | Dokumen kajian | Tinggi | besar | Usulan |
| K1 | Peringatan dini | Rekomendasi strategis | Tinggi | sedang | Usulan |
| K2 | Proyeksi menuju target akhir periode | Rekomendasi strategis | Tinggi | sedang | Usulan |
| J4 | Keamanan dan keandalan yang dapat dibuktikan | Siap dijual ke pemda | Tinggi | sedang | Perlu keputusan |
| J7 | Kapuas sebagai rujukan | Siap dijual ke pemda | Tinggi | kecil | Usulan |

**B7 Briefing harian.** Halaman awal chat membuka dengan tiga hal yang layak diketahui hari ini (indikator yang perlu dicermati, indikator belum mencapai target, OPD yang perlu pembinaan), dengan status dibaca dan cincin progres. Syarat: Sudah dibuat dan dicabut dari Versi 1 atas keputusan pemilik (24 Nov 2026); kode ada di riwayat git (PR #121, #122) dan tabel migration 092 dipertahankan. Perlu pemeriksa data janggal (T2) agar nilai nol mendadak tidak disorot.

**B8 Pantauan indikator.** Bupati menandai indikator dari grafik jawaban dan melihat ringkasannya di panel Pantauan. Syarat: Sudah dibuat dan dicabut dari Versi 1 atas keputusan pemilik (24 Nov 2026); kode ada di riwayat git (PR #121, #122) dan tabel migration 092 dipertahankan.

**B9 Catatan Bupati.** Butir tindak lanjut dari jawaban dapat disimpan ke catatan pribadi untuk bahan rapat. Hanya terlihat oleh Bupati dan tidak dikirim ke OPD. Syarat: Sudah dibuat dan dicabut dari Versi 1 atas keputusan pemilik (24 Nov 2026); kode ada di riwayat git (PR #121, #122) dan tabel migration 092 dipertahankan. Berpasangan dengan bahan rapat (B2).

**B2 Bahan rapat dari jawaban dan catatan.** Ekspor jawaban, grafik, sumber, dan Catatan Bupati menjadi PDF atau Word satu halaman untuk rapat OPD atau paparan. Syarat: Pembuat dokumen di server dengan batas ukuran.

**P1 Perbandingan dengan kabupaten dan kota se-Kalimantan Tengah.** Posisi Kapuas di antara daerah lain di provinsi yang sama pada indikator yang sama dan tahun yang sama: peringkat, selisih, dan kelompok pembanding berkarakter serupa. Dasarnya data BPS tiap kabupaten dan kota, yang konektornya sudah ada. Syarat: Pemetaan indikator RPJMD ke variabel BPS yang setara; hanya indikator yang tersedia di BPS. Keputusan: Daerah mana yang menjadi kelompok pembanding.

**P2 Pembanding provinsi dan nasional.** Garis rata-rata provinsi dan nasional pada grafik tren dan di jawaban chat. Syarat: Data agregat BPS provinsi dan nasional.

**D1 Perpustakaan kajian daerah.** Dokumen riset dan kajian daerah (RPJMD, Renstra, LKPJ, naskah akademik, hasil penelitian) dikelola BAPPERIDA dengan metadata, versi, dan kata kunci. Terpisah dari unggah bukti OPD yang sudah dihapus. Syarat: Penyimpanan berkas dengan batas ukuran dan hanya diunggah BAPPERIDA. Keputusan: Dokumen mana yang boleh dibaca asisten.

**D2 Jawaban berdasarkan dokumen.** Asisten mengutip bagian dokumen dengan nomor halaman dan membedakannya dari angka resmi, sehingga konteks dan penyebab yang diuraikan kajian dapat dipakai tanpa dicampur dengan data. Syarat: Pengindeksan teks dokumen dan pencarian per bagian.

**K1 Peringatan dini.** Pemberitahuan ke Bupati saat indikator memburuk beberapa tahun berturut-turut atau jauh dari target, dengan ambang yang ditetapkan BAPPERIDA. Syarat: Penjadwal dan aturan ambang. Keputusan: Ambang yang dipakai.

**K2 Proyeksi menuju target akhir periode.** Pada laju sekarang, apakah target RPJMD 2029 tercapai, disertai rentang ketidakpastian dan penegasan bahwa ini proyeksi tren, bukan ramalan. Syarat: Minimal beberapa tahun data per indikator.

**J4 Keamanan dan keandalan yang dapat dibuktikan.** Uji penetrasi independen (akun uji sudah ada), backup dan rollback produksi yang teruji, rencana pemulihan bencana, kebijakan retensi data, dan kepatuhan pada ketentuan pelindungan data pribadi dan SPBE. Syarat: Backup dan rollback produksi saat ini ditunda pemilik. Keputusan: Waktu pelaksanaan backup dan rollback; wajib sebelum dijual.

**J7 Kapuas sebagai rujukan.** Studi kasus terukur: waktu penyusunan laporan, kelengkapan realisasi, jumlah pertanyaan Bupati yang terjawab. Bukti inilah yang dilihat pembeli. Syarat: Pengukuran sejak sekarang.

## Fase 2 - Integrasi

Sumber kementerian per OPD dan integrasi mesin ke mesin dengan sistem OPD.

| Kode | Butir | Tema | Nilai | Usaha | Status |
|---|---|---|---|---|---|
| B3 | Ringkasan pagi lewat WhatsApp atau Telegram | Pengalaman Bupati | Sedang | sedang | Usulan |
| B4 | Bertanya dengan suara | Pengalaman Bupati | Sedang | kecil | Usulan |
| B5 | Peta kecamatan di dalam chat | Pengalaman Bupati | Sedang | sedang | Usulan |
| S1 | Sumber kementerian untuk tiap OPD | Sumber data lebih luas | Tinggi | besar | Usulan |
| S2 | Impor terjadwal dengan persetujuan | Sumber data lebih luas | Sedang | sedang | Perlu keputusan |
| S3 | Kamus data dan penyelarasan satuan | Sumber data lebih luas | Sedang | sedang | Usulan |
| I1 | Pedoman Website OPD Siap Integrasi | Integrasi sistem OPD | Tinggi | sedang | Usulan |
| I2 | Gerbang integrasi mesin ke mesin | Integrasi sistem OPD | Tinggi | besar | Perlu keputusan |
| I3 | Sandbox dan kartu kesehatan integrasi | Integrasi sistem OPD | Sedang | sedang | Usulan |
| D3 | Rekomendasi terfokus dari angka dan kajian | Dokumen kajian | Tinggi | sedang | Usulan |
| K3 | Skor kinerja OPD versi 2 | Rekomendasi strategis | Tinggi | sedang | Perlu keputusan |
| T1 | Skor kualitas data | Tata kelola data | Sedang | sedang | Usulan |
| T2 | Pemeriksa data janggal | Tata kelola data | Sedang | kecil | Usulan |

**B3 Ringkasan pagi lewat WhatsApp atau Telegram.** Tiga butir briefing dikirim ke ponsel Bupati dan ajudan, dengan tautan langsung ke jawaban. Syarat: Akun pengirim resmi dan persetujuan penerima. Keputusan: Saluran mana yang dipakai dan siapa yang boleh menerima.

**B4 Bertanya dengan suara.** Input suara dan pembacaan ringkasan untuk saat di perjalanan atau kunjungan lapangan. Syarat: Layanan pengenalan suara berbahasa Indonesia.

**B5 Peta kecamatan di dalam chat.** Jawaban tentang wilayah menampilkan peta kecamatan berwarna dan rincian, nyaman di ponsel saat kunjungan. Syarat: Data per kecamatan untuk indikator yang ditanyakan.

**S1 Sumber kementerian untuk tiap OPD.** Katalog sumber nasional per sektor (pendidikan, kesehatan, pertanian, lingkungan, kependudukan, keuangan daerah) dan konektor generik, masing-masing dengan pratinjau dan label belum diverifikasi sampai ditetapkan. Syarat: Ketersediaan API, lisensi, dan frekuensi pembaruan tiap sumber perlu diperiksa satu per satu. Keputusan: Sumber mana yang diprioritaskan per OPD.

**S2 Impor terjadwal dengan persetujuan.** Impor berkala yang tetap berhenti di pratinjau dan menunggu persetujuan petugas sebelum masuk Bank Data. Syarat: Penjadwal dan antrean persetujuan. Keputusan: Membalik keputusan 18 Nov 2026 yang menghapus sinkron otomatis.

**S3 Kamus data dan penyelarasan satuan.** Definisi, satuan, dan cakupan tiap indikator dicatat agar nilai dari sumber berbeda dapat dibandingkan dengan adil. Syarat: Pemetaan tetap tugas BAPPERIDA.

**I1 Pedoman Website OPD Siap Integrasi.** Spesifikasi teknis yang harus dipenuhi website atau aplikasi OPD agar dapat berkomunikasi langsung dengan SABABUKA: endpoint data, skema JSON, autentikasi, versi, dan batas laju. Dipakai OPD sebagai dasar pengadaan upgrade website. Syarat: Disepakati bersama Diskominfosantik.

**I2 Gerbang integrasi mesin ke mesin.** Penerima data dari sistem OPD lewat tarik terjadwal atau kirim langsung, dengan validasi skema, antrean, ulang otomatis, dan log. Nilai masuk sebagai usulan dan tetap melewati verifikasi BAPPERIDA. Syarat: Pedoman I1 dan kunci API per OPD. Keputusan: Apakah OPD tetap menjadi pengisi manual (aturan saat ini) atau sistem boleh menyuplai nilai setelah disetujui.

**I3 Sandbox dan kartu kesehatan integrasi.** Lingkungan uji untuk pengembang website OPD, serta kartu per OPD: terhubung atau tidak, sinkron terakhir, galat terakhir. Syarat: Gerbang I2.

**D3 Rekomendasi terfokus dari angka dan kajian.** Rekomendasi yang menggabungkan capaian, keterkaitan lintas OPD, dan dasar kutipan kajian, dengan sumber tiap usulan. Syarat: D1 dan D2.

**K3 Skor kinerja OPD versi 2.** Menambah ketepatan waktu pelaporan, kualitas data, dan jumlah pengembalian ke skor kondisi OPD, dengan bobot yang ditetapkan BAPPERIDA dan dapat ditelusuri. Syarat: Tenggat pelaporan per periode di sistem. Keputusan: Tenggat dan bobot.

**T1 Skor kualitas data.** Penilaian kelengkapan, ketepatan waktu, dan konsistensi per indikator dan per OPD, tampil di Dashboard Analisis.

**T2 Pemeriksa data janggal.** Menandai nilai yang mendadak nol, loncat tidak wajar, atau berbeda satuan sebelum terbit. Contohnya Usia Harapan Hidup 2026 yang tercatat 0 tahun. Syarat: Aturan ambang per jenis indikator.

## Fase 3 - Produk multi-daerah

Satu produk yang dapat dipasang di daerah lain dengan cepat.

| Kode | Butir | Tema | Nilai | Usaha | Status |
|---|---|---|---|---|---|
| B6 | Arahan Bupati dan pelacakan tindak lanjut OPD | Pengalaman Bupati | Tinggi | besar | Perlu keputusan |
| K4 | Simulasi skenario | Rekomendasi strategis | Sedang | besar | Usulan |
| J1 | Multi-daerah | Siap dijual ke pemda | Tinggi | besar | Perlu keputusan |
| J2 | Merek per daerah | Siap dijual ke pemda | Sedang | sedang | Usulan |
| J3 | Pemasangan daerah baru yang cepat | Siap dijual ke pemda | Tinggi | besar | Usulan |
| J5 | Lokasi data dan pilihan model AI | Siap dijual ke pemda | Sedang | sedang | Usulan |
| J6 | Paket komersial dan jalur pengadaan | Siap dijual ke pemda | Tinggi | sedang | Perlu keputusan |
| J8 | Selaras dengan standar nasional | Siap dijual ke pemda | Sedang | sedang | Usulan |

**B6 Arahan Bupati dan pelacakan tindak lanjut OPD.** Bupati menetapkan arahan dari jawaban, OPD menanggapi, sistem melacak sampai selesai. Syarat: Alur tanggapan OPD dan tenggat. Keputusan: Mengubah aturan saat ini bahwa alur berhenti pada rekomendasi kepada OPD.

**K4 Simulasi skenario.** Pertanyaan seandainya pada indikator tertentu, dengan batasan jelas bahwa hasilnya skenario, bukan prediksi pasti. Syarat: Model sederhana per indikator yang divalidasi analis.

**J1 Multi-daerah.** Satu basis kode yang dapat dipasang untuk banyak pemda, baik satu instalasi untuk tiap daerah maupun layanan bersama dengan pemisahan data ketat. Syarat: Konfigurasi daerah menggantikan teks dan pengaturan khusus Kapuas. Keputusan: Model pemasangan: instalasi per daerah atau layanan bersama.

**J2 Merek per daerah.** Logo, nama, warna, dan halaman depan dapat diganti per daerah tanpa mengubah kode. Syarat: J1.

**J3 Pemasangan daerah baru yang cepat.** Panduan bertahap: impor matriks RPJMD, struktur OPD, akun, dan sumber data awal. Sasaran: daerah baru mulai dipakai dalam hitungan minggu. Syarat: J1 dan templat indikator.

**J5 Lokasi data dan pilihan model AI.** Pilihan hosting di dalam negeri dan model AI awan atau lokal sesuai kebijakan daerah, dengan pemantauan biaya per jawaban. Syarat: Abstraksi penyedia model.

**J6 Paket komersial dan jalur pengadaan.** Lisensi tahunan per daerah, modul tambahan, pelatihan, pendampingan, dan perjanjian tingkat layanan. Jalur pengadaan pemerintah perlu dipastikan sesuai nilai kontrak. Syarat: Harga dan struktur biaya. Keputusan: Model bisnis dan harga.

**J8 Selaras dengan standar nasional.** Pemetaan ke Satu Data Indonesia dan SPBE agar mudah diterima inspektorat dan dinas kominfo daerah lain.

## Kesiapan dijual ke pemda

| Butir | Status | Catatan |
|---|---|---|
| Hak akses per peran dan jejak audit | Sudah | RBAC, audit trail, pemisahan kewenangan berjalan. |
| Jawaban bersumber dan hanya dari data terbit | Sudah | Setiap angka disertai sumber dan tahun; asisten tidak membaca data draf. |
| Alur pelaporan, verifikasi, dan penerbitan | Sudah | Termasuk pengembalian dan buka kembali untuk revisi. |
| Dashboard analisis dan chat Bupati | Sudah | Responsif di desktop, tablet, ponsel; ada briefing dan Pantauan. |
| Buku panduan dan akun uji | Sudah |  |
| Keamanan teruji pihak independen | Sebagian | Akun uji tersedia; uji penetrasi belum dilakukan. |
| Backup, rollback, dan pemulihan bencana | Sebagian | Backup basis data saat deploy ada; rencana rollback dan uji pemulihan ditunda. |
| Sumber data luar | Sebagian | BPS dan Satu Data manual lewat katalog; belum ada sumber kementerian atau integrasi OPD. |
| Dapat dipasang di daerah lain | Belum | Banyak teks, data awal, dan konfigurasi masih khusus Kapuas. |
| Perbandingan antardaerah | Belum |  |
| Integrasi mesin ke mesin dengan sistem OPD | Belum |  |
| Jawaban berdasarkan dokumen kajian | Belum |  |
| Model harga, SLA, dan jalur pengadaan | Belum |  |

## Keputusan yang dibutuhkan

- B3 Ringkasan pagi lewat WhatsApp atau Telegram: Saluran mana yang dipakai dan siapa yang boleh menerima.
- B6 Arahan Bupati dan pelacakan tindak lanjut OPD: Mengubah aturan saat ini bahwa alur berhenti pada rekomendasi kepada OPD.
- P1 Perbandingan dengan kabupaten dan kota se-Kalimantan Tengah: Daerah mana yang menjadi kelompok pembanding.
- S1 Sumber kementerian untuk tiap OPD: Sumber mana yang diprioritaskan per OPD.
- S2 Impor terjadwal dengan persetujuan: Membalik keputusan 18 Nov 2026 yang menghapus sinkron otomatis.
- I2 Gerbang integrasi mesin ke mesin: Apakah OPD tetap menjadi pengisi manual (aturan saat ini) atau sistem boleh menyuplai nilai setelah disetujui.
- D1 Perpustakaan kajian daerah: Dokumen mana yang boleh dibaca asisten.
- K1 Peringatan dini: Ambang yang dipakai.
- K3 Skor kinerja OPD versi 2: Tenggat dan bobot.
- J1 Multi-daerah: Model pemasangan: instalasi per daerah atau layanan bersama.
- J4 Keamanan dan keandalan yang dapat dibuktikan: Waktu pelaksanaan backup dan rollback; wajib sebelum dijual.
- J6 Paket komersial dan jalur pengadaan: Model bisnis dan harga.

## Catatan

- Sumber kementerian: ketersediaan API, lisensi, dan frekuensi pembaruan harus diperiksa per sumber sebelum dijanjikan.
- Integrasi OPD memerlukan upgrade website OPD sesuai pedoman I1; itu di luar aplikasi dan menjadi tanggung jawab OPD bersama Diskominfosantik.
- Dokumen kajian (D1) terpisah dari unggah bukti OPD yang dihapus pada 24 November 2026: hanya BAPPERIDA yang mengunggah, dengan batas ukuran.
