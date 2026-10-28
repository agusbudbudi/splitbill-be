import { HttpError } from "./errors.js";
import { text } from "./validators.js";

// Lucide icon names the landing page knows how to render. splitbill-web maps
// each name to its component through a static import map (importing all of
// lucide would bloat the hero bundle), so a name must be added there too
// before it can be allowed here. Keep in sync with client/src/lib/landingOptions.js.
export const LANDING_ICONS = [
  "ArrowRight",
  "BadgeCheck",
  "Calculator",
  "Camera",
  "CheckCircle",
  "Clock",
  "CreditCard",
  "Gift",
  "Heart",
  "Lock",
  "MessageCircle",
  "PiggyBank",
  "Plane",
  "Receipt",
  "ScanLine",
  "Send",
  "Share2",
  "Shield",
  "ShieldCheck",
  "Smartphone",
  "Sparkles",
  "Star",
  "ThumbsUp",
  "TrendingUp",
  "UserCheck",
  "UserPlus",
  "Users",
  "Utensils",
  "Wallet",
  "Zap",
];

// Color presets instead of raw Tailwind classes: class names read from the DB
// are never seen by Tailwind's build, so they would ship without CSS.
export const LANDING_TONES = ["primary", "blue", "amber", "emerald", "green", "rose", "violet", "purple"];

// Section counts are fixed to match the layouts (3-column grids, the 3-step
// connector line, HowTo structured data).
const SOCIAL_PROOF_COUNT = 3;
const STEP_COUNT = 3;
const CTA_CARD_COUNT = 3;
const MAX_TRUST_ITEMS = 3;
const USE_CASE_COUNT = 3;
const MIN_FEATURES = 2;
const MAX_FEATURES = 9;
const MIN_COMPARISON_POINTS = 2;
const MAX_COMPARISON_POINTS = 8;
const MAX_PROMO_SLIDES = 6;
const MAX_SAME_AS = 8;
const SEO_CONTENT_MAX = 6000;

// Homepage sections below the hero (always first: it holds the H1), in their
// default order. The layout can reorder them and hide most of them.
export const LAYOUT_SECTIONS = [
  "socialProof",
  "promoSlider",
  "featureShowcase",
  "features",
  "useCases",
  "howItWorks",
  "promoBanner",
  "marketingBanner",
  "comparison",
  "testimonials",
  "blog",
  "seoContent",
  "faq",
  "ctaBanner",
];

// Sections that start hidden (in default content and when appended to a stored
// layout that predates them).
export const HIDDEN_BY_DEFAULT_SECTIONS = ["seoContent"];

// Targets of the site navbar's "#fitur" / "#cara-pakai" / "#testimoni" links,
// rendered on every marketing page — hiding one would break those links.
export const ALWAYS_VISIBLE_SECTIONS = ["featureShowcase", "howItWorks", "testimonials"];

// In-page anchor ids → the section that renders them.
const ANCHOR_SECTIONS = {
  fitur: "featureShowcase",
  "cara-pakai": "howItWorks",
  testimoni: "testimonials",
  faq: "faq",
};

export const DEFAULT_LANDING_CONTENT = {
  seo: {
    title: "Split Bill Online - Aplikasi Bagi Tagihan & Patungan Gratis",
    description:
      "Split bill online gratis: scan struk pakai AI, hitung pajak dan service charge otomatis, lalu bagi tagihan ke teman lewat WhatsApp. Tanpa install aplikasi.",
    socialTitle: "SplitBill: Split Bill Online, Bagi Tagihan Lebih Mudah",
    socialDescription: "",
    ogImage: {
      url: "/img/pwa-banner.png",
      alt: "SplitBill, aplikasi split bill online gratis untuk bagi tagihan bareng teman",
      width: 1200,
      height: 630,
    },
    sameAs: ["https://www.instagram.com/splitbill.app/"],
  },
  hero: {
    eyebrow: { text: "⚡ Foto Struk → Tagihan Jadi", badge: "NEW" },
    title: "Split Bill Online\nGratis: Scan Struk,\nBagi Tagihan",
    titleHighlight: "dalam 5 Detik",
    description:
      "Foto struk, AI otomatis membaca total belanja dan langsung membagi tagihan dengan adil. Gratis tanpa login.",
    primaryCta: { label: "Scan Struk Gratis", href: "/split-bill", icon: "Camera" },
    secondaryCta: { label: "Lihat Cara Pakainya", href: "#cara-pakai" },
    trustItems: [
      { icon: "Users", text: "5.000+ Tagihan dibuat", tone: "primary" },
      { icon: "Zap", text: "No login needed", tone: "emerald" },
    ],
    image: {
      url: "/img/hero-mockup.webp",
      alt: "Tampilan hasil split bill di aplikasi SplitBill dengan instruksi transfer dan rincian per orang",
      width: 1440,
      height: 1440,
    },
    // Optional art-directed image for phones; null = mobile reuses `image`
    imageMobile: null,
  },
  socialProof: {
    items: [
      { icon: "Zap", title: "Cuma 3 Step", desc: "Bikin list, scan struk, langsung bagi.", tone: "amber" },
      { icon: "UserCheck", title: "Gak Perlu Login", desc: "Langsung pakai instan tanpa drama OTP.", tone: "blue" },
      { icon: "Sparkles", title: "Scan Struk AI", desc: "Deteksi otomatis item dan hitung presisi.", tone: "emerald" },
    ],
  },
  howItWorks: {
    title: "3 Langkah Gampang,",
    titleHighlight: "Sat-Set Beres!",
    subtitle: "Gak pake ribet instal aplikasi atau daftar akun. Langsung cobain lewat web.",
    steps: [
      {
        icon: "Camera",
        title: "Foto / Upload Struk",
        description: "Tinggal cekrek struk makan-makan lo. Gak usah repot ketik ulang menu satu-satu.",
        image: {
          url: "/img/step-scan.jpg",
          alt: "Struk restoran sedang discan AI di layar SplitBill untuk membaca item dan harga",
        },
        tone: "primary",
      },
      {
        icon: "UserPlus",
        title: "Pilih Teman & Menu",
        description: "Assign siapa aja yang makan menu apa. Biar AI yang kalkulasiin pembagian pajaknya.",
        image: {
          url: "/img/step-add-friend.jpg",
          alt: "Layar tambah teman di SplitBill dengan daftar teman yang ikut patungan",
        },
        tone: "amber",
      },
      {
        icon: "Send",
        title: "Share Link Tagihan",
        description: "Kirim link rincian tagihan ke WhatsApp grup. Temen lo tinggal bayar via e-wallet/bank.",
        image: {
          url: "/img/step-share.jpg",
          alt: "Ringkasan tagihan split bill per orang yang dibagikan ke WhatsApp",
        },
        tone: "green",
      },
    ],
  },
  features: {
    title: "Semua yang lo butuhin buat",
    titleHighlight: "split bill tanpa drama",
    subtitle: "Bagi tagihan **sat set**, hitung patungan **anti ribet & akurat**. Link pembayaran langsung spill!",
    items: [
      {
        imageUrl: "/img/menu-split-bill.png",
        image: {
          url: "/img/cara-pakai/split-bill/2.png",
          alt: "Layar SplitBill saat AI membaca foto struk restoran",
        },
        tone: "blue",
        title: "Split Bill",
        description: "Foto struk biar AI hitung otomatis (Scan AI) atau bagi rincian secara manual. Sat-set!",
        badge: "Populer",
        href: "/split-bill",
        ctaLabel: "Coba Split Bill",
        guideHref: "/split-bill/cara-pakai",
        requiresLogin: false,
      },
      {
        imageUrl: "/img/menu-split-later.png",
        image: {
          url: "/img/cara-pakai/split-later/1.png",
          alt: "Layar Split Later untuk memilih kategori acara seperti liburan atau nongkrong",
        },
        tone: "violet",
        title: "Split Later",
        description: "Nongkrong sepuasnya, kumpulin struknya, bagi tagihannya nanti pas santai.",
        badge: "Baru",
        href: "/split-later",
        ctaLabel: "Coba Split Later",
        guideHref: "/split-later/cara-pakai",
        requiresLogin: true,
      },
      {
        imageUrl: "/img/menu-shared-goal.png",
        image: {
          url: "/img/cara-pakai/shared-goals/1.png",
          alt: "Form membuat Shared Goal dengan nama, target nominal, dan anggota",
        },
        tone: "emerald",
        title: "Shared Goals",
        description: "Nabung bareng squad buat rencana liburan, kado nikahan teman, atau impian bersama.",
        badge: "",
        href: "/shared-goals",
        ctaLabel: "Mulai Nabung",
        guideHref: "/shared-goals/cara-pakai",
        requiresLogin: false,
      },
      {
        imageUrl: "/img/menu-collect-money.png",
        image: { url: "/img/menu-collect-money.png", alt: "Ilustrasi tangan menerima koin patungan" },
        tone: "amber",
        title: "Collect Money (Patungan)",
        description: "Bikin link patungan uang kas, sewa lapangan futsal, atau donasi secara transparan.",
        badge: "",
        href: "/collect-money",
        ctaLabel: "Bikin Patungan",
        guideHref: "",
        requiresLogin: false,
      },
      {
        imageUrl: "/img/menu-invoice.png",
        image: { url: "/img/menu-invoice.png", alt: "Ilustrasi invoice digital dan pena" },
        tone: "rose",
        title: "Invoice",
        description: "Kirim rincian tagihan digital yang rapi, transparan, langsung ke WhatsApp.",
        badge: "",
        href: "/invoice",
        ctaLabel: "Buat Invoice",
        guideHref: "",
        requiresLogin: false,
      },
      {
        imageUrl: "/img/menu-wallet.png",
        image: { url: "/img/menu-wallet.png", alt: "Ilustrasi dompet berisi kartu" },
        tone: "purple",
        title: "Wallet",
        description: "Kelola dana masuk dari teman, pantau saldo patungan squad, dan catat pengeluaran grup.",
        badge: "",
        href: "/wallet",
        ctaLabel: "Simpan Wallet",
        guideHref: "",
        requiresLogin: false,
      },
    ],
  },
  featureShowcase: {
    title: "Satu aplikasi buat",
    titleHighlight: "semua urusan patungan",
    subtitle: "Dari bagi tagihan makan sampai nabung bareng, semua ada di SplitBill.",
  },
  useCases: {
    eyebrow: "🍜 Nongkrong · 🏠 Kos · ✈️ Liburan",
    title: "Split bill buat",
    titleHighlight: "semua momen patungan",
    subtitle:
      "Dari nongkrong, patungan kos, sampai liburan, **semua bisa di-split tanpa canggung**. Langsung dari browser, **tanpa install aplikasi**!",
    cards: [
      {
        imageUrl: "/img/cara-pakai/split-bill/ai-scan-struk.png",
        tone: "blue",
        feature: "AI Scan",
        title: "Makan di restoran",
        body: "Foto struknya, AI Scan baca item dan harga, lalu kamu tinggal pilih siapa makan apa. Yang pesan steak gak perlu dibayarin sama yang cuma pesan es teh, semua bayar sesuai pesanannya sendiri.",
        href: "/split-bill",
        ctaLabel: "Coba Split Bill",
      },
      {
        imageUrl: "/img/cara-pakai/split-bill/settlement.png",
        tone: "emerald",
        feature: "Collect Money",
        title: "Patungan kos dan tagihan bulanan",
        body: "Listrik, wifi, galon, sampai iuran kebersihan bisa dibagi rata ke semua penghuni dalam hitungan detik. Pakai Collect Money buat nandain siapa yang udah transfer, biar gak ada yang lupa bayar.",
        href: "/collect-money",
        ctaLabel: "Coba Collect Money",
      },
      {
        imageUrl: "/img/cara-pakai/split-later/quick-capture.png",
        tone: "amber",
        feature: "Split Later",
        title: "Liburan bareng",
        body: "Struk numpuk selama trip? Kumpulin dulu pakai Split Later, hitungnya belakangan pas udah pulang. Settlement dari semua struk digabung jadi satu, jadi transfernya cukup sekali per orang.",
        href: "/split-bill-liburan",
        ctaLabel: "Lihat Split Bill Liburan",
      },
    ],
  },
  comparison: {
    title: "Kenapa Harus Pakai",
    titleHighlight: "SplitBill?",
    subtitle: "Udah gak zaman ribet bagi tagihan. Liat bedanya kehidupan lo sebelum vs sesudah pakai SplitBill.",
    before: {
      emoji: "😩",
      title: "Sebelum pake SplitBill",
      points: [
        "Pusing hitung manual pake kalkulator HP pas kasir udah nungguin",
        "Bingung bagi nominal pajak, service charge, sama diskon persenan",
        "Sungkan atau canggung buat nagih temen yang belum bayar",
        "Salah transfer gara-gara gak ada rincian rekening/e-wallet",
        "Catatan patungan hilang karena nyampur di chat WhatsApp",
      ],
    },
    after: {
      emoji: "😎",
      title: "Setelah pake SplitBill",
      badge: "Solusi Terbaik ✨",
      points: [
        "Cukup foto struk belanjaan, AI kelar hitung dalam 5 detik!",
        "Pajak & service charge otomatis kebagi presisi per item menu",
        "Link tagihan transparan dikirim ke grup, otomatis pada sadar diri",
        "Info rekening & e-wallet langsung tertera, tinggal salin & transfer",
        "History patungan tersimpan aman, rapi, dan mudah diakses kapan aja",
      ],
    },
  },
  testimonials: {
    // Rendered as one plain-white title on the blue section, so no highlight
    title: "Kata Mereka yang Udah Bebas Drama",
    titleHighlight: "",
    subtitle: "Udah ribuan circle nongkrong terbantu dengan SplitBill. Cek review jujur dari mereka!",
  },
  blog: {
    title: "Tips Nongkrong &",
    titleHighlight: "Split Bill",
    subtitle: "Inspirasi patungan biar circle nongkrong lo tetap harmonis tanpa drama tagihan.",
  },
  faq: {
    title: "Paling Sering",
    titleHighlight: "Ditanyain",
    subtitle: "Punya pertanyaan lain? Tenang, semuanya sudah kami rangkum di sini.",
  },
  promoSlider: {
    showAiScanCard: true,
    slides: [
      {
        title: "Bayar Dulu, Bagi Kemudian dengan Split Later! 🕒",
        imageUrl: "/img/menu-split-later.png",
        href: "/split-later",
        ctaLabel: "Coba Split Later",
        badge: "NEW",
        badgeIcon: "",
        tone: "primary",
      },
      {
        title: "Kasih Review Pertama & Dapetin Rewards Spesial! 🎁",
        imageUrl: "/img/icon-rewards.jpg",
        href: "/review",
        ctaLabel: "Tulis Review Sekarang",
        badge: "REWARDS",
        badgeIcon: "Sparkles",
        tone: "amber",
      },
    ],
  },
  promoBanner: {
    titleText: "Fokus healing dulu,",
    titleHighlight: "split bill belakangan!",
    description: "Tinggal catat pengeluaran, bagi rata pas udah santai. Anti ribet!",
    ctaLabel: "Coba Sekarang",
    href: "/split-bill-liburan",
    image: { url: "/img/promoBanner-split-later.jpg", alt: "SplitBill Promo Banner" },
    tone: "blue",
  },
  seoContent: {
    title: "",
    titleHighlight: "",
    body: "",
  },
  layout: {
    sections: LAYOUT_SECTIONS.map((key) => ({ key, visible: !HIDDEN_BY_DEFAULT_SECTIONS.includes(key) })),
  },
  ctaBanner: {
    title: "Mulai Split Bill",
    titleHighlight: "Sat-Set & No Drama",
    titleSuffix: "Sekarang!",
    description:
      "Nongkrong seru tanpa drama bayar-bayar. AI scan struk siap bantu hitungin semua pengeluaran geng lo.",
    primaryCta: { label: "Coba Gratis Sekarang", href: "/split-bill", icon: "Camera" },
    secondaryCta: { label: "Buat Akun Baru", href: "/register" },
    footnote: "Gak perlu kartu kredit · Langsung pakai · Gak wajib bikin akun",
    cards: [
      {
        title: "Privacy First",
        desc: "Data kamu tersimpan aman di server kami, bisa diakses kapan saja dari perangkat mana saja.",
        imageUrl: "/img/icon-privacy.png",
        tone: "emerald",
      },
      {
        title: "No Login Required",
        desc: "Bisa langsung pakai tanpa ribet daftar. Cocok buat yang mau sat-set!",
        imageUrl: "/img/icon-no-login.png",
        tone: "blue",
      },
      {
        title: "AI Powered",
        desc: "Gak perlu ngetik manual satu-satu, cukup jepret & biar AI yang hitung.",
        imageUrl: "/img/icon-ai-powered.png",
        tone: "purple",
      },
    ],
  },
};

// ── Field validators ────────────────────────────────────────────────────────
// Each takes the raw value plus a human-readable path for error messages, and
// returns the cleaned value. Unknown keys in the input are dropped because the
// output objects are built field by field.

// Site-relative path. Browsers treat "\" as "/" in http(s) URLs, so "/\evil.com"
// would resolve like the protocol-relative "//evil.com": no backslashes at all.
function isInternalPath(value) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

// Internal path, in-page anchor, or https URL. Rejects javascript:, data:,
// protocol-relative and other schemes so a typo can't ship a broken or unsafe link.
function href(value, path, { required = true } = {}) {
  const cleaned = text(value, path, { required, max: 300 });
  if (!cleaned) return cleaned;
  const isInternal = isInternalPath(cleaned);
  const isAnchor = /^#[A-Za-z][\w-]*$/.test(cleaned);
  const isHttps = /^https:\/\/[^\s/]+\.[^\s]+$/.test(cleaned);
  if (!isInternal && !isAnchor && !isHttps) {
    throw new HttpError(400, `${path} harus diawali "/", "#" atau "https://"`);
  }
  if (/\s/.test(cleaned)) {
    throw new HttpError(400, `${path} tidak boleh mengandung spasi`);
  }
  return cleaned;
}

// Hosts splitbill-web's next/image may load (its next.config.ts remotePatterns).
// Any other https host makes next/image throw at render time, which would take
// the homepage down right after a "live" save. Keep the two lists in sync.
const LANDING_IMAGE_HOSTS = [
  "api.dicebear.com",
  "splitbill.my.id",
  "www.splitbill.my.id",
  "splitbillonline.netlify.app",
  "splitbillbe.netlify.app",
  "*.public.blob.vercel-storage.com",
];

function isAllowedImageHost(hostname) {
  return LANDING_IMAGE_HOSTS.some((pattern) =>
    pattern.startsWith("*.") ? hostname.endsWith(pattern.slice(1)) : hostname === pattern,
  );
}

function imageUrl(value, path) {
  const cleaned = text(value, path, { required: true, max: 500 });
  if (isInternalPath(cleaned)) return cleaned;
  let url = null;
  try {
    url = /^https:\/\/[^\s]+$/.test(cleaned) ? new URL(cleaned) : null;
  } catch {
    url = null;
  }
  if (!url) {
    throw new HttpError(400, `${path} harus diawali "/" atau "https://"`);
  }
  if (!isAllowedImageHost(url.hostname)) {
    throw new HttpError(400, `${path}: host "${url.hostname}" tidak diizinkan. Upload gambarnya, atau pakai ${LANDING_IMAGE_HOSTS.join(", ")}`);
  }
  return cleaned;
}

function dimension(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 10000 ? n : null;
}

function image(value, path, { withSize = false } = {}) {
  const v = value || {};
  const out = {
    url: imageUrl(v.url, `${path} URL`),
    // Alt text is required: it is what Google Images and screen readers see.
    alt: text(v.alt, `${path} alt text`, { required: true, max: 200 }),
  };
  if (withSize) {
    out.width = dimension(v.width);
    out.height = dimension(v.height);
  }
  return out;
}

function icon(value, path) {
  if (!LANDING_ICONS.includes(value)) {
    throw new HttpError(400, `${path} tidak dikenal: "${value}"`);
  }
  return value;
}

function tone(value, path) {
  if (!LANDING_TONES.includes(value)) {
    throw new HttpError(400, `${path} tidak dikenal: "${value}"`);
  }
  return value;
}

function list(value, path, { min, max }) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${path} harus berupa list`);
  }
  if (value.length < min || value.length > max) {
    const range = min === max ? `${min}` : `${min}-${max}`;
    throw new HttpError(400, `${path} harus berisi ${range} item`);
  }
  return value;
}

function cta(value, path, { withIcon }) {
  const v = value || {};
  const out = {
    label: text(v.label, `${path} label`, { required: true, max: 30 }),
    href: href(v.href, `${path} link`),
  };
  if (withIcon) out.icon = icon(v.icon, `${path} icon`);
  return out;
}

// ── Section normalizers ─────────────────────────────────────────────────────

function normalizeSeo(v = {}) {
  const sameAs = list(v.sameAs || [], "Profil sosial", { min: 0, max: MAX_SAME_AS }).map((url, i) => {
    const cleaned = text(url, `Profil sosial ${i + 1}`, { required: true, max: 200 });
    if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(cleaned)) {
      throw new HttpError(400, `Profil sosial ${i + 1} harus URL lengkap diawali "https://"`);
    }
    return cleaned;
  });
  return {
    // Google truncates titles around 60 chars and descriptions around 160.
    title: text(v.title, "SEO title", { required: true, max: 70 }),
    description: text(v.description, "SEO description", { required: true, max: 170 }),
    // Empty = reuse title/description in share previews
    socialTitle: text(v.socialTitle, "Social title", { max: 90 }),
    socialDescription: text(v.socialDescription, "Social description", { max: 200 }),
    ogImage: image(v.ogImage, "OG image", { withSize: true }),
    sameAs: [...new Set(sameAs)],
  };
}

// Markdown-lite body: blank-line paragraphs, "## " subheadings, "- " bullets,
// **bold** and [text](link). Links follow the same rules as CTA links so the
// article can't ship a broken or unsafe one.
function normalizeSeoContent(v = {}) {
  const body = text(v.body, "Konten SEO isi", { max: SEO_CONTENT_MAX });
  // Check both a loose pattern and splitbill-web's exact renderer pattern
  // (SeoContentSection INLINE_PATTERN), so nothing the web turns into a link
  // can slip past validation if the two ever tokenize differently.
  for (const pattern of [/\[([^\]]*)\]\(([^)]*)\)/g, /\[([^\]]+)\]\(([^)\s]+)\)/g]) {
    for (const [, label, target] of body.matchAll(pattern)) {
      href(target, `Konten SEO link "${label}"`);
    }
  }
  return {
    title: text(v.title, "Konten SEO title", { max: 80 }),
    titleHighlight: text(v.titleHighlight, "Konten SEO highlight", { max: 40 }),
    body,
  };
}

function normalizeHero(v = {}) {
  return {
    eyebrow: {
      text: text(v.eyebrow?.text, "Hero eyebrow", { max: 50 }),
      badge: text(v.eyebrow?.badge, "Hero eyebrow badge", { max: 10 }),
    },
    // The H1 — the page's main keyword target, so never empty.
    title: text(v.title, "Hero title", { required: true, max: 100 }),
    titleHighlight: text(v.titleHighlight, "Hero title highlight", { max: 40 }),
    description: text(v.description, "Hero description", { required: true, max: 240 }),
    primaryCta: cta(v.primaryCta, "Hero primary CTA", { withIcon: true }),
    secondaryCta: cta(v.secondaryCta, "Hero secondary CTA", { withIcon: false }),
    trustItems: list(v.trustItems, "Hero trust items", { min: 0, max: MAX_TRUST_ITEMS }).map(
      (item, i) => ({
        icon: icon(item?.icon, `Hero trust item ${i + 1} icon`),
        text: text(item?.text, `Hero trust item ${i + 1} text`, { required: true, max: 30 }),
        tone: tone(item?.tone, `Hero trust item ${i + 1} warna`),
      }),
    ),
    image: image(v.image, "Hero image", { withSize: true }),
    imageMobile: heroMobileImage(v.imageMobile, v.image),
  };
}

// Optional — an empty URL clears it. Shares the desktop image's alt text since
// it shows the same thing, just cropped/composed for a narrow screen.
function heroMobileImage(value, desktop) {
  // Type-check before treating an empty URL as "cleared", so {url: 123} is a 400
  const url = text(value?.url, "Hero image mobile URL", { max: 500 });
  if (!url) return null;
  return image({ ...value, alt: desktop?.alt }, "Hero image mobile", { withSize: true });
}

function normalizeSocialProof(v = {}) {
  return {
    items: list(v.items, "Social proof items", { min: SOCIAL_PROOF_COUNT, max: SOCIAL_PROOF_COUNT }).map(
      (item, i) => ({
        icon: icon(item?.icon, `Social proof ${i + 1} icon`),
        title: text(item?.title, `Social proof ${i + 1} title`, { required: true, max: 30 }),
        desc: text(item?.desc, `Social proof ${i + 1} deskripsi`, { max: 60 }),
        tone: tone(item?.tone, `Social proof ${i + 1} warna`),
      }),
    ),
  };
}

function normalizeHowItWorks(v = {}) {
  return {
    title: text(v.title, "Cara pakai title", { required: true, max: 60 }),
    titleHighlight: text(v.titleHighlight, "Cara pakai title highlight", { max: 40 }),
    subtitle: text(v.subtitle, "Cara pakai subtitle", { max: 160 }),
    steps: list(v.steps, "Cara pakai steps", { min: STEP_COUNT, max: STEP_COUNT }).map((step, i) => ({
      icon: icon(step?.icon, `Step ${i + 1} icon`),
      title: text(step?.title, `Step ${i + 1} title`, { required: true, max: 40 }),
      description: text(step?.description, `Step ${i + 1} deskripsi`, { required: true, max: 160 }),
      image: image(step?.image, `Step ${i + 1} image`),
      tone: tone(step?.tone, `Step ${i + 1} warna`),
    })),
  };
}

// Title + gradient highlight + subtitle, shared by most section headers.
// Subtitles may mark **phrases** that render as bold primary-colored text.
function header(v, name, { subtitleMax = 200 } = {}) {
  return {
    title: text(v?.title, `${name} title`, { required: true, max: 60 }),
    titleHighlight: text(v?.titleHighlight, `${name} title highlight`, { max: 40 }),
    subtitle: text(v?.subtitle, `${name} subtitle`, { max: subtitleMax }),
  };
}

function bool(value) {
  return value === true;
}

function normalizeFeatures(v = {}) {
  const items = list(v.items, "Fitur items", { min: MIN_FEATURES, max: MAX_FEATURES }).map((item, i) => ({
      imageUrl: imageUrl(item?.imageUrl, `Fitur ${i + 1} icon image`),
      image: image(item?.image, `Fitur ${i + 1} gambar showcase`),
      tone: tone(item?.tone, `Fitur ${i + 1} warna`),
      title: text(item?.title, `Fitur ${i + 1} title`, { required: true, max: 40 }),
      description: text(item?.description, `Fitur ${i + 1} deskripsi`, { required: true, max: 220 }),
      badge: text(item?.badge, `Fitur ${i + 1} badge`, { max: 15 }),
      href: href(item?.href, `Fitur ${i + 1} link`),
      ctaLabel: text(item?.ctaLabel, `Fitur ${i + 1} CTA label`, { required: true, max: 30 }),
      guideHref: href(item?.guideHref, `Fitur ${i + 1} link cara pakai`, { required: false }),
      requiresLogin: bool(item?.requiresLogin),
      // Cards saved before this flag existed stay visible
      isActive: item?.isActive !== false,
    }));
  // The showcase needs at least two cards to scroll between
  if (items.filter((item) => item.isActive).length < MIN_FEATURES) {
    throw new HttpError(400, `Minimal ${MIN_FEATURES} kartu fitur harus aktif`);
  }
  return { ...header(v, "Fitur"), items };
}

// The showcase renders features.items; it only owns its header.
function normalizeFeatureShowcase(v = {}) {
  return header(v, "Fitur showcase");
}

/**
 * Content saved before the showcase shared features.items kept its own
 * featureShowcase.items. Give each feature lacking a showcase image the
 * image/tone of the legacy showcase card (or default feature) with the same
 * href, else its icon, and drop the legacy list.
 */
export function withFeatureShowcaseImages(content) {
  const features = content?.features;
  if (!Array.isArray(features?.items)) return content;
  const legacy = Array.isArray(content.featureShowcase?.items) ? content.featureShowcase.items : [];
  const byHref = (list, href) => list.find((item) => item?.href && item.href === href);
  const items = features.items.map((item) => {
    if (item?.image?.url) return item;
    const source = byHref(legacy, item?.href) || byHref(DEFAULT_LANDING_CONTENT.features.items, item?.href);
    return {
      ...item,
      image: source?.image || { url: item?.imageUrl || "", alt: item?.title || "" },
      tone: item?.tone || source?.tone || "blue",
    };
  });
  const { items: _legacy, ...showcaseHeader } = content.featureShowcase || DEFAULT_LANDING_CONTENT.featureShowcase;
  return { ...content, features: { ...features, items }, featureShowcase: showcaseHeader };
}

function normalizeUseCases(v = {}) {
  return {
    eyebrow: text(v.eyebrow, "Use case eyebrow", { max: 60 }),
    ...header(v, "Use case", { subtitleMax: 240 }),
    cards: list(v.cards, "Use case cards", { min: USE_CASE_COUNT, max: USE_CASE_COUNT }).map((card, i) => ({
      imageUrl: imageUrl(card?.imageUrl, `Use case ${i + 1} image`),
      tone: tone(card?.tone, `Use case ${i + 1} warna`),
      feature: text(card?.feature, `Use case ${i + 1} label fitur`, { max: 25 }),
      title: text(card?.title, `Use case ${i + 1} title`, { required: true, max: 50 }),
      body: text(card?.body, `Use case ${i + 1} isi`, { required: true, max: 300 }),
      href: href(card?.href, `Use case ${i + 1} link`),
      ctaLabel: text(card?.ctaLabel, `Use case ${i + 1} CTA label`, { required: true, max: 30 }),
    })),
  };
}

function comparisonSide(v, name, { withBadge }) {
  return {
    emoji: text(v?.emoji, `${name} emoji`, { max: 8 }),
    title: text(v?.title, `${name} title`, { required: true, max: 40 }),
    ...(withBadge && { badge: text(v?.badge, `${name} badge`, { max: 25 }) }),
    points: list(v?.points, `${name} poin`, { min: MIN_COMPARISON_POINTS, max: MAX_COMPARISON_POINTS }).map(
      (point, i) => text(point, `${name} poin ${i + 1}`, { required: true, max: 120 }),
    ),
  };
}

function normalizeComparison(v = {}) {
  return {
    ...header(v, "Perbandingan"),
    before: comparisonSide(v.before, "Kolom sebelum", { withBadge: false }),
    after: comparisonSide(v.after, "Kolom sesudah", { withBadge: true }),
  };
}

function normalizePromoSlider(v = {}) {
  return {
    showAiScanCard: bool(v.showAiScanCard),
    slides: list(v.slides, "Promo slides", { min: 0, max: MAX_PROMO_SLIDES }).map((slide, i) => ({
      title: text(slide?.title, `Promo ${i + 1} title`, { required: true, max: 80 }),
      imageUrl: imageUrl(slide?.imageUrl, `Promo ${i + 1} icon image`),
      href: href(slide?.href, `Promo ${i + 1} link`),
      ctaLabel: text(slide?.ctaLabel, `Promo ${i + 1} CTA label`, { required: true, max: 30 }),
      badge: text(slide?.badge, `Promo ${i + 1} badge`, { max: 15 }),
      // Empty = pulsing dot instead of an icon
      badgeIcon: slide?.badgeIcon ? icon(slide.badgeIcon, `Promo ${i + 1} badge icon`) : "",
      tone: tone(slide?.tone, `Promo ${i + 1} warna`),
    })),
  };
}

function normalizePromoBanner(v = {}) {
  return {
    titleText: text(v.titleText, "Promo banner title", { required: true, max: 40 }),
    titleHighlight: text(v.titleHighlight, "Promo banner highlight", { max: 40 }),
    description: text(v.description, "Promo banner deskripsi", { max: 100 }),
    ctaLabel: text(v.ctaLabel, "Promo banner CTA label", { required: true, max: 25 }),
    href: href(v.href, "Promo banner link"),
    image: image(v.image, "Promo banner image"),
    tone: tone(v.tone, "Promo banner warna"),
  };
}

function normalizeLayout(v = {}) {
  const sections = list(v.sections, "Layout sections", { min: LAYOUT_SECTIONS.length, max: LAYOUT_SECTIONS.length });
  const keys = sections.map((section) => section?.key);
  if (new Set(keys).size !== keys.length || !LAYOUT_SECTIONS.every((key) => keys.includes(key))) {
    throw new HttpError(400, "Layout harus berisi setiap section tepat satu kali");
  }
  return {
    sections: sections.map(({ key, visible }) => {
      // Same boolean for the guard and the stored value: a truthy non-boolean
      // (e.g. "false") must not pass the guard and then be stored as hidden
      const isVisible = visible === true;
      if (!isVisible && ALWAYS_VISIBLE_SECTIONS.includes(key)) {
        throw new HttpError(400, `Section "${key}" tidak bisa disembunyikan karena dipakai link navbar`);
      }
      return { key, visible: isVisible };
    }),
  };
}

// Every "#anchor" link in the content must land on a section that exists and
// is visible, otherwise the CTA silently does nothing.
function assertAnchorsResolve(content) {
  const visible = new Set(content.layout.sections.filter((s) => s.visible).map((s) => s.key));
  const check = (value, path) => {
    const section = ANCHOR_SECTIONS[value.slice(1)];
    if (!section) {
      throw new HttpError(400, `Link "${value}" (${path}) tidak mengarah ke section mana pun. Pakai: ${Object.keys(ANCHOR_SECTIONS).map((a) => `#${a}`).join(", ")}`);
    }
    if (!visible.has(section)) {
      throw new HttpError(400, `Link "${value}" (${path}) mengarah ke section yang disembunyikan`);
    }
  };
  for (const [, , target] of content.seoContent.body.matchAll(/\[([^\]]*)\]\((#[^)]*)\)/g)) {
    check(target, "seoContent › body");
  }
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${path} ${i + 1}`));
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === "href" || key === "guideHref") && typeof value === "string" && value.startsWith("#")) {
        check(value, path);
      } else {
        walk(value, path ? `${path} › ${key}` : key);
      }
    }
  };
  walk(content, "");
}

function normalizeCtaBanner(v = {}) {
  return {
    title: text(v.title, "CTA banner title", { required: true, max: 60 }),
    titleHighlight: text(v.titleHighlight, "CTA banner title highlight", { max: 40 }),
    titleSuffix: text(v.titleSuffix, "CTA banner title suffix", { max: 30 }),
    description: text(v.description, "CTA banner deskripsi", { max: 200 }),
    primaryCta: cta(v.primaryCta, "CTA banner primary CTA", { withIcon: true }),
    secondaryCta: cta(v.secondaryCta, "CTA banner secondary CTA", { withIcon: false }),
    footnote: text(v.footnote, "CTA banner footnote", { max: 100 }),
    cards: list(v.cards, "CTA banner cards", { min: CTA_CARD_COUNT, max: CTA_CARD_COUNT }).map((card, i) => ({
      title: text(card?.title, `CTA card ${i + 1} title`, { required: true, max: 40 }),
      desc: text(card?.desc, `CTA card ${i + 1} deskripsi`, { required: true, max: 140 }),
      imageUrl: imageUrl(card?.imageUrl, `CTA card ${i + 1} icon image`),
      tone: tone(card?.tone, `CTA card ${i + 1} warna`),
    })),
  };
}

/**
 * Validates an admin-submitted landing content payload and returns a clean
 * copy containing only known fields. Throws HttpError(400) with a message
 * naming the offending field.
 */
export function normalizeLandingContent(input) {
  if (!input || typeof input !== "object") {
    throw new HttpError(400, "Konten landing page tidak valid");
  }
  // null sections fall back to the normalizers' `= {}` defaults (and fail
  // their required-field checks with a 400) instead of crashing on null.x
  input = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value ?? undefined]));
  // Only legacy payloads (still carrying featureShowcase.items) get images
  // filled in. Otherwise a cleared showcase image must fail the required
  // check, not be silently replaced by a default.
  if (Array.isArray(input.featureShowcase?.items)) {
    input = withFeatureShowcaseImages(input);
  }
  const content = {
    seo: normalizeSeo(input.seo),
    hero: normalizeHero(input.hero),
    socialProof: normalizeSocialProof(input.socialProof),
    howItWorks: normalizeHowItWorks(input.howItWorks),
    features: normalizeFeatures(input.features),
    featureShowcase: normalizeFeatureShowcase(input.featureShowcase),
    useCases: normalizeUseCases(input.useCases),
    comparison: normalizeComparison(input.comparison),
    testimonials: header(input.testimonials, "Testimoni"),
    blog: header(input.blog, "Blog"),
    faq: header(input.faq, "FAQ"),
    promoSlider: normalizePromoSlider(input.promoSlider),
    promoBanner: normalizePromoBanner(input.promoBanner),
    seoContent: normalizeSeoContent(input.seoContent),
    layout: normalizeLayout(input.layout),
    ctaBanner: normalizeCtaBanner(input.ctaBanner),
  };
  const seoContentVisible = content.layout.sections.some((s) => s.key === "seoContent" && s.visible);
  if (seoContentVisible && (!content.seoContent.title || !content.seoContent.body)) {
    throw new HttpError(400, "Konten SEO ditampilkan di Layout tapi title atau isinya masih kosong");
  }
  assertAnchorsResolve(content);
  return content;
}
