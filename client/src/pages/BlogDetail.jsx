import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  Save,
  Globe,
  FileText,
  Tag,
  User,
  Image as ImageIcon,
  Link2,
  Search,
  Eye,
  Loader2,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Unlink,
  ExternalLink,
} from "lucide-react";
import { Button, Spinner, useToast, Badge } from "../components/ui";
import { apiFetch } from "../lib/api";

// ─── Slug Generator ───────────────────────────────────────────────────────────
function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Character Counter ────────────────────────────────────────────────────────
function CharCounter({ value = "", max, label }) {
  const len = value.length;
  const pct = len / max;
  const color =
    pct >= 1 ? "text-red-500" : pct >= 0.85 ? "text-amber-500" : "text-muted-foreground";
  return (
    <span className={`text-[10px] font-mono ${color}`}>
      {len}/{max}
    </span>
  );
}

// ─── Google SERP Preview ──────────────────────────────────────────────────────
function SerpPreview({ title, slug, description }) {
  const displayTitle = title || "Judul Artikel";
  const displayUrl = `splitbill.my.id › blog › ${slug || "url-artikel"}`;
  const displayDesc = description || "Deskripsi artikel akan muncul di sini untuk preview Google...";

  return (
    <div className="rounded-lg border border-border bg-white p-4 space-y-1 font-sans">
      <p className="text-[11px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider flex items-center gap-1">
        <Search size={10} /> Google SERP Preview
      </p>
      <p className="text-[13px] text-[#1a0dab] font-medium leading-snug line-clamp-1">
        {displayTitle}
      </p>
      <p className="text-[11px] text-[#006621]">{displayUrl}</p>
      <p className="text-[12px] text-[#545454] leading-relaxed line-clamp-2">
        {displayDesc}
      </p>
    </div>
  );
}

// ─── TipTap Toolbar ───────────────────────────────────────────────────────────
function EditorToolbar({ editor }) {
  if (!editor) return null;

  const addLink = () => {
    const url = prompt("Masukkan URL:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
  };

  const addImage = () => {
    const url = prompt("Masukkan URL gambar:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const tools = [
    {
      icon: Bold,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      icon: Italic,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    { separator: true },
    {
      icon: Heading2,
      title: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      title: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
    { separator: true },
    {
      icon: List,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      title: "Numbered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      icon: Quote,
      title: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
    {
      icon: Minus,
      title: "Horizontal Rule",
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
    },
    { separator: true },
    { icon: Link2, title: "Tambah Link", action: addLink, active: editor.isActive("link") },
    {
      icon: Unlink,
      title: "Hapus Link",
      action: () => editor.chain().focus().unsetLink().run(),
      active: false,
      disabled: !editor.isActive("link"),
    },
    { icon: ImageIcon, title: "Tambah Gambar", action: addImage, active: false },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/40">
      {tools.map((tool, i) => {
        if (tool.separator) {
          return <div key={`sep-${i}`} className="w-px h-5 bg-border mx-1" />;
        }
        const Icon = tool.icon;
        return (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            disabled={tool.disabled}
            onClick={tool.action}
            className={`p-1.5 rounded text-sm transition-colors ${
              tool.active
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
        <Icon size={12} className="text-primary" />
      </div>
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Form Field Wrapper ───────────────────────────────────────────────────────
function Field({ label, hint, children, counter }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {counter}
      </div>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const contentLoaded = useRef(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    thumbnail: "",
    thumbnailAlt: "",
    author: "",
    category: "",
    tags: "", // comma-separated string in UI
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    status: "draft",
  });

  // ─── TipTap Editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder: "Tulis konten artikel di sini...",
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setForm((prev) => ({ ...prev, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[320px] p-4 focus:outline-none text-foreground",
      },
    },
  });

  // ─── Load existing blog ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/blogs/${id}`);
        const json = await res.json();
        if (json.success) {
          const b = json.data;
          const loadedForm = {
            title: b.title || "",
            slug: b.slug || "",
            excerpt: b.excerpt || "",
            content: b.content || "",
            thumbnail: b.thumbnail || "",
            thumbnailAlt: b.thumbnailAlt || "",
            author: b.author || "",
            category: b.category || "",
            tags: Array.isArray(b.tags) ? b.tags.join(", ") : "",
            metaTitle: b.metaTitle || "",
            metaDescription: b.metaDescription || "",
            canonicalUrl: b.canonicalUrl || "",
            status: b.status || "draft",
          };
          setForm(loadedForm);
          setSlugEdited(true);
          
          // If editor is already initialized, set content immediately
          if (editor && b.content && !contentLoaded.current) {
            editor.commands.setContent(b.content);
            contentLoaded.current = true;
          }
        }
      } catch (err) {
        toast({ title: "Error", message: "Gagal memuat artikel", type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, editor]);

  // Fallback: If editor initialized AFTER data was fetched
  useEffect(() => {
    if (editor && form.content && !isNew && !contentLoaded.current) {
      editor.commands.setContent(form.content);
      contentLoaded.current = true;
    }
  }, [editor, form.content, isNew]);

  // ─── Auto-generate slug from title ─────────────────────────────────────────
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      title: val,
      ...(slugEdited ? {} : { slug: toSlug(val) }),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugEdited(true);
    setForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }));
  };

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // ─── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (statusOverride) => {
    if (!form.title.trim()) {
      toast({ title: "Validasi", message: "Judul artikel wajib diisi", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: statusOverride || form.status,
      };

      let res;
      if (isNew) {
        res = await apiFetch("/api/blogs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch(`/api/blogs/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Tersimpan",
          message: `Artikel berhasil ${statusOverride === "published" ? "dipublish" : "disimpan"}`,
          type: "success",
        });
        if (isNew) navigate(`/blogs/${json.data._id}`);
        else setForm((prev) => ({ ...prev, status: json.data.status }));
      } else {
        toast({ title: "Gagal", message: json.error || "Gagal menyimpan", type: "error" });
      }
    } catch {
      toast({ title: "Error", message: "Kesalahan saat menyimpan", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived SEO values ─────────────────────────────────────────────────────
  const serpTitle = form.metaTitle || form.title;
  const serpDesc = form.metaDescription || form.excerpt;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat artikel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/blogs")}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {isNew ? "Buat Artikel Baru" : "Edit Artikel"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant={form.status === "published" ? "success" : "warning"}
                className="text-[10px] uppercase font-bold"
              >
                {form.status}
              </Badge>
              {!isNew && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  /blog/{form.slug}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={saving}
            leftIcon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          >
            Simpan Draft
          </Button>
          <Button
            onClick={() => handleSave("published")}
            disabled={saving}
            leftIcon={<Globe size={16} />}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        {/* ── Left Column: Content ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Title & Slug */}
          <div className="bg-white border border-border rounded-lg p-5 space-y-4">
            <SectionLabel icon={FileText} label="Konten Artikel" />

            <Field label="Judul Artikel *">
              <input
                type="text"
                value={form.title}
                onChange={handleTitleChange}
                placeholder="Masukkan judul artikel..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </Field>

            <Field
              label="Slug (URL)"
              hint="Auto-generate dari judul. Hanya boleh huruf kecil, angka, dan tanda '-'."
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  /blog/
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={handleSlugChange}
                  placeholder="url-artikel-anda"
                  className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-mono text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </Field>

            <Field
              label="Excerpt (Ringkasan)"
              hint="Tampil di listing blog & sebagai fallback meta description."
              counter={<CharCounter value={form.excerpt} max={160} />}
            >
              <textarea
                rows={3}
                value={form.excerpt}
                onChange={set("excerpt")}
                maxLength={160}
                placeholder="Tuliskan ringkasan singkat artikel ini..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
            </Field>
          </div>

          {/* Rich Text Editor */}
          <div className="bg-white border border-border rounded-lg overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <SectionLabel icon={FileText} label="Isi Artikel" />
            </div>
            <EditorToolbar editor={editor} />
            <div className="min-h-[320px] cursor-text">
              <EditorContent editor={editor} />
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Format: Rich HTML · TipTap Editor
              </span>
              {form.content && (
                <span className="text-[10px] text-muted-foreground">
                  ≈ {Math.max(1, Math.ceil(form.content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length / 200))} min baca
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail */}
          <div className="bg-white border border-border rounded-lg p-5 space-y-4">
            <SectionLabel icon={ImageIcon} label="Thumbnail" />

            <Field label="URL Thumbnail">
              <input
                type="text"
                value={form.thumbnail}
                onChange={set("thumbnail")}
                placeholder="https://example.com/gambar.jpg"
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </Field>

            {form.thumbnail && (
              <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-[16/9] max-h-56">
                <img
                  src={form.thumbnail}
                  alt={form.thumbnailAlt || "Thumbnail preview"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}

            <Field
              label="Alt Text Thumbnail"
              hint="Deskripsi gambar untuk aksesibilitas & SEO image search."
            >
              <input
                type="text"
                value={form.thumbnailAlt}
                onChange={set("thumbnailAlt")}
                placeholder="Deskripsi gambar thumbnail..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </Field>
          </div>
        </div>

        {/* ── Right Column: SEO & Metadata ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Publish settings */}
          <div className="bg-white border border-border rounded-lg p-5 space-y-4">
            <SectionLabel icon={Globe} label="Status Publish" />
            <div className="flex rounded-md border border-border overflow-hidden">
              {["draft", "published"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors capitalize ${
                    form.status === s
                      ? s === "published"
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s === "published" ? "📢 Published" : "📝 Draft"}
                </button>
              ))}
            </div>
          </div>

          {/* Author & Category */}
          <div className="bg-white border border-border rounded-lg p-5 space-y-4">
            <SectionLabel icon={User} label="Penulis & Kategori" />

            <Field label="Penulis">
              <input
                type="text"
                value={form.author}
                onChange={set("author")}
                placeholder="Nama penulis..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </Field>

            <Field label="Kategori">
              <input
                type="text"
                value={form.category}
                onChange={set("category")}
                placeholder="Tips, Tutorial, Promo, ..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </Field>

            <Field label="Tags / Keywords" hint="Pisahkan dengan koma. Contoh: split bill, hemat, tips">
              <input
                type="text"
                value={form.tags}
                onChange={set("tags")}
                placeholder="tag1, tag2, tag3"
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              {form.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.split(",").filter((t) => t.trim()).map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold"
                    >
                      <Tag size={9} />
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          {/* SEO Meta */}
          <div className="bg-white border border-border rounded-lg p-5 space-y-4">
            <SectionLabel icon={Search} label="SEO Optimization" />

            <Field
              label="Meta Title"
              hint="Jika kosong, judul artikel digunakan. Ideal: 50-60 karakter."
              counter={<CharCounter value={form.metaTitle} max={60} />}
            >
              <input
                type="text"
                value={form.metaTitle}
                onChange={set("metaTitle")}
                maxLength={60}
                placeholder={form.title || "Meta title untuk Google..."}
                className={`w-full rounded-md border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                  form.metaTitle.length > 60 ? "border-red-400" : "border-border focus:border-primary"
                }`}
              />
            </Field>

            <Field
              label="Meta Description"
              hint="Jika kosong, excerpt digunakan. Ideal: 120-160 karakter."
              counter={<CharCounter value={form.metaDescription} max={160} />}
            >
              <textarea
                rows={3}
                value={form.metaDescription}
                onChange={set("metaDescription")}
                maxLength={160}
                placeholder={form.excerpt || "Meta description untuk Google..."}
                className={`w-full rounded-md border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none ${
                  form.metaDescription.length > 160 ? "border-red-400" : "border-border focus:border-primary"
                }`}
              />
            </Field>

            <Field label="Canonical URL" hint="Opsional. Isi jika konten ini di-republish dari sumber lain.">
              <div className="relative">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={form.canonicalUrl}
                  onChange={set("canonicalUrl")}
                  placeholder="https://sumber-asli.com/artikel"
                  className="w-full rounded-md border border-border pl-8 pr-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </Field>

            {/* SERP Preview */}
            <SerpPreview
              title={serpTitle}
              slug={form.slug}
              description={serpDesc}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
