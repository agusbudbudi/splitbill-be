// Seed for the Faq collection, generated from splitbill-web src/data/faqData.ts
// (the web's static fallback). Imported via POST /api/faqs/import-defaults when
// the collection is empty. `key` keeps the web's original ids so pages that
// reference FAQs by id (featureSeoContent.ts) keep resolving.

export const FAQ_CATEGORIES = [
  "umum",
  "split-bill",
  "split-later",
  "split-bill-liburan",
  "invoice",
  "shared-goals",
  "collect-money",
  "wallet",
  "akun",
  "privasi"
];

export const DEFAULT_FAQS = [
  {
    key: "1",
    question: "Apakah SplitBill gratis digunakan?",
    answer: "SplitBill bisa dipakai gratis selamanya: semua fitur split bill dasar, 5x kuota scan struk AI, dan share rincian ke WhatsApp, lebih dari cukup buat patungan sesekali. Kalau butuh lebih, ada paket berbayar mulai Rp 19.000/bulan (Starter) dengan AI Scan unlimited dan tanpa iklan. Cek harga dan promo terbaru di halaman Langganan.",
    category: "umum",
    showOnLanding: true
  },
  {
    key: "2",
    question: "Apakah saya perlu buat akun untuk pakai?",
    answer: "Tidak wajib! Kamu bisa langsung pakai fitur Split Bill tanpa daftar sama sekali. Akun diperlukan hanya jika kamu ingin menyimpan riwayat transaksi secara permanen di cloud, menggunakan fitur Shared Goals, Collect Money, atau berlangganan Premium.",
    category: "akun",
    showOnLanding: true
  },
  {
    key: "3",
    question: "Data saya disimpan di mana?",
    answer: "Jika kamu tidak login, data transaksi disimpan secara lokal di browsermu (LocalStorage) dan hanya bisa diakses dari perangkat tersebut. Jika kamu login, data tersimpan aman di server kami yang terenkripsi dan bisa diakses dari perangkat mana saja kapan saja.",
    category: "privasi",
    showOnLanding: true
  },
  {
    key: "4",
    question: "Gimana kalau struk saya panjang banget?",
    answer: "Tenang! AI Scan kami sudah dirancang untuk membaca struk yang panjang sekalipun. Pastikan pencahayaan cukup dan tulisan pada struk terlihat jelas saat difoto. Untuk struk yang sangat panjang, coba potret dalam kondisi terbentang rata dan tidak terlipat.",
    category: "split-bill",
    showOnLanding: true
  },
  {
    key: "5",
    question: "Bisakah saya bagi tagihan dengan jumlah beda-beda?",
    answer: "Pastinya! SplitBill mendukung pembagian per item (siapa makan apa), pembagian merata, hingga pembagian custom per orang. Pajak (PPN), service charge, dan diskon pun otomatis dihitung proporsional per item menu.",
    category: "split-bill",
    showOnLanding: true
  },
  {
    key: "6",
    question: "Apa saja paket berbayar di SplitBill?",
    answer: "Ada tiga paket. Starter (Rp 19.000 untuk 1 bulan): split bill tanpa batas, riwayat transaksi, tanpa iklan, dan AI Scan unlimited. Pro (Rp 59.000 untuk 3 bulan): semua fitur Starter plus export PDF, share WhatsApp, dan AI processing lebih cepat. Ultimate (Rp 149.000 untuk 12 bulan): semua fitur Pro, AI Scan tercepat, dan early access fitur baru. Harga di atas harga normal, cek promo terbaru di halaman Langganan.",
    category: "umum",
    showOnLanding: true
  },
  {
    key: "7",
    question: "Bagaimana cara share tagihan ke teman?",
    answer: "Setelah selesai menghitung, kamu akan mendapatkan ringkasan tagihan lengkap. Klik tombol 'Share ke WhatsApp' untuk kirim rincian sekaligus info rekening/e-wallet ke teman-temanmu. Mereka tinggal buka link, lihat berapa yang harus dibayar, dan langsung transfer.",
    category: "split-bill",
    showOnLanding: false
  },
  {
    key: "8",
    question: "Seberapa akurat AI Scan struk-nya?",
    answer: "Akurasi AI Scan kami sangat tinggi (di atas 95%) untuk foto struk dengan kondisi baik. Pada Paket Premium, kamu mendapatkan akses OCR Pro yang lebih canggih dengan akurasi lebih tinggi bahkan untuk struk yang agak buram atau miring. Kami selalu sarankan untuk review cepat hasil scan sebelum proses tagihan.",
    category: "split-bill",
    showOnLanding: false
  },
  {
    key: "9",
    question: "Berapa lama riwayat transaksi disimpan?",
    answer: "Jika tidak login, data tersimpan di browser selama kamu tidak menghapus data situs (cache). Jika login, semua riwayat transaksi tersimpan permanen di cloud dan tidak akan hilang meskipun kamu ganti perangkat atau hapus cache.",
    category: "privasi",
    showOnLanding: false
  },
  {
    key: "10",
    question: "Bagaimana cara mengganti mata uang?",
    answer: "Saat ini SplitBill fokus pada Rupiah (IDR). Namun angka nominal tetap fleksibel sehingga kamu bisa menggunakannya untuk referensi mata uang lain jika diperlukan.",
    category: "umum",
    showOnLanding: false
  },
  {
    key: "11",
    question: "Apakah bisa digunakan di iPhone dan Android?",
    answer: "Tentu! SplitBill adalah Progressive Web App (PWA) yang bisa diakses lewat browser di perangkat apa pun — iPhone, Android, maupun laptop. Kamu juga bisa 'Add to Home Screen' agar muncul seperti aplikasi native di gadgetmu.",
    category: "umum",
    showOnLanding: false
  },
  {
    key: "12",
    question: "Bisa tambahkan pajak dan service charge?",
    answer: "Bisa banget. Di fitur 'Biaya Tambahan', kamu bisa input Pajak (PPN), Service Charge, maupun diskon dalam format persen (%) atau nominal rupiah. Semua akan dikalkulasi secara proporsional sesuai harga masing-masing menu.",
    category: "split-bill",
    showOnLanding: false
  },
  {
    key: "13",
    question: "Foto struknya harus satu per satu?",
    answer: "Untuk hasil terbaik, sebaiknya satu struk per foto. Jika struknya sangat panjang, AI Scan kami sudah bisa menangani foto memanjang dengan baik. Pastikan seluruh bagian struk terlihat jelas dalam satu frame.",
    category: "split-bill",
    showOnLanding: false
  },
  {
    key: "14",
    question: "Apakah ada aplikasi di App Store/Play Store?",
    answer: "Saat ini SplitBill tersedia sebagai Web App yang dioptimalkan untuk mobile. Kamu cukup buka di browser lalu pilih 'Add to Home Screen' agar muncul dan terasa seperti aplikasi biasa di layar HP-mu.",
    category: "umum",
    showOnLanding: false
  },
  {
    key: "15",
    question: "Bagaimana cara hapus akun?",
    answer: "Kamu bisa menghapus akun melalui menu Pengaturan Profil. Perlu diingat bahwa semua data yang sudah dihapus tidak dapat dikembalikan, termasuk riwayat transaksi dan data langganan Premium.",
    category: "akun",
    showOnLanding: false
  },
  {
    key: "16",
    question: "Apa itu fitur Invoice di SplitBill?",
    answer: "Fitur Invoice memungkinkan kamu membuat tagihan profesional yang rapi dan estetik. Kamu bisa menambahkan rincian item, pajak, informasi rekening pembayaran, dan catatan. Pengguna Premium mendapatkan akses desain invoice yang lebih premium dan bisa dikustomisasi sesuai brand.",
    category: "invoice",
    showOnLanding: false
  },
  {
    key: "17",
    question: "Apakah saya bisa kustomisasi tampilan invoice?",
    answer: "Bisa! Khusus Paket Premium, kamu bisa mengatur nama bisnis, logo, alamat, catatan kaki, hingga tema warna sesuai brand-mu agar invoice terlihat lebih profesional dan terpercaya.",
    category: "invoice",
    showOnLanding: false
  },
  {
    key: "18",
    question: "Format apa saja yang didukung untuk sharing invoice?",
    answer: "Kamu bisa membagikan invoice sebagai link interaktif (web view) yang bisa dibuka di browser, atau mengunduhnya sebagai gambar/PDF yang siap dikirim via WhatsApp, email, maupun platform lainnya.",
    category: "invoice",
    showOnLanding: false
  },
  {
    key: "19",
    question: "Bisakah saya membuat invoice tanpa harus split bill?",
    answer: "Tentu saja. SplitBill menyediakan Invoice Builder mandiri untuk kamu yang ingin membuat tagihan profesional secara langsung tanpa harus melewati proses bagi tagihan kelompok terlebih dahulu.",
    category: "invoice",
    showOnLanding: false
  },
  {
    key: "20",
    question: "Apa itu fitur Shared Goals?",
    answer: "Shared Goals adalah fitur nabung bareng untuk tujuan tertentu bersama circle-mu — misalnya liburan, beli kado, atau makan spesial. Kamu bisa pantau progress tabungan semua anggota secara real-time dan transparan.",
    category: "shared-goals",
    showOnLanding: false
  },
  {
    key: "21",
    question: "Gimana cara mulai Shared Goals?",
    answer: "Klik menu 'Shared Goals', buat tujuan baru (Create Goal), tentukan nama dan target nominal, lalu ajak teman-temanmu bergabung. Setiap anggota bisa mencatat kontribusi mereka masing-masing.",
    category: "shared-goals",
    showOnLanding: false
  },
  {
    key: "22",
    question: "Apakah uang tabungan Shared Goals disimpan di aplikasi?",
    answer: "Tidak. SplitBill hanya berfungsi sebagai pencatat dan pemantau progress tabungan agar transparan untuk semua anggota. Uang fisik tetap disimpan oleh bendahara atau di rekening masing-masing sesuai kesepakatan kelompok.",
    category: "shared-goals",
    showOnLanding: false
  },
  {
    key: "23",
    question: "Bisakah saya membagikan progress tabungan ke teman?",
    answer: "Bisa banget! Kamu bisa membagikan ringkasan progress tabungan dalam bentuk link interaktif atau gambar yang siap dishare ke grup WhatsApp agar semua anggota bisa pantau perkembangannya.",
    category: "shared-goals",
    showOnLanding: false
  },
  {
    key: "24",
    question: "Apa bedanya Shared Goals dengan Split Bill?",
    answer: "Split Bill digunakan untuk membagi tagihan yang sudah terjadi (misalnya abis makan). Shared Goals digunakan untuk mengumpulkan dana bersama menuju tujuan di masa depan (misalnya liburan bareng). Dua fitur berbeda untuk dua kebutuhan yang berbeda.",
    category: "shared-goals",
    showOnLanding: false
  },
  {
    key: "25",
    question: "Apa itu fitur Collect Money (Patungan)?",
    answer: "Collect Money adalah fitur patungan praktis untuk keperluan tanpa struk fisik — seperti iuran kas, kado ulang tahun teman, atau donasi. Kamu cukup tentukan nominal target atau buat patungan terbuka, lalu bagikan link-nya ke semua peserta.",
    category: "collect-money",
    showOnLanding: false
  },
  {
    key: "26",
    question: "Gimana cara pakai fitur Patungan?",
    answer: "Buka menu 'Collect Money', masukkan judul kegiatan dan target dana (boleh dikosongkan untuk patungan terbuka). Setelah itu, bagikan link patungan ke teman-teman agar mereka bisa melihat rincian dan mencatat pembayaran masing-masing.",
    category: "collect-money",
    showOnLanding: false
  },
  {
    key: "27",
    question: "Apa bedanya Patungan dengan Shared Goals?",
    answer: "Patungan (Collect Money) biasanya untuk kebutuhan yang bersifat segera dan sekali jalan — seperti iuran atau beli kado. Shared Goals lebih cocok untuk nabung bersama dalam jangka waktu tertentu menuju target besar seperti liburan atau pembelian besar.",
    category: "collect-money",
    showOnLanding: false
  },
  {
    key: "28",
    question: "Apa itu fitur Wallet di SplitBill?",
    answer: "Fitur Wallet adalah tempat kamu menyimpan informasi rekening dan akun e-wallet (BCA, Mandiri, GoPay, OVO, DANA, dll). Data ini otomatis ditampilkan saat kamu menagih ke teman agar transfer jadi lebih mudah dan tidak ada salah tujuan.",
    category: "wallet",
    showOnLanding: false
  },
  {
    key: "29",
    question: "Apakah saldonya asli dan bisa ditarik?",
    answer: "Tidak. Wallet di sini adalah kartu nama digital untuk informasi pembayaran saja. SplitBill tidak menyimpan, mengelola, atau memproses uang riil dalam bentuk apapun.",
    category: "wallet",
    showOnLanding: false
  },
  {
    key: "30",
    question: "Berapa banyak akun bank yang bisa saya simpan?",
    answer: "Kamu bisa menyimpan sebanyak yang kamu butuhkan. Saat mengirim tagihan, kamu tinggal pilih akun mana yang ingin ditampilkan kepada teman yang akan transfer.",
    category: "wallet",
    showOnLanding: false
  },
  {
    key: "31",
    question: "Bisa nambah struk bertahap selama liburan berhari-hari?",
    answer: "Bisa banget. Fitur Split Later emang dirancang buat itu, tinggal foto/upload struk kapan aja selama trip berlangsung, gak perlu langsung diitung di tempat. Struknya numpuk dulu, baru dibagi rincian pas udah santai di rumah.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "36",
    question: "Bisa langsung dipakai tanpa daftar?",
    answer: "Bisa. Kamu bisa mulai kumpulin dan hitung struk tanpa harus daftar terlebih dahulu.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "37",
    question: "Teman gue harus punya akun SplitBill juga?",
    answer: "Nggak perlu. Kamu bisa langsung share hasil perhitungan ke teman lewat WhatsApp.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "32",
    question: "Support mata uang asing kalau liburan ke luar negeri?",
    answer: "Saat ini SplitBill fokus pada Rupiah (IDR). Kamu tetap bisa input nominal mata uang asing sebagai angka referensi, tapi konversi otomatis ke IDR belum tersedia.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "33",
    question: "Data ilang gak kalau ganti HP di tengah trip?",
    answer: "Kalau kamu tidak login, data struk tersimpan lokal di browser HP tersebut. Jadi sebaiknya login dulu sebelum trip kalau khawatir ganti device di tengah jalan. Kalau login, semua struk yang udah dikumpulin otomatis tersimpan di cloud dan bisa dilanjutkan dari HP mana pun.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "34",
    question: "Beneran gratis atau ada limit?",
    answer: "Fitur Split Later gratis dipakai tanpa perlu bikin akun. Kalau mau scan struk pakai AI, paket gratisan dapat 5x kuota scan, lebih dari cukup buat kumpulin beberapa struk selama liburan. Kalau butuh scan tanpa batas, ada opsi upgrade ke Premium.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "35",
    question: "Setelah semua struk terkumpul, gimana cara bagi rata ke temen?",
    answer: "Setelah trip selesai, tinggal buka kumpulan struknya, assign siapa bayar/pakai apa (atau split rata aja), lalu generate rincian. Kamu bisa langsung share link hasilnya ke grup WhatsApp, temen tinggal lihat berapa yang harus ditransfer.",
    category: "split-bill-liburan",
    showOnLanding: false
  },
  {
    key: "38",
    question: "Apa bedanya Split Later sama Split Bill biasa?",
    answer: "Split Bill biasa buat itung tagihan langsung di tempat. Split Later buat kumpulin banyak struk dulu (mis. selama liburan atau acara berhari-hari), baru diproses & disettle belakangan pas udah santai, semua struk dalam satu acara dihitung jadi satu rangkuman.",
    category: "split-later",
    showOnLanding: false
  },
  {
    key: "39",
    question: "Harus login dulu buat pakai Split Later?",
    answer: "Iya, Split Later butuh login supaya struk dan progress bucket-nya kesimpen aman di akun kamu, gak hilang meskipun ganti device di tengah acara.",
    category: "split-later",
    showOnLanding: false
  },
  {
    key: "40",
    question: "Kalau belum sempat proses struknya, gimana?",
    answer: "Santai aja, foto struk bisa langsung diupload kapan aja lewat menu Quick Capture tanpa harus diproses saat itu juga. Struk bakal nunggu di bucket sampai kamu sempat assign item & split-nya.",
    category: "split-later",
    showOnLanding: false
  },
  {
    key: "41",
    question: "Settlement-nya ngitung dari berapa struk?",
    answer: "Semua struk yang statusnya sudah diproses dalam satu bucket digabung jadi satu rangkuman \"siapa bayar siapa\", jadi gak perlu transfer terpisah tiap struk.",
    category: "split-later",
    showOnLanding: false
  }
];
