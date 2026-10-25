function createFormTahap1Sababuka() {
  const form = FormApp.create('Formulir Tahap 1 SABABUKA - Profil Data dan Verifikasi Indikator OPD');
  form.setDescription(
    'PETUNJUK PENGISIAN: Setiap pengiriman hanya memilih satu jenis pengisian. ' +
    'Profil sumber data cukup dikirim satu kali untuk setiap OPD. Verifikasi metadata dikirim satu kali untuk setiap indikator; ' +
    'jika OPD memiliki lebih dari satu indikator, buka kembali formulir dan kirim respons baru untuk setiap indikator berikutnya. ' +
    'Rekap kendali final hanya diisi oleh Verifikator BAPPERIDA. ' +
    'Isi sesuai kondisi sebenarnya. Jangan menuliskan API key, token, username, atau kata sandi. ' +
    'Data digunakan untuk tindak lanjut SABABUKA oleh BAPPERIDA, Diskominfosantik, dan Pengelola Sistem. ' +
    'Jika memerlukan bantuan, hubungi Rahmat - Tim Developer SABABUKA, WhatsApp 082254049695.'
  );
  form.setCollectEmail(true);
  form.setProgressBar(true);
  form.setConfirmationMessage('Jawaban berhasil direkam. Jika OPD Anda masih memiliki indikator lain yang harus diverifikasi, buka kembali formulir dan kirim satu respons baru untuk indikator berikutnya. Jika memerlukan bantuan, hubungi Rahmat - Tim Developer SABABUKA melalui WhatsApp 082254049695.');

  const opd = [
    'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',
    'Badan Kesatuan Bangsa dan Politik',
    'Badan Keuangan dan Aset Daerah',
    'Badan Penanggulangan Bencana Daerah',
    'Badan Pendapatan Daerah',
    'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah',
    'Dinas Kearsipan dan Perpustakaan',
    'Dinas Kebudayaan, Pariwisata, Kepemudaan dan Olahraga',
    'Dinas Kependudukan dan Pencatatan Sipil',
    'Dinas Kesehatan',
    'Dinas Ketahanan Pangan dan Perikanan',
    'Dinas Komunikasi, Informatika, Persandian dan Statistik',
    'Dinas Lingkungan Hidup dan Kehutanan',
    'Dinas Pekerjaan Umum dan Penataan Ruang',
    'Dinas Pemadam Kebakaran dan Penyelamatan',
    'Dinas Pemberdayaan Masyarakat dan Desa',
    'Dinas Pemberdayaan Perempuan, Perlindungan Anak, Pengendalian Penduduk dan Keluarga Berencana',
    'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',
    'Dinas Pendidikan',
    'Dinas Perdagangan, Perindustrian, Koperasi dan Usaha Kecil Menengah',
    'Dinas Perhubungan',
    'Dinas Pertanian',
    'Dinas Perumahan, Kawasan Permukiman dan Pertanahan',
    'Dinas Sosial',
    'Dinas Transmigrasi dan Tenaga Kerja',
    'Inspektorat Kabupaten Kapuas',
    'Satuan Polisi Pamong Praja',
    'Sekretariat DPRD Kabupaten Kapuas',
    'Sekretariat Daerah Kabupaten Kapuas',
    'OPD/unit kerja lainnya - tuliskan pada kolom berikut'
  ];

  form.addSectionHeaderItem().setTitle('Identitas pengisi').setHelpText('Identitas harus sesuai akun atau surat penugasan resmi.');
  addText(form, 'Nama lengkap pengisi', true);
  addText(form, 'Jabatan', true);
  addText(form, 'Nomor WhatsApp aktif', true);
  form.addListItem().setTitle('Perangkat daerah/OPD yang diwakili').setChoiceValues(opd).setRequired(true);
  addText(form, 'Nama OPD/unit kerja lainnya', false, 'Isi hanya jika OPD atau unit kerja Anda belum tercantum pada daftar.');
  const workflow = form.addMultipleChoiceItem().setTitle('Jenis pengisian')
    .setHelpText('Pilih satu jenis untuk setiap pengiriman. Profil OPD cukup sekali. Verifikasi metadata dikirim ulang satu kali untuk setiap indikator. Rekap final hanya untuk Verifikator BAPPERIDA.')
    .setRequired(true);

  const profilePage = form.addPageBreakItem().setTitle('Profil sumber data OPD')
    .setHelpText('Isi satu kali untuk memetakan website, akses data, lokasi data perencanaan, baseline, dan dokumen acuan.');
  form.addSectionHeaderItem().setTitle('Website OPD');
  addChoice(form, 'Apakah OPD memiliki website?', ['Ya', 'Tidak ada'], true);
  addText(form, 'Alamat website OPD', false, 'Isi jika memiliki website. Contoh: https://opd.kapuaskab.go.id');
  addChoice(form, 'Kondisi website', ['Aktif dan diperbarui', 'Aktif tetapi jarang diperbarui', 'Tidak dapat diakses', 'Belum diperiksa', 'Tidak berlaku karena tidak memiliki website'], true);
  addChoice(form, 'Pengelola website', ['Tim OPD', 'Diskominfosantik', 'Pihak ketiga/vendor', 'OPD bersama Diskominfosantik', 'Belum diketahui', 'Tidak berlaku karena tidak memiliki website'], true);

  form.addSectionHeaderItem().setTitle('Akses dan pembaruan data')
    .setHelpText('Jangan menuliskan kredensial rahasia pada jawaban.');
  addChoice(form, 'Apakah tersedia API?', ['Ya', 'Tidak tersedia', 'Direncanakan'], true);
  addText(form, 'URL API/endpoint', false, 'Isi hanya jika API tersedia.');
  addText(form, 'URL dokumentasi API', false, 'Opsional. Dapat berupa Swagger, OpenAPI, atau petunjuk resmi.');
  addChoice(form, 'Cara akses API', [
    'Tanpa autentikasi', 'API key/token', 'OAuth 2.0', 'Username dan password',
    'Pembatasan alamat IP', 'Lainnya', 'Belum diketahui', 'Tidak berlaku karena API tidak tersedia'
  ], true);
  addChoice(form, 'Frekuensi pembaruan data', [
    'Real-time', 'Harian', 'Mingguan', 'Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan', 'Tidak tetap', 'Belum diketahui'
  ], true);
  addText(form, 'Nama aplikasi/database internal', false, 'Nama sistem saja, tanpa username atau kata sandi.');
  form.addCheckboxItem().setTitle('Format data yang dapat diberikan').setChoiceValues(['JSON', 'CSV', 'Excel/XLSX', 'PDF', 'Tidak tersedia']).setRequired(true);

  form.addSectionHeaderItem().setTitle('Lokasi data perencanaan');
  addChoice(form, 'Ketersediaan data RPJMD di website', ['Tersedia lengkap', 'Tersedia sebagian', 'Tidak tersedia'], true);
  addChoice(form, 'Ketersediaan data Renstra di website', ['Tersedia lengkap', 'Tersedia sebagian', 'Tidak tersedia'], true);
  form.addCheckboxItem().setTitle('Lokasi penyimpanan saat ini').setChoiceValues([
    'Website OPD', 'Satu Data Kapuas', 'Aplikasi internal', 'Database internal', 'Excel/Google Sheet', 'Dokumen fisik'
  ]).setRequired(true);
  addText(form, 'Nama aplikasi/sistem penyimpanan', false, 'Contoh: SIPD atau aplikasi internal.');
  addText(form, 'Bidang/unit pemilik data', false, 'Unit yang dapat mengonfirmasi data.');

  form.addSectionHeaderItem().setTitle('Nilai awal baseline indikator')
    .setHelpText('Opsional. Isi nilai historis terakhir yang memiliki sumber dapat dipertanggungjawabkan. Gunakan kolom tambahan untuk maksimal tiga baseline; jika lebih, kirim respons profil tambahan.');
  addChoice(form, 'Apakah OPD memiliki baseline yang siap dicatat?', ['Ya', 'Tidak/belum tersedia'], true);
  for (let i = 1; i <= 3; i += 1) addBaselineBlock(form, i);

  form.addSectionHeaderItem().setTitle('Dokumen acuan');
  form.addCheckboxItem().setTitle('Jenis dokumen acuan yang tersedia').setChoiceValues([
    'Dokumen Renstra', 'Dokumen atau laporan perkembangan RPJMD', 'Belum tersedia'
  ]).setRequired(true);
  addText(form, 'Tahun dokumen', false, 'Contoh: 2025.');
  addText(form, 'Tautan dokumen', false, 'Tautan Google Drive atau website resmi. Atur akses agar pemeriksa dapat membuka dokumen.');
  addParagraph(form, 'Catatan dokumen acuan', false);
  form.addCheckboxItem().setTitle('Pernyataan profil OPD').setChoiceValues([
    'Saya menyatakan informasi dan baseline sesuai dokumen atau sumber yang dikuasai OPD.',
    'Saya memastikan jawaban tidak memuat API key, token, username, atau kata sandi.'
  ]).setRequired(true);
  profilePage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  const indicatorPage = form.addPageBreakItem().setTitle('Verifikasi metadata indikator oleh PIC OPD')
    .setHelpText('Isi satu respons untuk satu indikator. Jika OPD memiliki lebih dari satu indikator, kirim formulir ini kembali satu kali untuk setiap indikator berikutnya. Bantuan: Rahmat - Tim Developer SABABUKA, WhatsApp 082254049695.');
  addText(form, 'Kode indikator', true);
  addText(form, 'Nama indikator', true);
  addChoice(form, 'Apakah OPD utama sudah benar?', ['Ya', 'Tidak', 'Perlu konfirmasi BAPPERIDA'], true);
  form.addCheckboxItem().setTitle('Komponen metadata yang sudah diperiksa').setChoiceValues([
    'Nama indikator sesuai RPJMD',
    'Definisi operasional jelas',
    'Rumus perhitungan sesuai praktik teknis OPD',
    'Satuan tepat',
    'Tipe data tepat',
    'Frekuensi pembaruan realistis',
    'Arah capaian benar',
    'Sumber rujukan dapat ditelusuri',
    'Target 2025-2029 sesuai RPJMD'
  ]).setRequired(true);
  addChoice(form, 'Hasil pemeriksaan metadata', ['Sesuai dan siap dikonfirmasi', 'Perlu koreksi metadata teknis', 'Tidak dapat dikonfirmasi'], true);
  addParagraph(form, 'Koreksi definisi operasional', false);
  addParagraph(form, 'Koreksi rumus perhitungan', false);
  addText(form, 'Koreksi satuan', false);
  addChoice(form, 'Koreksi frekuensi pembaruan', ['Tidak ada koreksi', 'Tahunan', 'Semesteran', 'Triwulanan', 'Bulanan', 'Mingguan', 'Insidental', 'Khusus'], false);
  addChoice(form, 'Koreksi tipe data', ['Tidak ada koreksi', 'Angka', 'Persentase', 'Indeks', 'Rasio', 'Teks/kategori'], false);
  addChoice(form, 'Koreksi arah capaian', ['Tidak ada koreksi', 'Naik lebih baik', 'Turun lebih baik', 'Dipertahankan'], false);
  addParagraph(form, 'Koreksi sumber rujukan/data', false);
  addParagraph(form, 'Catatan perubahan atau alasan belum dapat dikonfirmasi', false);
  form.addCheckboxItem().setTitle('Pernyataan verifikasi OPD').setChoiceValues([
    'Saya telah memeriksa indikator ini berdasarkan RPJMD dan sumber teknis OPD.',
    'Saya memahami target 2025-2029 dan OPD penanggung jawab tetap dikelola BAPPERIDA.'
  ]).setRequired(true);
  indicatorPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  const bapperidaPage = form.addPageBreakItem().setTitle('Rekap kendali final BAPPERIDA')
    .setHelpText('Diisi oleh Verifikator BAPPERIDA untuk pemeriksaan akhir tahap 1.');
  addText(form, 'Kode indikator yang diperiksa', true);
  addText(form, 'Nama indikator yang diperiksa', true);
  form.addCheckboxItem().setTitle('Daftar pemeriksaan BAPPERIDA').setChoiceValues([
    'Indikator tercantum pada matriks resmi RPJMD',
    'Kode dan nama indikator tidak duplikat',
    'Kelompok isu dan fokus pembangunan tepat',
    'OPD utama dan perangkat daerah terkait sudah dipetakan',
    'Definisi operasional jelas dan dapat diukur',
    'Rumus, satuan, tipe data, frekuensi, dan arah capaian konsisten',
    'Sumber rujukan dapat ditelusuri',
    'Target 2025-2029 tersedia dan sesuai RPJMD',
    'OPD pemilik telah memberikan konfirmasi teknis',
    'Catatan perubahan telah diperiksa'
  ]).setRequired(true);
  addChoice(form, 'Keputusan akhir BAPPERIDA', ['Aktifkan indikator', 'Kembalikan untuk perbaikan', 'Tunda dan klarifikasi'], true);
  addParagraph(form, 'Catatan keputusan BAPPERIDA', false);
  bapperidaPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  workflow.setChoices([
    workflow.createChoice('Profil sumber data OPD', profilePage),
    workflow.createChoice('Verifikasi metadata indikator oleh PIC OPD', indicatorPage),
    workflow.createChoice('Rekap kendali final BAPPERIDA', bapperidaPage)
  ]);

  console.log('EDIT_URL=' + form.getEditUrl());
  console.log('RESPOND_URL=' + form.getPublishedUrl());
  return { editUrl: form.getEditUrl(), respondUrl: form.getPublishedUrl() };
}

function updateExistingFormTahap1Sababuka() {
  const form = FormApp.openById('1EzukhwBbuAPEn3HH4GiXtqxgAcS-39bqA_eKnjoKrYY');
  form.setDescription(
    'PETUNJUK PENGISIAN: Setiap pengiriman hanya memilih satu jenis pengisian. Profil sumber data cukup dikirim satu kali untuk setiap OPD. ' +
    'Verifikasi metadata dikirim satu kali untuk setiap indikator; jika OPD memiliki lebih dari satu indikator, buka kembali formulir dan kirim respons baru untuk setiap indikator berikutnya. ' +
    'Rekap kendali final hanya diisi oleh Verifikator BAPPERIDA. Isi sesuai kondisi sebenarnya. Jangan menuliskan API key, token, username, atau kata sandi. ' +
    'Jika memerlukan bantuan, hubungi Rahmat - Tim Developer SABABUKA, WhatsApp 082254049695.'
  );

  const items = form.getItems();
  const opdItem = items.find(item => item.getTitle() === 'Perangkat daerah/OPD yang diwakili').asListItem();
  const choices = opdItem.getChoices().map(choice => choice.getValue());
  const otherLabel = 'OPD/unit kerja lainnya - tuliskan pada kolom berikut';
  if (!choices.includes(otherLabel)) choices.push(otherLabel);
  opdItem.setChoiceValues(choices);

  let otherItem = form.getItems().find(item => item.getTitle() === 'Nama OPD/unit kerja lainnya');
  const workflowItem = form.getItems().find(item => item.getTitle() === 'Jenis pengisian');
  if (!otherItem) {
    otherItem = form.addTextItem()
      .setTitle('Nama OPD/unit kerja lainnya')
      .setHelpText('Isi hanya jika OPD atau unit kerja Anda belum tercantum pada daftar.')
      .setRequired(false);
    const workflowIndex = form.getItems().findIndex(item => item.getId() === workflowItem.getId());
    form.moveItem(otherItem, workflowIndex);
  }
  workflowItem.asMultipleChoiceItem().setHelpText(
    'Pilih satu jenis untuk setiap pengiriman. Profil OPD cukup sekali. Verifikasi metadata dikirim ulang satu kali untuk setiap indikator. Rekap final hanya untuk Verifikator BAPPERIDA.'
  );
  console.log('UPDATED_FORM=' + form.getEditUrl());
}

function addText(form, title, required, helpText) {
  const item = form.addTextItem().setTitle(title).setRequired(required);
  if (helpText) item.setHelpText(helpText);
  return item;
}

function addParagraph(form, title, required) {
  return form.addParagraphTextItem().setTitle(title).setRequired(required);
}

function addChoice(form, title, values, required) {
  return form.addMultipleChoiceItem().setTitle(title).setChoiceValues(values).setRequired(required);
}

function addBaselineBlock(form, number) {
  form.addSectionHeaderItem().setTitle('Baseline ' + number + (number === 1 ? '' : ' - opsional'));
  addText(form, 'Baseline ' + number + ' - kode dan nama indikator', number === 1 ? false : false);
  addChoice(form, 'Baseline ' + number + ' - sumber dokumen', ['RPJMD', 'Renstra OPD'], false);
  addText(form, 'Baseline ' + number + ' - periode', false, 'Contoh: 2024 atau Desember 2024.');
  addText(form, 'Baseline ' + number + ' - nilai', false);
  addText(form, 'Baseline ' + number + ' - satuan', false);
  addText(form, 'Baseline ' + number + ' - sumber data', false, 'Nama laporan atau dataset.');
  addParagraph(form, 'Baseline ' + number + ' - catatan singkat', false);
}
