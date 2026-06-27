import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Save,
  ArrowLeft,
  RefreshCw,
  Youtube,
  Video,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  useToast,
} from "../components/ui";

// ─── helpers ─────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isYouTubeUrl(url) {
  return url && (url.includes("youtube.com") || url.includes("youtu.be"));
}

function getYouTubeEmbedUrl(url) {
  try {
    let videoId = null;
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else {
      videoId = new URL(url).searchParams.get("v");
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

// ─── component ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  id: "",
  sponsorName: "",
  title: "",
  description: "",
  mediaType: "video",
  mediaUrl: "",
  ctaUrl: "",
  ctaText: "",
  durationSeconds: 10,
  isActive: true,
  order: 0,
};

export default function AdCampaignDetail() {
  const { id: mongoId } = useParams();
  const isEdit = Boolean(mongoId);
  const navigate = useNavigate();
  const toast = useToast();

  usePageMeta(
    isEdit ? "Edit Ad Campaign" : "Tambah Ad Campaign",
    isEdit
      ? "Edit konfigurasi ad campaign yang sudah ada."
      : "Buat ad campaign baru untuk ditampilkan ke pengguna non-VIP."
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugLocked, setSlugLocked] = useState(isEdit);
  const [previewVisible, setPreviewVisible] = useState(true);

  // Load existing data for edit mode
  useEffect(() => {
    if (!isEdit) return;
    const fetchAd = async () => {
      try {
        const res = await apiFetch(`/api/ad-campaigns/${mongoId}`);
        const data = await res.json();
        if (data.success) {
          const ad = data.data;
          setForm({
            id: ad.id || "",
            sponsorName: ad.sponsorName || "",
            title: ad.title || "",
            description: ad.description || "",
            mediaType: ad.mediaType || "video",
            mediaUrl: ad.mediaUrl || "",
            ctaUrl: ad.ctaUrl || "",
            ctaText: ad.ctaText || "",
            durationSeconds: ad.durationSeconds ?? 10,
            isActive: ad.isActive !== undefined ? ad.isActive : true,
            order: ad.order ?? 0,
          });
        } else {
          toast({ message: "Ad campaign tidak ditemukan", type: "error" });
          navigate("/ad-campaigns");
        }
      } catch {
        toast({ message: "Gagal memuat data", type: "error" });
        navigate("/ad-campaigns");
      } finally {
        setLoading(false);
      }
    };
    fetchAd();
  }, [mongoId, isEdit, navigate, toast]);

  // Auto-detect YouTube → force mediaType video
  useEffect(() => {
    if (isYouTubeUrl(form.mediaUrl) && form.mediaType !== "video") {
      setForm((prev) => ({ ...prev, mediaType: "video" }));
    }
  }, [form.mediaUrl]);

  const handleTitleChange = (val) => {
    setForm((prev) => ({
      ...prev,
      title: val,
      id: slugLocked ? prev.id : slugify(val),
    }));
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.sponsorName.trim()) {
      toast({ message: "Sponsor Name wajib diisi", type: "warning" });
      return;
    }
    if (!form.id.trim()) {
      toast({ message: "Campaign ID (slug) wajib diisi", type: "warning" });
      return;
    }
    if (!form.mediaUrl.trim()) {
      toast({ message: "Media URL wajib diisi", type: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        durationSeconds: Number(form.durationSeconds) || 10,
        order: Number(form.order) || 0,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        ctaUrl: form.ctaUrl.trim() || null,
        ctaText: form.ctaText.trim() || null,
      };

      const res = await apiFetch(
        isEdit ? `/api/ad-campaigns/${mongoId}` : "/api/ad-campaigns",
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
            ? "Ad campaign berhasil diperbarui!"
            : "Ad campaign berhasil dibuat!",
          type: "success",
        });
        navigate("/ad-campaigns");
      } else {
        toast({ message: data.error || "Terjadi kesalahan", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan. Coba lagi.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Media preview renderer ───────────────────────────────────────────────
  const renderPreview = () => {
    if (!form.mediaUrl) {
      return (
        <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
          {form.mediaType === "video" ? (
            <Video className="h-10 w-10 opacity-30" />
          ) : (
            <ImageIcon className="h-10 w-10 opacity-30" />
          )}
          <span className="text-xs">Masukkan Media URL untuk preview</span>
        </div>
      );
    }

    if (isYouTubeUrl(form.mediaUrl)) {
      const embedUrl = getYouTubeEmbedUrl(form.mediaUrl);
      if (embedUrl) {
        return (
          <iframe
            src={embedUrl}
            className="w-full aspect-video rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube preview"
          />
        );
      }
    }

    if (form.mediaType === "video") {
      return (
        <video
          src={form.mediaUrl}
          controls
          className="w-full rounded max-h-80"
          preload="metadata"
        />
      );
    }

    return (
      <img
        src={form.mediaUrl}
        alt="Preview"
        className="w-full rounded max-h-80 object-contain"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    );
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
            onClick={() => navigate("/ad-campaigns")}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isEdit ? "Edit Ad Campaign" : "Tambah Ad Campaign"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? `Mengedit: ${form.title || form.id}`
                : "Buat iklan baru untuk pengguna non-VIP"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form ─────────────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardBody className="space-y-5">
            {/* Sponsor Name */}
            <div>
              <label className={labelClass}>
                Sponsor Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Split Bill VIP"
                value={form.sponsorName}
                onChange={(e) => handleField("sponsorName", e.target.value)}
              />
            </div>

            {/* Title */}
            <div>
              <label className={labelClass}>Judul Iklan</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Keuntungan Menjadi VIP 🌟"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            {/* Slug / ID */}
            <div>
              <label className={labelClass}>
                Campaign ID (slug) <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — digunakan sebagai identifier unik
                </span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="premium-membership-ad"
                  value={form.id}
                  onChange={(e) =>
                    handleField("id", slugify(e.target.value))
                  }
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

            {/* Description */}
            <div>
              <label className={labelClass}>Deskripsi</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="Deskripsi singkat iklan..."
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
              />
            </div>

            {/* Media Type */}
            <div>
              <label className={labelClass}>Tipe Media</label>
              <div className="flex gap-2">
                {["video", "image"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleField("mediaType", type)}
                    disabled={isYouTubeUrl(form.mediaUrl)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm border transition-all ${form.mediaType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {type === "video" ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    {type === "video" ? "Video" : "Image"}
                  </button>
                ))}
                {isYouTubeUrl(form.mediaUrl) && (
                  <span className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 font-medium border border-red-200 bg-red-50 rounded-sm">
                    <Youtube className="h-4 w-4" /> YouTube (auto)
                  </span>
                )}
              </div>
            </div>

            {/* Media URL */}
            <div>
              <label className={labelClass}>
                Media URL <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — blob URL, external URL, atau YouTube link
                </span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="https://storage.example.com/ads/video.mp4 atau https://youtu.be/..."
                value={form.mediaUrl}
                onChange={(e) => handleField("mediaUrl", e.target.value)}
              />
              {isYouTubeUrl(form.mediaUrl) && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <Youtube className="h-3 w-3" /> YouTube link terdeteksi — akan
                  diembed sebagai video
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>CTA Text</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Upgrade ke VIP"
                  value={form.ctaText}
                  onChange={(e) => handleField("ctaText", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>CTA URL</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="/subscription"
                  value={form.ctaUrl}
                  onChange={(e) => handleField("ctaUrl", e.target.value)}
                />
              </div>
            </div>

            {/* Duration & Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Durasi (detik)</label>
                <input
                  type="number"
                  className={inputClass}
                  min={1}
                  value={form.durationSeconds}
                  onChange={(e) =>
                    handleField("durationSeconds", Number(e.target.value))
                  }
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
                  onChange={(e) =>
                    handleField("order", Number(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Status Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Ad akan ditampilkan ke pengguna jika aktif
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
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? "translate-x-4.5" : "translate-x-0"
                    }`}
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
              onClick={() => navigate("/ad-campaigns")}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              onClick={handleSave}
            >
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Ad Campaign"}
            </Button>
          </CardFooter>
        </Card>

        {/* ── Preview Panel ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <p className="text-sm font-semibold text-foreground">Preview Media</p>
              <button
                onClick={() => setPreviewVisible((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle preview"
              >
                {previewVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {previewVisible && (
              <CardBody className="pt-3">{renderPreview()}</CardBody>
            )}
          </Card>

          {/* Ad info summary */}
          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Ringkasan</p>
              <div className="space-y-2 text-xs">
                {[
                  { label: "ID", value: form.id || "—" },
                  { label: "Sponsor", value: form.sponsorName || "—" },
                  { label: "Tipe", value: isYouTubeUrl(form.mediaUrl) ? "YouTube" : form.mediaType },
                  { label: "Durasi", value: `${form.durationSeconds}s` },
                  { label: "Urutan", value: form.order },
                  {
                    label: "Status",
                    value: form.isActive ? (
                      <span className="text-green-600 font-semibold">Aktif</span>
                    ) : (
                      <span className="text-muted-foreground">Nonaktif</span>
                    ),
                  },
                  ...(form.ctaText
                    ? [{ label: "CTA", value: `${form.ctaText} → ${form.ctaUrl || "#"}` }]
                    : []),
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
