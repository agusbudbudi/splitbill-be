import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, HelpCircle, Download } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  Card,
  CardBody,
  Button,
  Badge,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Checkbox,
  SearchInput,
  EmptyState,
  useToast,
} from "../components/ui";

// Mirrors FAQ_CATEGORIES (lib/faqDefaults.js) and faqCategoryLabels in splitbill-web.
const CATEGORY_LABELS = {
  umum: "Umum",
  "split-bill": "Split Bill",
  "split-later": "Split Later",
  "split-bill-liburan": "Split Bill Liburan",
  invoice: "Invoice",
  "shared-goals": "Shared Goals",
  "collect-money": "Collect Money",
  wallet: "Wallet",
  akun: "Akun",
  privasi: "Privasi",
};

const EMPTY_FORM = { question: "", answer: "", category: "umum", showOnLanding: false, isActive: true };

const inputClass =
  "block w-full px-3 py-2 text-sm rounded-xs border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all";
const labelClass = "block text-sm font-medium text-foreground mb-1";
const iconButtonClass =
  "p-1.5 rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none";

function revalidateToast(toast, data, okMessage) {
  toast({
    message: data.revalidated ? okMessage : `${okMessage}. Tampil di web maksimal 1 jam lagi`,
    type: data.revalidated ? "success" : "warning",
  });
}

export default function Faqs() {
  usePageMeta("FAQ", "Kelola pertanyaan yang tampil di homepage, halaman FAQ, dan halaman fitur.");
  const toast = useToast();

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | faq
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/faqs?admin=true");
      const data = await res.json();
      if (data.success) setFaqs(data.data);
      else toast({ message: data.error || "Gagal memuat FAQ", type: "error" });
    } catch {
      toast({ message: "Gagal memuat FAQ", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const request = async (url, options, okMessage) => {
    setBusy(true);
    try {
      const res = await apiFetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", ...options?.headers },
      });
      const data = await res.json();
      if (!data.success) {
        toast({ message: data.error || "Terjadi kesalahan", type: "error" });
        return false;
      }
      revalidateToast(toast, data, data.message || okMessage);
      await load();
      return true;
    } catch {
      toast({ message: "Terjadi kesalahan. Coba lagi.", type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (faq) => {
    setEditing(faq || "new");
    setForm(
      faq
        ? {
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            showOnLanding: faq.showOnLanding,
            isActive: faq.isActive,
          }
        : EMPTY_FORM,
    );
  };

  const handleSave = async () => {
    const isNew = editing === "new";
    const ok = await request(
      isNew ? "/api/faqs" : `/api/faqs/${editing._id}`,
      { method: isNew ? "POST" : "PUT", body: JSON.stringify(form) },
      isNew ? "FAQ dibuat" : "FAQ tersimpan",
    );
    if (ok) setEditing(null);
  };

  const toggle = (faq, field) =>
    request(`/api/faqs/${faq._id}`, { method: "PUT", body: JSON.stringify({ [field]: !faq[field] }) }, "FAQ tersimpan");

  // Moves within the full list; with a filter active, the FAQ swaps places with
  // the neighbor visible in the filtered view.
  const moveFaq = (faq, direction, visible) => {
    const visibleIndex = visible.findIndex((f) => f._id === faq._id);
    const neighbor = visible[visibleIndex + direction];
    if (!neighbor) return;
    const ids = faqs.map((f) => f._id);
    const a = ids.indexOf(faq._id);
    const b = ids.indexOf(neighbor._id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    request("/api/faqs/reorder", { method: "POST", body: JSON.stringify({ ids }) }, "Urutan tersimpan");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const visible = faqs.filter(
    (f) =>
      (!category || f.category === category) &&
      (!query || f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)),
  );
  const landingCount = faqs.filter((f) => f.isActive && f.showOnLanding).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">FAQ</h1>
          <p className="text-xs text-muted-foreground">
            {faqs.length} FAQ · {landingCount} tampil di homepage. Perubahan langsung live.
          </p>
        </div>
        {faqs.length > 0 && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openEditor(null)} disabled={busy}>
            Tambah FAQ
          </Button>
        )}
      </div>

      {faqs.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={HelpCircle}
              title="Belum ada FAQ di CMS"
              description="Web masih memakai FAQ bawaan. Import dulu supaya bisa diedit dari sini tanpa ada yang hilang dari web."
              action={
                <Button
                  icon={<Download className="h-4 w-4" />}
                  loading={busy}
                  disabled={busy}
                  onClick={() => request("/api/faqs/import-defaults", { method: "POST" }, "FAQ bawaan diimport")}
                >
                  Import FAQ bawaan
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari pertanyaan atau jawaban..." className="flex-1" />
              <div className="sm:w-56">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Semua kategori</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="divide-y divide-border">
              {visible.map((faq, i) => (
                <div key={faq._id} className={`flex gap-3 py-3 ${faq.isActive ? "" : "opacity-50"}`}>
                  <div className="flex flex-col">
                    <button type="button" className={iconButtonClass} disabled={busy || i === 0} onClick={() => moveFaq(faq, -1, visible)} title="Naikkan">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={iconButtonClass}
                      disabled={busy || i === visible.length - 1}
                      onClick={() => moveFaq(faq, 1, visible)}
                      title="Turunkan"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{faq.question}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{faq.answer}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge>{CATEGORY_LABELS[faq.category] || faq.category}</Badge>
                      {faq.showOnLanding && <Badge variant="info">Homepage</Badge>}
                      {!faq.isActive && <Badge variant="warning">Nonaktif</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-start gap-2 flex-shrink-0">
                    <Checkbox label="Homepage" checked={faq.showOnLanding} disabled={busy} onChange={() => toggle(faq, "showOnLanding")} />
                    <Checkbox label="Aktif" checked={faq.isActive} disabled={busy} onChange={() => toggle(faq, "isActive")} />
                    <div className="flex">
                      <button type="button" className={iconButtonClass} onClick={() => openEditor(faq)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className={`${iconButtonClass} hover:text-destructive`} onClick={() => setDeleting(faq)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada FAQ yang cocok.</p>}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Tambah FAQ" : "Edit FAQ"} size="lg">
        <ModalBody className="space-y-4">
          <div>
            <label className={labelClass}>
              Pertanyaan <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              className={inputClass}
              maxLength={200}
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className={labelClass}>
                Jawaban <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground tabular-nums">{form.answer.length}/2000</span>
            </div>
            <textarea
              rows={6}
              className={`${inputClass} resize-y`}
              maxLength={2000}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Jawaban juga masuk ke structured data FAQ untuk Google, tulis lengkap dan jelas.
            </p>
          </div>
          <Select label="Kategori" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="flex gap-6">
            <Checkbox
              label="Tampil di homepage"
              checked={form.showOnLanding}
              onChange={(e) => setForm((f) => ({ ...f, showOnLanding: e.target.checked }))}
            />
            <Checkbox label="Aktif" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          </div>
        </ModalBody>
        <ModalFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>
            Batal
          </Button>
          <Button loading={busy} disabled={busy || !form.question.trim() || !form.answer.trim()} onClick={handleSave}>
            Simpan
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={deleting !== null} onClose={() => setDeleting(null)} title="Hapus FAQ?" size="sm">
        <ModalBody>
          <p className="text-sm text-foreground">{deleting?.question}</p>
          <p className="text-xs text-muted-foreground mt-2">FAQ langsung hilang dari web. Untuk sembunyikan sementara, pakai &quot;Aktif&quot;.</p>
        </ModalBody>
        <ModalFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Batal
          </Button>
          <Button
            variant="danger"
            loading={busy}
            disabled={busy}
            onClick={async () => {
              const ok = await request(`/api/faqs/${deleting._id}`, { method: "DELETE" }, "FAQ dihapus");
              if (ok) setDeleting(null);
            }}
          >
            Hapus
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
