# Mockup Redesign SABABUKA

Mockup HTML statis (bisa dibuka langsung di browser) sebagai **acuan visual** implementasi. Sumber kebenaran keputusan desain ada di [`../SABABUKA_REDESIGN_SPEC.md`](../SABABUKA_REDESIGN_SPEC.md).

| Berkas | Isi | Acuan spec |
|---|---|---|
| `dashboard-pimpinan.html` | Dashboard Pimpinan: ringkasan narasi + lampu lalu lintas, analitik standar, peta kecamatan tertanam, 6 panel premium tergembok, Asisten AI melayang | §3, §4, §6 |
| `peran-opd-walidata-pembina.html` | Tiga halaman per peran (tab): OPD (Operator), Walidata, Pembina Data (BPS) | §5 |
| `navigasi-halaman-padat.html` | Sidebar per-peran + badge "Segera", Beranda Tugas yang difokuskan, Matriks Indikator ringkas | §2.1, §2.4 |
| `audit-ui-ux.html` | Laporan audit UI/UX 21 halaman (temuan & prioritas) | — |

## Cara membuka
Buka berkas `.html` langsung di browser, atau jalankan server demo lalu akses path `docs/mockups/...`.

## Catatan
- Semua angka di mockup adalah **data ilustrasi**, bukan data resmi.
- Mockup mandiri (inline CSS/JS), mendukung light & dark theme.
- Mockup menunjukkan *maksud desain*; implementasi akhir mengikuti arsitektur aplikasi yang berlaku (lihat AGENTS.md).
