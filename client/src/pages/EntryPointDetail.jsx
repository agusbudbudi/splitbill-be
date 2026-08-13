import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import { Save, ArrowLeft, RefreshCw, ArrowRight } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Card, CardBody, CardFooter, Button, useToast } from "../components/ui";

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM = {
  slug: "",
  imageUrl: "",
  imageAlt: "",
  title: "",
  subtitle: "",
  ctaText: "",
  url: "",
  footerText: "",
  footerIconUrl: "",
  ribbonText: "",
  placement: "homepage-member",
  isActive: true,
  order: 0,
};

export default function EntryPointDetail() {
  const { id: mongoId } = useParams();
  const isEdit = Boolean(mongoId);
  const navigate = useNavigate();
  const toast = useToast();

  usePageMeta(
    isEdit ? "Edit Entry Point Card" : "Tambah Entry Point Card",
    isEdit
      ? "Edit konfigurasi entry point card yang sudah ada."
      : "Buat entry point card baru untuk homepage member."
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugLocked, setSlugLocked] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const fetchCard = async () => {
      try {
        const res = await apiFetch(`/api/entry-points/${mongoId}`);
        const data = await res.json();
        if (data.success) {
          const card = data.data;
          setForm({
            slug: card.slug || "",
            imageUrl: card.imageUrl || "",
            imageAlt: card.imageAlt || "",
            title: card.title || "",
            subtitle: card.subtitle || "",
            ctaText: card.ctaText || "",
            url: card.url || "",
            footerText: card.footerText || "",
            footerIconUrl: card.footerIconUrl || "",
            ribbonText: card.ribbonText || "",
            placement: card.placement || "homepage-member",
            isActive: card.isActive !== undefined ? card.isActive : true,
            order: card.order ?? 0,
          });
        } else {
          toast({ message: "Entry point card tidak ditemukan", type: "error" });
          navigate("/entry-points");
        }
      } catch {
        toast({ message: "Gagal memuat data", type: "error" });
        navigate("/entry-points");
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [mongoId, isEdit, navigate, toast]);

  const handleTitleChange = (val) => {
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: slugLocked ? prev.slug : slugify(val),
    }));
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.slug.trim()) {
      toast({ message: "Slug wajib diisi", type: "warning" });
      return;
    }
    if (!form.imageUrl.trim()) {
      toast({ message: "Image URL wajib diisi", type: "warning" });
      return;
    }
    if (!form.imageAlt.trim()) {
      toast({ message: "Image Alt wajib diisi", type: "warning" });
      return;
    }
    if (!form.title.trim()) {
      toast({ message: "Title wajib diisi", type: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        order: Number(form.order) || 0,
        subtitle: form.subtitle.trim() || null,
        ctaText: form.ctaText.trim() || null,
        url: form.url.trim() || null,
        footerText: form.footerText.trim() || null,
        footerIconUrl: form.footerIconUrl.trim() || null,
        ribbonText: form.ribbonText.trim() || null,
      };

      const res = await apiFetch(
        isEdit ? `/api/entry-points/${mongoId}` : "/api/entry-points",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (data.success) {
        toast({
          message: isEdit
            ? "Entry point card berhasil diperbarui!"
            : "Entry point card berhasil dibuat!",
          type: "success",
        });
        navigate("/entry-points");
      } else {
        toast({ message: data.error || "Terjadi kesalahan", type: "error" });
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

  const inputClass =
    "block w-full px-3 py-2 text-sm rounded-sm border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/entry-points")}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isEdit ? "Edit Entry Point Card" : "Tambah Entry Point Card"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? `Mengedit: ${form.title || form.slug}`
                : "Buat entry point card baru untuk homepage member"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form ─────────────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardBody className="space-y-5">
            {/* Title */}
            <div>
              <label className={labelClass}>
                Title <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — max 2 baris, akan terpotong jika lebih
                </span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Kasih Review, Dapat Hadiah"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            {/* Slug */}
            <div>
              <label className={labelClass}>
                Slug <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — identifier unik
                </span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="review-reward"
                  value={form.slug}
                  onChange={(e) => handleField("slug", slugify(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => setSlugLocked((v) => !v)}
                  className="flex-shrink-0 p-2 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={slugLocked ? "Unlock slug" : "Auto-generate dari title"}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {!slugLocked && form.title && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generate dari judul. Klik 🔄 untuk lock.
                </p>
              )}
            </div>

            {/* Subtitle */}
            <div>
              <label className={labelClass}>
                Subtitle
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — opsional, max 2 baris
                </span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Cuma 10 detik, langsung claim"
                value={form.subtitle}
                onChange={(e) => handleField("subtitle", e.target.value)}
              />
            </div>

            {/* Image */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>
                  Image URL <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    — square ratio (1:1) direkomendasikan
                  </span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="/img/ads-review.png"
                  value={form.imageUrl}
                  onChange={(e) => handleField("imageUrl", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Image Alt <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Review SplitBill Online"
                  value={form.imageAlt}
                  onChange={(e) => handleField("imageAlt", e.target.value)}
                />
              </div>
            </div>

            {/* CTA & URL */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>CTA Text</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Review sekarang"
                  value={form.ctaText}
                  onChange={(e) => handleField("ctaText", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  URL
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    — internal atau https://
                  </span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="/review"
                  value={form.url}
                  onChange={(e) => handleField("url", e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Footer Text</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Berlaku sampai akhir bulan"
                  value={form.footerText}
                  onChange={(e) => handleField("footerText", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Footer Icon URL
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    — icon kecil di footer
                  </span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="/img/icon-rewards.png"
                  value={form.footerIconUrl}
                  onChange={(e) => handleField("footerIconUrl", e.target.value)}
                />
              </div>
            </div>

            {/* Ribbon */}
            <div>
              <label className={labelClass}>
                Ribbon Text
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — label pojok kiri bawah gambar, contoh: Baru, Promo
                </span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Baru"
                value={form.ribbonText}
                onChange={(e) => handleField("ribbonText", e.target.value)}
              />
            </div>

            {/* Placement & Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Placement</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="homepage-member"
                  value={form.placement}
                  onChange={(e) => handleField("placement", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Urutan
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    (semakin kecil = duluan)
                  </span>
                </label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.order}
                  onChange={(e) => handleField("order", Number(e.target.value))}
                />
              </div>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Status Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Card akan ditampilkan ke pengguna jika aktif
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleField("isActive", !form.isActive)}
                className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none ${form.isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                style={{ height: "20px" }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                  style={{
                    transform: form.isActive ? "translateX(2px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </CardBody>

          <CardFooter className="py-3 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/entry-points")}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              onClick={handleSave}
            >
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Entry Point Card"}
            </Button>
          </CardFooter>
        </Card>

        {/* ── Live Preview Panel ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <p className="text-sm font-semibold text-foreground">Preview Card</p>
              <p className="text-xs text-muted-foreground">
                Tampilan sesuai homepage member
              </p>
            </div>
            <CardBody className="flex justify-center">
              <div className="w-[200px] flex flex-col overflow-hidden rounded-md bg-white border border-border shadow-sm">
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt={form.imageAlt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  {form.ribbonText && (
                    <span className="absolute bottom-0 left-0 rounded-tr-sm bg-gradient-to-r from-violet-400 via-pink-400 to-primary/70 px-3 py-2 text-[11px] font-black uppercase leading-none tracking-wide text-white shadow-sm">
                      {form.ribbonText}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
                    {form.title || "Judul card"}
                  </h3>

                  {form.subtitle && (
                    <p className="text-[11px] text-muted-foreground font-medium leading-tight line-clamp-2">
                      {form.subtitle}
                    </p>
                  )}

                  {form.ctaText && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                      {form.ctaText}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  )}

                  {form.footerText && (
                    <div className="mt-auto pt-2 flex items-center gap-1.5 border-t border-slate-100 text-[10.5px] text-muted-foreground font-medium">
                      {form.footerIconUrl && (
                        <span className="relative w-3 h-3 shrink-0 overflow-hidden rounded-full">
                          <img
                            src={form.footerIconUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </span>
                      )}
                      <span className="truncate">{form.footerText}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Info summary */}
          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Ringkasan</p>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Slug", value: form.slug || "—" },
                  { label: "Placement", value: form.placement || "—" },
                  { label: "Urutan", value: form.order },
                  {
                    label: "Status",
                    value: form.isActive ? (
                      <span className="text-green-600 font-semibold">Aktif</span>
                    ) : (
                      <span className="text-muted-foreground">Nonaktif</span>
                    ),
                  },
                  ...(form.url ? [{ label: "URL Tujuan", value: form.url }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-muted-foreground flex-shrink-0 whitespace-nowrap">{label}</span>
                    <span className="font-medium text-foreground break-all flex-1 text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
