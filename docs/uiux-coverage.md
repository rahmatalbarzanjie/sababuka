# Cakupan UI/UX SABABUKA

Dokumen ini mengunci cakupan perbaikan agar pembaruan tidak berhenti pada satu halaman. Backend, izin akses, dan alur kebijakan tetap menjadi sumber kebenaran; pekerjaan UI hanya mengubah presentasi dan interaksi frontend.

## Arah desain

- Gaya: `achromatic-ledger`, seed `1915577360`.
- Wajah produk: dasar biru-abu netral, lambang Kabupaten Kapuas, bahasa kerja OPD/BAPPERIDA, dan biru daerah hanya pada data atau status yang perlu perhatian.
- Tipografi: Source Sans 3 yang sudah menjadi aset lokal proyek.
- Ciri SABABUKA: status alur indikator dan capaian selalu menjelaskan pihak yang harus bertindak berikutnya.
- Aturan responsif: desktop 1440 px, tablet 768 px, mobile 390 px; tabel harus dapat digeser atau berubah menjadi kartu bila tindakan baris penting.

## Matriks rute

| Kelompok | Rute | Jenis layar | State wajib | Status |
| --- | --- | --- | --- | --- |
| Autentikasi | `/login`, `/register`, `/activate`, `/security/setup` | form | loading, validasi, error, sukses | fondasi bersama |
| Pimpinan | `/dashboard`, `/executive` | overview/report | loading, empty, error, data | fondasi bersama |
| Analisis | `/analysis`, `/finance`, `/public-services` | analytics | loading, empty, error, data | fondasi bersama |
| Asisten | `/assistant` | inbox/conversation | loading, empty, error, data | belum diaudit rinci |
| Operasional | `/operations`, `/notifications`, `/audit` | queue/list | loading, empty, error, data | fondasi bersama |
| Organisasi | `/admin/organizations`, `/admin/opd-monitoring` | list/report | loading, empty, error, data | fondasi bersama |
| Akses | `/admin/users`, `/admin/roles`, `/admin/menus` | list/settings | loading, empty, error, data | fondasi bersama |
| Sistem | `/admin`, `/admin/system`, `/admin/profile` | overview/settings | loading, empty, error, data | fondasi bersama |
| RPJMD | `/governance/categories`, `/governance/indicators` | list/detail | loading, empty, error, data | indikator diaudit rinci |
| Pelaporan | `/submissions`, `/reviews`, `/guidance` | queue/detail | loading, empty, error, data | fondasi bersama |
| Publikasi | `/publications` | list/detail | loading, empty, error, data | fondasi bersama |
| Walidata | `/connectors` | registry/settings | loading, empty, error, data | fondasi bersama |
| OPD | `/opd-profile` | form/detail | loading, empty, error, data | fondasi bersama |

## Gerbang selesai per rute

1. Hierarki judul, temuan utama, dan tindakan utama terbaca dalam satu layar awal.
2. Loading tidak menggeser tata letak secara ekstrem; empty menjelaskan langkah berikutnya; error menyediakan pemulihan bila aman.
3. Fokus keyboard terlihat, dialog mengunci fokus, dan area tabel memiliki nama aksesibel.
4. Tidak ada overflow halaman pada 1440, 768, dan 390 px. Overflow horizontal hanya boleh berada di kontainer tabel yang diberi petunjuk.
5. Tombol dan istilah mempertahankan kebijakan: OPD, RPJMD, BAPPERIDA, indikator, approve, dan verifikasi.
6. TypeScript dan build produksi lulus; halaman representatif diperiksa di browser pada tiga viewport.

## Urutan pengerjaan

1. Fondasi lintas aplikasi: token, tabel, form, loading, empty, error, fokus, dan responsif.
2. Shell dan autentikasi.
3. RPJMD serta alur OPD/BAPPERIDA.
4. Administrasi, organisasi, akses, dan sistem.
5. Pelaporan, review, publikasi, dan walidata.
6. Dashboard pimpinan, analisis, dan asisten.
7. Audit visual seluruh rute dan penutupan temuan.

## Audit mendalam 24 Oktober 2026

- 25 rute terlindungi diperiksa pada desktop 1440 px dan mobile 390 px: 50 kombinasi halaman/viewport.
- Pemeriksaan mencakup satu `h1` per halaman, overflow dokumen, nama aksesibel kontrol, crash JavaScript, dan state pemulihan ketika API gagal.
- Hasil otomatis: 50 diperiksa, 0 kegagalan. Laporan berada di `.taste-skill/sababuka-system/deep-audit/report.json`.
- Matriks Indikator juga diperiksa dengan data realistis pada 1440, 768, dan 390 px, termasuk loading, empty, error, detail, checkbox keyboard, dan tindakan massal.
- Audit error tidak menggantikan uji data nyata per modul. Loaded-state rinci di luar Matriks Indikator tetap harus diuji lagi saat fixture atau data lokal modul tersebut tersedia.
