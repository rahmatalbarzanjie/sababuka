# Handoff Implementasi Identitas SABABUKA

Tanggal: 24 Oktober 2026
Status: konsep 03 `Gerbang Data` disetujui pemilik pada 24 Oktober 2026 untuk diteruskan ke tahap produksi, validasi budaya, dan integrasi kode.

## Sumber visual

- Papan konsep logo: `design/brand-concepts/sababuka-logo-concept-01.png`
- Papan konsep Asisten Data: `design/brand-concepts/sababuka-assistant-concept-01.png`
- Eksplorasi logo berbasis filosofi Topeng Sababuka: `design/brand-concepts/sababuka-logo-mask-concept-02.png`
- Eksplorasi Asisten Data berbasis filosofi Topeng Sababuka: `design/brand-concepts/sababuka-assistant-mask-concept-02.png`
- Alternatif ikon minimal topeng/gerbang data: `design/brand-concepts/sababuka-gateway-mask-concept-03.png`
- Asisten Data turunan logo Gerbang Data: `design/brand-concepts/sababuka-assistant-gateway-concept-03.png`
- Rasional, palet, dan prompt: `design/brand-concepts/README.md`
- Kajian filosofi dan batas etis: `docs/FILOSOFI_VISUAL_SABABUKA.md`
- Lambang resmi yang sedang digunakan: `frontend/public/logo-kapuas.png`

Papan konsep adalah referensi arah visual, bukan aset yang boleh langsung dipasang ke antarmuka. Jangan memotong gambar papan konsep untuk dijadikan logo atau avatar. Gunakan konsep 03 sebagai arah produksi yang disetujui, tetapi selesaikan review budaya sebelum penetapan identitas resmi.

## Keputusan identitas

Logo SABABUKA menggunakan gagasan aliran sungai/huruf S, tiga simpul data, dan kilau Bersinar. Karakter Asisten Data merupakan perpanjangan simbol tersebut. Palet utama:

- navy `#16304F`;
- teal `#0F6D54`;
- emas `#C99A2E`;
- putih `#FFFFFF`.

Identitas produk harus berdampingan dengan lambang Kabupaten Kapuas. Jangan menyalin, menggambar ulang, memasukkan, atau menggantikan lambang resmi dengan logo produk.

Asisten Data harus tampil sebagai pemandu data resmi. Ia tidak boleh divisualkan atau ditulis sebagai pihak yang membuat keputusan, menetapkan kebijakan, atau mengarang jawaban ketika data tidak cukup.

## Aset produksi yang harus dibuat

1. `frontend/public/brand/sababuka-mark.svg`
2. `frontend/public/brand/sababuka-lockup-horizontal.svg`
3. `frontend/public/brand/sababuka-mark-monochrome.svg`
4. ikon aplikasi/favicons yang diturunkan dari mark pada ukuran yang diperlukan aplikasi;
5. avatar Asisten Data transparan untuk state `neutral`, `searching`, `verified`, `warning`, dan `insufficient`;
6. fallback satu warna atau SVG sederhana untuk kondisi reduced motion dan ukuran kecil.

Master logo harus digambar ulang sebagai geometri SVG yang rapi. Wordmark memakai teks/font nyata atau outline vektor yang sudah diperiksa, bukan huruf hasil generasi gambar.

Asisten Data memakai pendekatan `living logo`: siluet dasar harus sama dengan mark Gerbang Data. Perubahan state dilakukan melalui mata, tiga checkpoint, cahaya, dan motion sederhana—bukan dengan menambahkan tubuh robot atau maskot baru.

## Titik integrasi awal

- Pertahankan `frontend/public/logo-kapuas.png` sebagai lambang pemerintah.
- Ganti placeholder huruf pada `.brand-symbol` dengan mark SABABUKA jika konteksnya identitas produk.
- Evaluasi `frontend/src/pages/AuthPages.tsx`: tampilkan hubungan yang jelas antara lambang Pemerintah Kabupaten Kapuas dan identitas produk SABABUKA tanpa menggabungkan keduanya menjadi satu lambang.
- Ganti penggunaan ikon `Bot` generik pada `frontend/src/pages/AssistantPage.tsx` dengan komponen avatar SABABUKA.
- Gunakan avatar yang sama pada tombol mengambang/panel Asisten Data ketika fitur tersebut diterapkan.
- Perbarui favicon hanya dengan mark produk yang tetap terbaca pada 16–32 piksel.
- Tambahkan alt text Bahasa Indonesia dan pastikan status tidak disampaikan melalui warna saja.

## Batas implementasi

- Baca `AGENTS.md` dan `docs/SABABUKA_REDESIGN_SPEC.md` sebelum mengubah frontend.
- Jangan mengubah backend, kontrak API, RBAC, workflow verifikasi, atau data.
- Jangan menghapus lambang Kabupaten Kapuas.
- Jangan memakai gambar papan konsep beresolusi besar sebagai aset runtime.
- Pertahankan loading, empty, error, focus, responsive, dan reduced-motion state.
- Uji desktop, tablet, dan mobile; jalankan `pnpm check` dan `pnpm build` di `frontend/`.

## Kriteria selesai

- Logo produk tampil tajam pada login, sidebar, dan favicon.
- Lambang pemerintah dan identitas produk tidak tertukar.
- Avatar Asisten Data konsisten pada halaman penuh dan semua pintu masuk chat.
- Ikon terbaca pada ukuran kecil dan memiliki fallback aksesibel.
- Tidak ada concept-board PNG yang dimuat oleh aplikasi produksi.
- Pemeriksaan frontend dan build berhasil.
