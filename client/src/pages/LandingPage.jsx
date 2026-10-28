import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Save,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { compressImage } from "../lib/imageUtils";
import {
  LANDING_ICON_MAP,
  LANDING_TONES,
  resolvePreviewUrl,
} from "../lib/landingOptions";
import { Card, CardBody, Button, useToast } from "../components/ui";
import PhonePreview from "../components/PhonePreview";

const WEB_URL = import.meta.env.VITE_PUBLIC_APP_URL || "https://www.splitbill.my.id";
// splitbill-web page that renders the real homepage components from unsaved
// content. In `vite dev` it defaults to the local web (next dev on :3000), since
// changes to the preview usually land there before production.
const PREVIEW_URL =
  import.meta.env.VITE_LANDING_PREVIEW_URL ||
  (import.meta.env.DEV ? "http://localhost:3000/preview/landing" : `${WEB_URL}/preview/landing`);
const MAX_TRUST_ITEMS = 3;
// Files above this are re-encoded in the browser first so the base64 body
// stays under the API's 4MB image limit.
const COMPRESS_ABOVE_BYTES = 2.5 * 1024 * 1024;
// Server limit for an upload (validateBase64ImageSize, MAX_IMAGE_SIZE_MB)
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Visible characters (graphemes), the same count the server's length limits use
const graphemes = new Intl.Segmenter("id", { granularity: "grapheme" });
const charCount = (value) => [...graphemes.segment(value || "")].length;

// In page order. `sections` lists the content keys a tab edits (defaults to
// [key]); `focus` is the section the phone preview scrolls to.
const TABS = [
  { key: "layout", label: "Layout", focus: "hero" },
  { key: "hero", label: "Hero" },
  { key: "socialProof", label: "Social Proof" },
  { key: "promo", label: "Promo", sections: ["promoSlider", "promoBanner"], focus: "promoSlider" },
  { key: "features", label: "Fitur", sections: ["featureShowcase", "features"], focus: "featureShowcase" },
  { key: "useCases", label: "Use Cases" },
  { key: "howItWorks", label: "Cara Pakai" },
  { key: "comparison", label: "Perbandingan" },
  { key: "headers", label: "Header Lain", sections: ["testimonials", "blog", "faq"], focus: "testimonials" },
  { key: "ctaBanner", label: "CTA Banner" },
  { key: "seoContent", label: "Konten SEO" },
  { key: "seo", label: "SEO", focus: "hero" },
];
const MIN_FEATURES = 2;
const MAX_FEATURES = 9;
const MIN_COMPARISON_POINTS = 2;
const MAX_COMPARISON_POINTS = 8;
const MAX_PROMO_SLIDES = 6;
const MAX_SAME_AS = 8;

// Mirrors LAYOUT_SECTIONS / ALWAYS_VISIBLE_SECTIONS in lib/landingPage.js.
const SECTION_LABELS = {
  socialProof: "Social Proof",
  promoSlider: "Promo Slider",
  featureShowcase: "Fitur Showcase (kartu scroll)",
  features: "Fitur",
  useCases: "Use Cases",
  howItWorks: "Cara Pakai",
  promoBanner: "Promo Banner",
  marketingBanner: "Marketing Banner (menu Banners)",
  comparison: "Perbandingan",
  testimonials: "Testimoni",
  blog: "Blog",
  seoContent: "Konten SEO (artikel)",
  faq: "FAQ",
  ctaBanner: "CTA Banner",
};
const ALWAYS_VISIBLE_SECTIONS = ["featureShowcase", "howItWorks", "testimonials"];

const tabSections = (tab) => tab.sections || [tab.key];

const inputClass =
  "block w-full px-3 py-2 text-sm rounded-xs border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all";
const labelClass = "block text-sm font-medium text-foreground mb-1";

// Immutable set by path, e.g. setIn(obj, ["hero", "trustItems", 0, "text"], "x")
function setIn(obj, [key, ...rest], value) {
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[key] = rest.length ? setIn(obj[key], rest, value) : value;
  return copy;
}

// Returns a copy of `list` with item `index` moved one step up (-1) or down (+1).
function move(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Field components ────────────────────────────────────────────────────────

function Field({ label, hint, required, max, value, onChange, multiline, placeholder, rows = 3 }) {
  const length = charCount(value);
  const Tag = multiline ? "textarea" : "input";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className={labelClass}>
          {label} {required && <span className="text-destructive">*</span>}
          {hint && <span className="text-xs text-muted-foreground font-normal ml-1">— {hint}</span>}
        </label>
        {max && (
          <span className={`text-[11px] tabular-nums ${length > max ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
            {length}/{max}
          </span>
        )}
      </div>
      <Tag
        type={multiline ? undefined : "text"}
        rows={multiline ? rows : undefined}
        className={`${inputClass} ${multiline ? "resize-y" : ""}`}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function IconPicker({ label = "Icon", value, onChange }) {
  const [open, setOpen] = useState(false);
  const Current = LANDING_ICON_MAP[value];
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex items-center gap-2">
          {Current && <Current className="h-4 w-4 text-primary" />}
          <span>{value || "Pilih icon"}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-6 sm:grid-cols-8 gap-1 p-2 rounded-xs border border-border bg-white">
          {Object.keys(LANDING_ICON_MAP).map((name) => {
            const Icon = LANDING_ICON_MAP[name];
            return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={`aspect-square flex items-center justify-center rounded-xs transition-colors ${
                name === value ? "bg-primary text-white" : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TonePicker({ label = "Warna", value, onChange }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {LANDING_TONES.map((tone) => (
          <button
            key={tone.value}
            type="button"
            title={tone.label}
            onClick={() => onChange(tone.value)}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              tone.value === value ? "border-foreground scale-110" : "border-white shadow-sm"
            }`}
            style={{ background: tone.color }}
          />
        ))}
      </div>
    </div>
  );
}

// Number of image uploads in flight. List items are keyed by index, so moving
// or removing one mid-upload would land the uploaded image on another item:
// ItemCard disables those buttons while this is non-zero.
const UploadContext = createContext({ uploading: 0, track: () => {} });

function ImageField({ label, hint, value, onChange, withAlt = true, required = true, variant }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { track } = useContext(UploadContext);
  const image = value || {};
  // The upload resolves seconds later: merge into the latest value (e.g. alt
  // text typed meanwhile), not the one captured when the file was picked
  const latest = useRef({ image, onChange });
  latest.current = { image, onChange };

  const handleFile = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ message: "Format harus JPG, PNG, atau WebP", type: "warning" });
      return;
    }
    setUploading(true);
    track(1);
    try {
      const dataUrl =
        // WebP for transparent images: lossless PNG output can stay over the limit
        file.size > COMPRESS_ABOVE_BYTES ? await compressImage(file, 2000, 0.85, "image/webp") : await readAsDataUrl(file);
      const [, mimeType, base64Image] = dataUrl.match(/^data:([^;]+);base64,(.*)$/) || [];
      const sizeBytes = ((base64Image || "").length * 3) / 4;
      if (sizeBytes > MAX_UPLOAD_BYTES) {
        toast({
          message: `Gambar masih ${(sizeBytes / 1024 / 1024).toFixed(1)}MB setelah dikompres (maks 4MB). Perkecil resolusinya dulu.`,
          type: "warning",
        });
        return;
      }
      const res = await apiFetch("/api/landing-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime_type: mimeType, base64Image, variant }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ message: data.error || "Upload gagal", type: "error" });
        return;
      }
      latest.current.onChange({ ...latest.current.image, url: data.data.url, width: data.data.width, height: data.data.height });
      toast({ message: "Gambar terupload. Klik Simpan untuk menayangkan.", type: "success" });
    } catch {
      toast({ message: "Upload gagal. Coba lagi.", type: "error" });
    } finally {
      setUploading(false);
      track(-1);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className={labelClass}>
        {label} {required && <span className="text-destructive">*</span>}
        {hint && <span className="text-xs text-muted-foreground font-normal ml-1">— {hint}</span>}
      </label>
      <div className="flex gap-3">
        <div className="w-24 h-24 flex-shrink-0 rounded-xs border border-border bg-muted overflow-hidden flex items-center justify-center">
          {image.url ? (
            <img src={resolvePreviewUrl(image.url)} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">No image</span>
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex gap-2">
            <input
              type="text"
              className={inputClass}
              placeholder="/img/... atau upload"
              value={image.url || ""}
              onChange={(e) => onChange({ ...image, url: e.target.value, width: null, height: null })}
            />
            <Button
              variant="outline"
              icon={<Upload className="h-4 w-4" />}
              loading={uploading}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex-shrink-0"
            >
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          {withAlt && (
            <input
              type="text"
              className={inputClass}
              placeholder="Alt text: deskripsikan isi gambar (untuk SEO & aksesibilitas)"
              value={image.alt || ""}
              onChange={(e) => onChange({ ...image, alt: e.target.value })}
            />
          )}
          {image.width && image.height && (
            <p className="text-[11px] text-muted-foreground">
              {image.width}×{image.height}px
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CtaFields({ label, value, onChange, withIcon }) {
  const cta = value || {};
  return (
    <div className="rounded-xs border border-border p-3 space-y-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Label" required max={30} value={cta.label} onChange={(v) => onChange({ ...cta, label: v })} />
        <Field
          label="Link"
          required
          hint='"/path", "#anchor" atau "https://"'
          value={cta.href}
          onChange={(v) => onChange({ ...cta, href: v.trim() })}
        />
      </div>
      {withIcon && <IconPicker value={cta.icon} onChange={(v) => onChange({ ...cta, icon: v })} />}
    </div>
  );
}

const iconButtonClass =
  "p-1 rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none";

function ItemCard({ title, actions, onRemove, onMoveUp, onMoveDown, children }) {
  const busy = useContext(UploadContext).uploading > 0;
  if (busy) {
    // Keep the buttons visible but inert until uploads finish
    if (onMoveUp) onMoveUp = null;
    if (onMoveDown) onMoveDown = null;
    if (onRemove) onRemove = null;
  }
  return (
    <div className="rounded-xs border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-0.5">
          {actions}
          {onMoveUp !== undefined && (
            <button type="button" onClick={onMoveUp} disabled={!onMoveUp} className={iconButtonClass} title="Naikkan">
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
          {onMoveDown !== undefined && (
            <button type="button" onClick={onMoveDown} disabled={!onMoveDown} className={iconButtonClass} title="Turunkan">
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
          {onRemove !== undefined && (
            <button
              type="button"
              onClick={onRemove}
              disabled={!onRemove}
              className={`${iconButtonClass} hover:text-destructive`}
              title="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Title (H2) + primary-blue highlight + subtitle. With `withHighlight={false}` the
 * title is a single field; a highlight left over from older content is shown
 * merged into it and cleared on the first edit.
 */
function HeaderFields({ value, set, subtitleMax = 200, withHighlight = true }) {
  const mergedTitle = [value.title, value.titleHighlight].filter(Boolean).join(" ");
  return (
    <>
      {withHighlight ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title (H2)" required max={60} value={value.title} onChange={(v) => set(["title"], v)} />
          <Field label="Title highlight" hint="teks biru" max={40} value={value.titleHighlight} onChange={(v) => set(["titleHighlight"], v)} />
        </div>
      ) : (
        <Field
          label="Title (H2)"
          required
          max={60}
          value={mergedTitle}
          onChange={(v) => {
            set(["title"], v);
            if (value.titleHighlight) set(["titleHighlight"], "");
          }}
        />
      )}
      <Field
        label="Subtitle"
        hint="**teks** = tebal biru"
        multiline
        rows={2}
        max={subtitleMax}
        value={value.subtitle}
        onChange={(v) => set(["subtitle"], v)}
      />
    </>
  );
}

/** Editable list of short text lines with add/remove/reorder. */
function PointsEditor({ label, points, onChange, min, max, rows = 2, maxLength = 120, placeholder, addLabel = "poin" }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {label} <span className="text-xs text-muted-foreground font-normal">— {min}-{max} {addLabel}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          icon={<Plus className="h-3.5 w-3.5" />}
          disabled={points.length >= max}
          onClick={() => onChange([...points, ""])}
        >
          Tambah
        </Button>
      </div>
      {points.map((point, i) => (
        <div key={i} className="flex items-start gap-1">
          <textarea
            rows={rows}
            className={`${inputClass} resize-y`}
            value={point}
            placeholder={placeholder}
            maxLength={maxLength}
            onChange={(e) => onChange(points.map((p, idx) => (idx === i ? e.target.value : p)))}
          />
          <div className="flex flex-col">
            <button type="button" disabled={i === 0} onClick={() => onChange(move(points, i, -1))} className={iconButtonClass} title="Naikkan">
              <ChevronUp className="h-4 w-4" />
            </button>
            <button type="button" disabled={i === points.length - 1} onClick={() => onChange(move(points, i, 1))} className={iconButtonClass} title="Turunkan">
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={points.length <= min}
              onClick={() => onChange(points.filter((_, idx) => idx !== i))}
              className={`${iconButtonClass} hover:text-destructive`}
              title="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section forms ───────────────────────────────────────────────────────────

function HeroForm({ value, set }) {
  const trustItems = value.trustItems || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Field
            label="Eyebrow"
            hint="pill kecil di atas judul, kosongkan untuk sembunyikan"
            max={50}
            value={value.eyebrow?.text}
            onChange={(v) => set(["eyebrow", "text"], v)}
          />
        </div>
        <Field label="Badge" hint="mis. NEW" max={10} value={value.eyebrow?.badge} onChange={(v) => set(["eyebrow", "badge"], v)} />
      </div>
      <Field
        label="Title (H1)"
        required
        multiline
        rows={3}
        hint="judul mengalir otomatis (Enter diabaikan), maks ±2 baris di desktop. Taruh keyword utama di sini"
        max={100}
        value={value.title}
        onChange={(v) => set(["title"], v)}
      />
      <Field
        label="Title highlight"
        hint="teks biru, menyambung di akhir judul"
        max={40}
        value={value.titleHighlight}
        onChange={(v) => set(["titleHighlight"], v)}
      />
      <Field
        label="Deskripsi"
        required
        multiline
        max={240}
        value={value.description}
        onChange={(v) => set(["description"], v)}
      />
      <CtaFields label="Primary CTA" withIcon value={value.primaryCta} onChange={(v) => set(["primaryCta"], v)} />
      <CtaFields label="Secondary CTA" value={value.secondaryCta} onChange={(v) => set(["secondaryCta"], v)} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Trust items <span className="text-xs text-muted-foreground font-normal">— maks {MAX_TRUST_ITEMS}</span>
          </p>
          <Button
            size="sm"
            variant="outline"
            icon={<Plus className="h-3.5 w-3.5" />}
            disabled={trustItems.length >= MAX_TRUST_ITEMS}
            onClick={() => set(["trustItems"], [...trustItems, { icon: "Zap", text: "", tone: "primary" }])}
          >
            Tambah
          </Button>
        </div>
        {trustItems.map((item, i) => (
          <ItemCard
            key={i}
            title={`Item ${i + 1}`}
            onRemove={() => set(["trustItems"], trustItems.filter((_, idx) => idx !== i))}
          >
            <Field label="Teks" required max={30} placeholder="5.000+ Tagihan dibuat" value={item.text} onChange={(v) => set(["trustItems", i, "text"], v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <IconPicker value={item.icon} onChange={(v) => set(["trustItems", i, "icon"], v)} />
              <TonePicker value={item.tone} onChange={(v) => set(["trustItems", i, "tone"], v)} />
            </div>
          </ItemCard>
        ))}
      </div>

      <ImageField
        label="Hero image"
        hint="gambar utama (LCP), WebP/PNG ±1440px, transparan oke"
        value={value.image}
        onChange={(v) => set(["image"], v)}
      />
      <ImageField
        label="Hero image mobile"
        hint="opsional, khusus layar HP. Kosongkan URL untuk pakai hero image di atas. Alt text ikut hero image"
        required={false}
        withAlt={false}
        value={value.imageMobile}
        onChange={(v) => set(["imageMobile"], v)}
      />
    </div>
  );
}

function SocialProofForm({ value, set }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Strip 3 highlight tepat di bawah hero.</p>
      {(value.items || []).map((item, i) => (
        <ItemCard key={i} title={`Highlight ${i + 1}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title" required max={30} value={item.title} onChange={(v) => set(["items", i, "title"], v)} />
            <Field label="Deskripsi" hint="hanya tampil di desktop" max={60} value={item.desc} onChange={(v) => set(["items", i, "desc"], v)} />
            <IconPicker value={item.icon} onChange={(v) => set(["items", i, "icon"], v)} />
            <TonePicker value={item.tone} onChange={(v) => set(["items", i, "tone"], v)} />
          </div>
        </ItemCard>
      ))}
    </div>
  );
}

function HowItWorksForm({ value, set }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Title (H2)" required max={60} value={value.title} onChange={(v) => set(["title"], v)} />
        <Field label="Title highlight" max={40} value={value.titleHighlight} onChange={(v) => set(["titleHighlight"], v)} />
      </div>
      <Field label="Subtitle" multiline rows={2} max={160} value={value.subtitle} onChange={(v) => set(["subtitle"], v)} />
      <p className="text-xs text-muted-foreground">
        Step juga dipakai untuk structured data HowTo (Google), jadi tulis title & deskripsi yang jelas.
      </p>
      {(value.steps || []).map((step, i) => (
        <ItemCard key={i} title={`Step ${String(i + 1).padStart(2, "0")}`}>
          <Field label="Title" required max={40} value={step.title} onChange={(v) => set(["steps", i, "title"], v)} />
          <Field
            label="Deskripsi"
            required
            multiline
            rows={2}
            max={160}
            value={step.description}
            onChange={(v) => set(["steps", i, "description"], v)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <IconPicker value={step.icon} onChange={(v) => set(["steps", i, "icon"], v)} />
            <TonePicker value={step.tone} onChange={(v) => set(["steps", i, "tone"], v)} />
          </div>
          <ImageField label="Gambar" hint="rasio 1:1" value={step.image} onChange={(v) => set(["steps", i, "image"], v)} />
        </ItemCard>
      ))}
    </div>
  );
}

function CtaBannerForm({ value, set }) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Judul tampil sebagai: Title + Highlight (biru) + Suffix.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Title (H2)" required max={60} value={value.title} onChange={(v) => set(["title"], v)} />
        <Field label="Highlight" max={40} value={value.titleHighlight} onChange={(v) => set(["titleHighlight"], v)} />
        <Field label="Suffix" max={30} value={value.titleSuffix} onChange={(v) => set(["titleSuffix"], v)} />
      </div>
      <Field label="Deskripsi" multiline rows={2} max={200} value={value.description} onChange={(v) => set(["description"], v)} />
      <CtaFields label="Primary CTA" withIcon value={value.primaryCta} onChange={(v) => set(["primaryCta"], v)} />
      <CtaFields label="Secondary CTA" value={value.secondaryCta} onChange={(v) => set(["secondaryCta"], v)} />
      <Field label="Footnote" hint="teks kecil di bawah tombol" max={100} value={value.footnote} onChange={(v) => set(["footnote"], v)} />
      {(value.cards || []).map((card, i) => (
        <ItemCard key={i} title={`Card ${i + 1}`}>
          <Field label="Title" required max={40} value={card.title} onChange={(v) => set(["cards", i, "title"], v)} />
          <Field label="Deskripsi" required multiline rows={2} max={140} value={card.desc} onChange={(v) => set(["cards", i, "desc"], v)} />
          <TonePicker value={card.tone} onChange={(v) => set(["cards", i, "tone"], v)} />
          <ImageField
            label="Icon image"
            hint="PNG transparan kecil, dekoratif"
            withAlt={false}
            value={{ url: card.imageUrl }}
            onChange={(v) => set(["cards", i, "imageUrl"], v.url)}
          />
        </ItemCard>
      ))}
    </div>
  );
}

function SeoForm({ value, set }) {
  return (
    <div className="space-y-5">
      <Field
        label="Meta title"
        required
        hint="ideal 50-60 karakter, keyword utama di depan"
        max={70}
        value={value.title}
        onChange={(v) => set(["title"], v)}
      />
      <Field
        label="Meta description"
        required
        multiline
        hint="ideal 120-160 karakter"
        max={170}
        value={value.description}
        onChange={(v) => set(["description"], v)}
      />
      <div className="rounded-xs border border-border p-4 bg-white">
        <p className="text-[11px] text-muted-foreground mb-2">Preview hasil pencarian Google</p>
        <p className="text-xs text-slate-600">www.splitbill.my.id</p>
        <p className="text-lg text-[#1a0dab] leading-snug truncate">{value.title || "Meta title"}</p>
        <p className="text-sm text-slate-600 line-clamp-2">{value.description || "Meta description"}</p>
      </div>

      <ItemCard title="Share preview (WhatsApp, Facebook, X, LinkedIn)">
        <ImageField
          label="OG image"
          hint="otomatis dipotong 1200×630 JPEG, taruh teks penting di tengah"
          variant="og"
          value={value.ogImage}
          onChange={(v) => set(["ogImage"], v)}
        />
        <Field
          label="Social title"
          hint="kosong = pakai meta title"
          max={90}
          value={value.socialTitle}
          onChange={(v) => set(["socialTitle"], v)}
        />
        <Field
          label="Social description"
          hint="kosong = pakai meta description"
          multiline
          rows={2}
          max={200}
          value={value.socialDescription}
          onChange={(v) => set(["socialDescription"], v)}
        />
        <div className="max-w-sm rounded-md overflow-hidden border border-border bg-[#f0f2f5]">
          <div className="aspect-[1200/630] bg-muted">
            {value.ogImage?.url && (
              <img src={resolvePreviewUrl(value.ogImage.url)} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="px-3 py-2 space-y-0.5">
            <p className="text-[11px] uppercase text-slate-500">splitbill.my.id</p>
            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{value.socialTitle || value.title}</p>
            <p className="text-xs text-slate-600 line-clamp-2">{value.socialDescription || value.description}</p>
          </div>
        </div>
        {value.ogImage?.width && value.ogImage?.height && (value.ogImage.width !== 1200 || value.ogImage.height !== 630) && (
          <p className="text-[11px] text-amber-600">
            Ukuran {value.ogImage.width}×{value.ogImage.height}. Upload ulang supaya otomatis jadi 1200×630.
          </p>
        )}
      </ItemCard>

      <ItemCard title="Profil sosial resmi">
        <p className="text-xs text-muted-foreground">
          Masuk ke structured data Organization (sameAs), membantu Google menghubungkan brand dengan akun resmi.
        </p>
        <PointsEditor
          label="URL profil"
          addLabel="URL"
          points={value.sameAs || []}
          min={0}
          max={MAX_SAME_AS}
          rows={1}
          maxLength={200}
          placeholder="https://www.tiktok.com/@splitbill"
          onChange={(urls) => set(["sameAs"], urls.map((u) => u.trim()))}
        />
      </ItemCard>
    </div>
  );
}

function SeoContentForm({ value, set }) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Artikel teks di homepage untuk menambah konten yang bisa dibaca Google (penjelasan fitur, cara bagi tagihan, dll).
        Aktifkan lewat tab Layout setelah diisi. Tulis untuk pembaca, bukan tumpukan keyword.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Title (H2)" max={80} value={value.title} onChange={(v) => set(["title"], v)} />
        <Field label="Title highlight" hint="teks biru" max={40} value={value.titleHighlight} onChange={(v) => set(["titleHighlight"], v)} />
      </div>
      <Field
        label="Isi"
        multiline
        rows={16}
        max={6000}
        placeholder={"Paragraf pertama...\n\n## Subjudul\n\nParagraf dengan **teks tebal** dan [link internal](/split-bill).\n\n- poin satu\n- poin dua"}
        value={value.body}
        onChange={(v) => set(["body"], v)}
      />
      <div className="rounded-xs border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Format</p>
        <p>Baris kosong = paragraf baru · <code>## Judul</code> = subjudul (H3) · baris diawali <code>- </code> = list</p>
        <p>
          <code>**teks**</code> = tebal · <code>[teks](/split-bill)</code> = link (diawali &quot;/&quot;, &quot;#&quot;, atau &quot;https://&quot;).
          Link ke halaman lain di SplitBill membantu Google menjelajah situs.
        </p>
      </div>
    </div>
  );
}

const EMPTY_FEATURE = {
  imageUrl: "",
  image: { url: "", alt: "" },
  tone: "blue",
  title: "",
  description: "",
  badge: "",
  href: "/",
  ctaLabel: "",
  guideHref: "",
  requiresLogin: false,
  isActive: true,
};

// Fitur Showcase (pinned scroll cards) and the bento grid render the same
// features.items; each section keeps its own header.
function FeaturesForm({ value, set }) {
  const features = value.features;
  const items = features.items || [];
  const setFeatures = (path, v) => set(["features", ...path], v);
  return (
    <div className="space-y-5">
      <ItemCard title="Header Fitur Showcase (kartu scroll)">
        <p className="text-xs text-muted-foreground">
          Section menempel saat di-scroll dan berganti ke kartu berikutnya; tiap kartu menambah ±70% tinggi layar ke
          panjang scroll.
        </p>
        <HeaderFields value={value.featureShowcase} set={(path, v) => set(["featureShowcase", ...path], v)} />
      </ItemCard>
      <ItemCard title="Header Fitur (bento grid)">
        <HeaderFields value={features} set={setFeatures} />
      </ItemCard>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Kartu fitur{" "}
          <span className="text-xs text-muted-foreground font-normal">
            — {MIN_FEATURES}-{MAX_FEATURES} (min. {MIN_FEATURES} aktif), dipakai Fitur Showcase &amp; bento grid; hanya kartu
            aktif yang tampil
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          icon={<Plus className="h-3.5 w-3.5" />}
          disabled={items.length >= MAX_FEATURES}
          onClick={() => setFeatures(["items"], [...items, { ...EMPTY_FEATURE, image: { url: "", alt: "" } }])}
        >
          Tambah
        </Button>
      </div>
      {items.map((item, i) => (
        <ItemCard
          key={i}
          title={
            <span className={item.isActive === false ? "text-muted-foreground" : ""}>
              {item.title || `Fitur ${i + 1}`}
              {item.isActive === false && <span className="ml-1.5 text-xs font-normal">(nonaktif)</span>}
            </span>
          }
          actions={
            <button
              type="button"
              onClick={() => setFeatures(["items", i, "isActive"], item.isActive === false)}
              className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              title={item.isActive === false ? "Aktifkan (tampil di landing)" : "Nonaktifkan (sembunyikan dari landing)"}
            >
              {item.isActive === false ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5 text-green-500" />}
              {item.isActive === false ? "Nonaktif" : "Aktif"}
            </button>
          }
          onMoveUp={i > 0 ? () => setFeatures(["items"], move(items, i, -1)) : null}
          onMoveDown={i < items.length - 1 ? () => setFeatures(["items"], move(items, i, 1)) : null}
          onRemove={items.length > MIN_FEATURES ? () => setFeatures(["items"], items.filter((_, idx) => idx !== i)) : null}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Field label="Title" required max={40} value={item.title} onChange={(v) => setFeatures(["items", i, "title"], v)} />
            </div>
            <Field label="Badge" hint="mis. Baru" max={15} value={item.badge} onChange={(v) => setFeatures(["items", i, "badge"], v)} />
          </div>
          <Field
            label="Deskripsi"
            required
            multiline
            rows={3}
            max={220}
            value={item.description}
            onChange={(v) => setFeatures(["items", i, "description"], v)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CTA label" required max={30} value={item.ctaLabel} onChange={(v) => setFeatures(["items", i, "ctaLabel"], v)} />
            <Field label="CTA link" required value={item.href} onChange={(v) => setFeatures(["items", i, "href"], v.trim())} />
          </div>
          <Field
            label="Link cara pakai"
            hint="opsional, kosongkan untuk sembunyikan"
            value={item.guideHref}
            onChange={(v) => setFeatures(["items", i, "guideHref"], v.trim())}
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={!!item.requiresLogin}
              onChange={(e) => setFeatures(["items", i, "requiresLogin"], e.target.checked)}
            />
            Tampilkan label &quot;Perlu login&quot;
          </label>
          <ImageField
            label="Gambar Fitur Showcase"
            hint="gambar besar di kartu scroll, kotak/portrait ≥800px"
            value={item.image}
            onChange={(v) => setFeatures(["items", i, "image"], v)}
          />
          <TonePicker label="Warna latar gambar showcase" value={item.tone} onChange={(v) => setFeatures(["items", i, "tone"], v)} />
          <ImageField
            label="Icon"
            hint="icon kecil di bento grid & di atas title kartu showcase, PNG transparan"
            withAlt={false}
            value={{ url: item.imageUrl }}
            onChange={(v) => setFeatures(["items", i, "imageUrl"], v.url)}
          />
        </ItemCard>
      ))}
    </div>
  );
}

function UseCasesForm({ value, set }) {
  return (
    <div className="space-y-5">
      <Field label="Eyebrow" hint="pill di atas judul" max={60} value={value.eyebrow} onChange={(v) => set(["eyebrow"], v)} />
      <HeaderFields value={value} set={set} subtitleMax={240} />
      <p className="text-xs text-muted-foreground">
        Kotak penjelasan pajak & contoh struk di bawah kartu tetap statis.
      </p>
      {(value.cards || []).map((card, i) => (
        <ItemCard key={i} title={`Kartu ${i + 1}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Field label="Title (H3)" required max={50} value={card.title} onChange={(v) => set(["cards", i, "title"], v)} />
            </div>
            <Field label="Label fitur" hint="desktop" max={25} value={card.feature} onChange={(v) => set(["cards", i, "feature"], v)} />
          </div>
          <Field label="Isi" required multiline rows={3} max={300} value={card.body} onChange={(v) => set(["cards", i, "body"], v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CTA label" required max={30} value={card.ctaLabel} onChange={(v) => set(["cards", i, "ctaLabel"], v)} />
            <Field label="Link" required value={card.href} onChange={(v) => set(["cards", i, "href"], v.trim())} />
          </div>
          <TonePicker label="Warna latar gambar" value={card.tone} onChange={(v) => set(["cards", i, "tone"], v)} />
          <ImageField
            label="Gambar"
            hint="ilustrasi PNG transparan"
            withAlt={false}
            value={{ url: card.imageUrl }}
            onChange={(v) => set(["cards", i, "imageUrl"], v.url)}
          />
        </ItemCard>
      ))}
    </div>
  );
}

function ComparisonForm({ value, set }) {
  return (
    <div className="space-y-5">
      <HeaderFields value={value} set={set} />
      {[
        { side: "before", label: "Kolom merah (sebelum)" },
        { side: "after", label: "Kolom hijau (sesudah)" },
      ].map(({ side, label }) => (
        <ItemCard key={side} title={label}>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Emoji" max={8} value={value[side]?.emoji} onChange={(v) => set([side, "emoji"], v)} />
            <div className="col-span-3">
              <Field label="Title" required max={40} value={value[side]?.title} onChange={(v) => set([side, "title"], v)} />
            </div>
          </div>
          {side === "after" && (
            <Field label="Badge pojok" max={25} value={value.after?.badge} onChange={(v) => set(["after", "badge"], v)} />
          )}
          <PointsEditor
            label="Poin"
            points={value[side]?.points || []}
            min={MIN_COMPARISON_POINTS}
            max={MAX_COMPARISON_POINTS}
            onChange={(points) => set([side, "points"], points)}
          />
        </ItemCard>
      ))}
    </div>
  );
}

// Edits several sections at once: `value` is the whole content, paths are
// rooted at it (see tabSections).
function OtherHeadersForm({ value, set }) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Isi testimoni dan artikel diambil otomatis dari Reviews dan Blog. Isi FAQ dikelola di menu FAQ.
      </p>
      {[
        // Testimoni sits on a blue background with a plain-white title
        { key: "testimonials", label: "Testimoni", withHighlight: false },
        { key: "blog", label: "Blog", withHighlight: true },
        { key: "faq", label: "FAQ", withHighlight: true },
      ].map(({ key, label, withHighlight }) => (
        <ItemCard key={key} title={label}>
          <HeaderFields value={value[key]} set={(path, v) => set([key, ...path], v)} withHighlight={withHighlight} />
        </ItemCard>
      ))}
    </div>
  );
}

const EMPTY_SLIDE = {
  title: "",
  imageUrl: "",
  href: "/",
  ctaLabel: "",
  badge: "",
  badgeIcon: "",
  tone: "primary",
};

// Edits promoSlider + promoBanner (paths rooted at the whole content).
function PromoForm({ value, set }) {
  const slider = value.promoSlider;
  const slides = slider.slides || [];
  const banner = value.promoBanner;
  const setBanner = (path, v) => set(["promoBanner", ...path], v);
  return (
    <div className="space-y-5">
      <ItemCard title="Promo Slider">
        <p className="text-xs text-muted-foreground">Kartu geser di bawah Social Proof. Tidak muncul kalau semua kartu kosong.</p>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={!!slider.showAiScanCard}
            onChange={(e) => set(["promoSlider", "showAiScanCard"], e.target.checked)}
          />
          Tampilkan kartu kuota AI Scan di urutan pertama (isi otomatis per pengunjung)
        </label>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Kartu promo <span className="text-xs text-muted-foreground font-normal">— maks {MAX_PROMO_SLIDES}</span>
          </p>
          <Button
            size="sm"
            variant="outline"
            icon={<Plus className="h-3.5 w-3.5" />}
            disabled={slides.length >= MAX_PROMO_SLIDES}
            onClick={() => set(["promoSlider", "slides"], [...slides, { ...EMPTY_SLIDE }])}
          >
            Tambah
          </Button>
        </div>
        {slides.map((slide, i) => {
          const setSlide = (field, v) => set(["promoSlider", "slides", i, field], v);
          return (
            <ItemCard
              key={i}
              title={`Kartu ${i + 1}`}
              onMoveUp={i > 0 ? () => set(["promoSlider", "slides"], move(slides, i, -1)) : null}
              onMoveDown={i < slides.length - 1 ? () => set(["promoSlider", "slides"], move(slides, i, 1)) : null}
              onRemove={() => set(["promoSlider", "slides"], slides.filter((_, idx) => idx !== i))}
            >
              <Field label="Judul" required multiline rows={2} max={80} value={slide.title} onChange={(v) => setSlide("title", v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="CTA label" required max={30} value={slide.ctaLabel} onChange={(v) => setSlide("ctaLabel", v)} />
                <Field label="Link" required value={slide.href} onChange={(v) => setSlide("href", v.trim())} />
                <Field label="Badge" hint="kosongkan untuk sembunyikan" max={15} value={slide.badge} onChange={(v) => setSlide("badge", v)} />
                <div>
                  <IconPicker label="Icon badge" value={slide.badgeIcon} onChange={(v) => setSlide("badgeIcon", v)} />
                  {slide.badgeIcon && (
                    <button type="button" className="mt-1 text-[11px] text-primary hover:underline" onClick={() => setSlide("badgeIcon", "")}>
                      Pakai titik berkedip
                    </button>
                  )}
                </div>
              </div>
              <TonePicker value={slide.tone} onChange={(v) => setSlide("tone", v)} />
              <ImageField
                label="Icon image"
                hint="kecil, bulat"
                withAlt={false}
                value={{ url: slide.imageUrl }}
                onChange={(v) => setSlide("imageUrl", v.url)}
              />
            </ItemCard>
          );
        })}
      </ItemCard>

      <ItemCard title="Promo Banner">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title" required max={40} value={banner.titleText} onChange={(v) => setBanner(["titleText"], v)} />
          <Field label="Highlight" hint="baris kedua" max={40} value={banner.titleHighlight} onChange={(v) => setBanner(["titleHighlight"], v)} />
        </div>
        <Field label="Deskripsi" max={100} value={banner.description} onChange={(v) => setBanner(["description"], v)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CTA label" required max={25} value={banner.ctaLabel} onChange={(v) => setBanner(["ctaLabel"], v)} />
          <Field label="Link" required value={banner.href} onChange={(v) => setBanner(["href"], v.trim())} />
        </div>
        <TonePicker label="Warna latar" value={banner.tone} onChange={(v) => setBanner(["tone"], v)} />
        <ImageField label="Gambar" hint="foto lebar, sisi kanan banner" value={banner.image} onChange={(v) => setBanner(["image"], v)} />
      </ItemCard>
    </div>
  );
}

function LayoutForm({ value, set }) {
  const sections = value.sections || [];
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Urutan section di homepage. Hero selalu paling atas. Fitur Showcase, Cara Pakai, dan Testimoni tidak bisa disembunyikan karena
        jadi tujuan link navbar di semua halaman.
      </p>
      <div className="rounded-xs border border-border divide-y divide-border">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/40">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground flex-1">Hero</span>
          <span className="text-[11px] text-muted-foreground">selalu pertama</span>
        </div>
        {sections.map((section, i) => {
          const locked = ALWAYS_VISIBLE_SECTIONS.includes(section.key);
          return (
            <div key={section.key} className={`flex items-center gap-2 px-3 py-2 ${section.visible ? "" : "bg-muted/30"}`}>
              <div className="flex flex-col">
                <button type="button" disabled={i === 0} onClick={() => set(["sections"], move(sections, i, -1))} className={iconButtonClass} title="Naikkan">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={i === sections.length - 1}
                  onClick={() => set(["sections"], move(sections, i, 1))}
                  className={iconButtonClass}
                  title="Turunkan"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <span className={`text-sm flex-1 ${section.visible ? "font-medium text-foreground" : "text-muted-foreground line-through"}`}>
                {SECTION_LABELS[section.key] || section.key}
              </span>
              {locked ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Dipakai link navbar">
                  <Lock className="h-3.5 w-3.5" /> wajib tampil
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => set(["sections", i, "visible"], !section.visible)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xs text-xs border ${
                    section.visible ? "border-border text-foreground hover:bg-muted" : "border-primary/30 text-primary hover:bg-primary/5"
                  }`}
                >
                  {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {section.visible ? "Tampil" : "Disembunyikan"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SECTION_FORMS = {
  layout: LayoutForm,
  promo: PromoForm,
  hero: HeroForm,
  socialProof: SocialProofForm,
  features: FeaturesForm,
  useCases: UseCasesForm,
  howItWorks: HowItWorksForm,
  comparison: ComparisonForm,
  headers: OtherHeadersForm,
  ctaBanner: CtaBannerForm,
  seoContent: SeoContentForm,
  seo: SeoForm,
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  usePageMeta("Landing Page", "Kelola konten landing page splitbill.my.id.");
  const toast = useToast();

  const [content, setContent] = useState(null);
  const [savedContent, setSavedContent] = useState(null);
  const [meta, setMeta] = useState({ updatedAt: null, isDefault: false });
  const [activeTab, setActiveTab] = useState("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const uploadContext = useMemo(() => ({ uploading, track: (delta) => setUploading((n) => n + delta) }), [uploading]);
  const isDirty = JSON.stringify(content) !== JSON.stringify(savedContent);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch("/api/landing-page");
        const data = await res.json();
        if (data.success) {
          setContent(data.data.content);
          setSavedContent(data.data.content);
          setMeta({ updatedAt: data.data.updatedAt, isDefault: data.data.isDefault });
        } else {
          toast({ message: data.error || "Gagal memuat konten", type: "error" });
        }
      } catch {
        toast({ message: "Gagal memuat konten", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  // Sticky tab bar: its height positions the sticky phone preview below it;
  // scroll state adds a divider shadow once it is stuck.
  const stickyRef = useRef(null);
  const titleRef = useRef(null);
  const [stickyHeight, setStickyHeight] = useState(0);
  const [mainTop, setMainTop] = useState(0);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sticky = stickyRef.current;
    const main = sticky?.closest("main");
    if (!sticky || !main) return;
    const measure = () => {
      setStickyHeight(sticky.offsetHeight);
      setMainTop(main.getBoundingClientRect().top);
    };
    // Stuck once the bar has reached main's top edge
    const onScroll = () =>
      setIsStuck(sticky.getBoundingClientRect().top - main.getBoundingClientRect().top <= 0.5);
    measure();
    onScroll();
    const observer = new ResizeObserver(measure);
    observer.observe(sticky);
    window.addEventListener("resize", measure);
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      main.removeEventListener("scroll", onScroll);
    };
  }, [loading]);

  const selectTab = (key) => {
    setActiveTab(key);
    // Start the new tab's form at the top instead of mid-scroll of the old one
    // Only when the bar is stuck: scroll to where it just sticks — its natural
    // spot, 12px (space-y-3) below the title row — so it stays pinned.
    const sticky = stickyRef.current;
    const main = sticky?.closest("main");
    const title = titleRef.current;
    if (!sticky || !main || !title) return;
    const mainTop = main.getBoundingClientRect().top;
    if (sticky.getBoundingClientRect().top - mainTop > 0.5) return;
    main.scrollTo({ top: main.scrollTop + title.getBoundingClientRect().bottom + 12 - mainTop });
  };

  const handleSave = async () => {
    setSaving(true);
    // Snapshot what is being saved: edits typed while the request is in flight
    // must survive the response (they stay unsaved/dirty instead of vanishing)
    const sent = content;
    try {
      const res = await apiFetch("/api/landing-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sent, expectedUpdatedAt: meta.isDefault ? null : meta.updatedAt }),
      });
      const data = await res.json();
      if (data.success) {
        setContent((current) => (current === sent ? data.data.content : current));
        setSavedContent(data.data.content);
        setMeta({ updatedAt: data.data.updatedAt, isDefault: false });
        toast({ message: data.message, type: data.revalidated ? "success" : "warning" });
      } else {
        toast({ message: data.error || "Gagal menyimpan", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan. Coba lagi.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!content) return null;

  const ActiveForm = SECTION_FORMS[activeTab];
  const activeTabDef = TABS.find((tab) => tab.key === activeTab);
  // Single-section tabs get that section with paths relative to it; multi-
  // section tabs get the whole content with paths rooted at the top.
  const isMultiSection = Boolean(activeTabDef.sections);
  const formValue = isMultiSection ? content : content[activeTab];
  const setSection = (path, value) =>
    setContent((prev) => setIn(prev, isMultiSection ? path : [activeTab, ...path], value));
  const isTabDirty = (tab) =>
    tabSections(tab).some((key) => JSON.stringify(content[key]) !== JSON.stringify(savedContent[key]));

  // Sticky offsets are measured from main's content edge (16px below its top),
  // while the tab bar sticks at main's top edge — so `stickyHeight` here leaves
  // a 16px gap between the bar and the preview.
  const previewTop = stickyHeight;

  return (
    <div className="space-y-3">
      <div ref={titleRef} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Landing Page</h1>
          <p className="text-xs text-muted-foreground">
            {meta.isDefault
              ? "Masih pakai konten default. Simpan sekali untuk mulai mengelola dari sini."
              : `Terakhir disimpan ${new Date(meta.updatedAt).toLocaleString("id-ID")}. Perubahan langsung live saat disimpan.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xs border border-border text-foreground hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            Lihat
          </a>
          <Button
            icon={<Save className="h-4 w-4" />}
            loading={saving}
            // An in-flight upload would publish the old image URL
            disabled={saving || !isDirty || uploading > 0}
            onClick={handleSave}
          >
            {saving ? "Menyimpan..." : "Simpan & Live"}
          </Button>
        </div>
      </div>

      {/* Tab bar sticks to the top of <main> (the scroll container) while the
          title scrolls away. -mx-4/px-4 span main's horizontal padding;
          -top-4 sticks it at main's outer edge instead of inside its 16px top
          padding, so no strip of scrolled content shows above it. */}
      <div
        ref={stickyRef}
        className={`sticky -top-4 z-30 -mx-4 px-4 pt-2 bg-background transition-shadow ${
          isStuck ? "shadow-[0_6px_12px_-8px_rgba(15,23,42,0.18)]" : ""
        }`}
      >
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {isTabDirty(tab) && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardBody>
            <UploadContext.Provider value={uploadContext}>
              <ActiveForm value={formValue} set={setSection} />
            </UploadContext.Provider>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <div className="lg:sticky" style={{ top: previewTop }}>
            <PhonePreview
              src={PREVIEW_URL}
              content={content}
              focusSection={activeTabDef.focus || activeTab}
              topOffset={mainTop + 16 + previewTop}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

