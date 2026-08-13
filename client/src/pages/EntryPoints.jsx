import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Plus,
  Pencil,
  Trash2,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Modal,
  ModalFooter,
  EmptyState,
  useToast,
} from "../components/ui";

export default function EntryPoints() {
  usePageMeta(
    "Manajemen Entry Point Cards",
    "Atur kartu entry point multipurpose yang tampil di homepage member."
  );

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/entry-points?admin=true");
      const data = await res.json();
      if (data.success) {
        setCards(data.data || []);
      } else {
        toast({ message: data.error || "Gagal memuat entry point cards", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan saat memuat data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (card) => {
    setTogglingId(card._id);
    try {
      const res = await apiFetch(`/api/entry-points/${card._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !card.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setCards((prev) =>
          prev.map((c) => (c._id === card._id ? data.data : c))
        );
        toast({
          message: `Card "${card.title}" ${!card.isActive ? "diaktifkan" : "dinonaktifkan"}`,
          type: "success",
        });
      } else {
        toast({ message: data.error || "Gagal mengubah status", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan", type: "error" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/entry-points/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCards((prev) => prev.filter((c) => c._id !== deleteTarget._id));
        toast({ message: "Entry point card berhasil dihapus", type: "success" });
      } else {
        toast({ message: data.error || "Gagal menghapus card", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan", type: "error" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Entry Point Cards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola kartu entry point multipurpose di homepage member (review, save friend, promo, dll).
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate("/entry-points/new")}
          className="flex-shrink-0"
        >
          Tambah Card
        </Button>
      </div>

      {/* Stats bar */}
      {cards.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Total:{" "}
            <span className="font-semibold text-foreground">{cards.length}</span>
          </span>
          <span className="text-muted-foreground">
            Aktif:{" "}
            <span className="font-semibold text-green-600">
              {cards.filter((c) => c.isActive).length}
            </span>
          </span>
          <span className="text-muted-foreground">
            Nonaktif:{" "}
            <span className="font-semibold text-muted-foreground">
              {cards.filter((c) => !c.isActive).length}
            </span>
          </span>
        </div>
      )}

      {/* Card grid */}
      {cards.length === 0 ? (
        <Card>
          <EmptyState
            icon={LayoutGrid}
            title="Belum ada entry point card"
            description="Buat entry point card pertama untuk ditampilkan di homepage member."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                size="sm"
                onClick={() => navigate("/entry-points/new")}
              >
                Tambah Card
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {cards.map((card) => (
            <Card key={card._id} className="overflow-hidden flex flex-col">
              {/* Thumbnail preview */}
              <div
                className="relative w-full aspect-square bg-muted overflow-hidden flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <img
                  src={card.imageUrl}
                  alt={card.imageAlt}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />

                {card.ribbonText && (
                  <span className="absolute bottom-0 left-0 rounded-tr-sm bg-gradient-to-r from-violet-400 via-pink-400 to-primary/70 px-2 py-1 text-[10px] font-black uppercase leading-none tracking-wide text-white shadow-sm">
                    {card.ribbonText}
                  </span>
                )}

                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      card.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {card.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>

              <CardBody className="space-y-2 flex-1">
                <div>
                  <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                    {card.title}
                  </p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {card.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                  {card.ctaText && <span className="truncate">🔗 {card.ctaText}</span>}
                  {card.footerText && (
                    <span className="truncate">ℹ️ {card.footerText}</span>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground/70">
                  {card.placement} · urutan {card.order} · #{card.slug}
                </p>
              </CardBody>

              <CardFooter className="py-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleActive(card)}
                  disabled={togglingId === card._id}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title={card.isActive ? "Nonaktifkan" : "Aktifkan"}
                >
                  {card.isActive ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                  {togglingId === card._id ? "..." : card.isActive ? "Aktif" : "Nonaktif"}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/entry-points/${card._id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleteTarget(card)}
                  >
                    Hapus
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Entry Point Card"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus card{" "}
            <strong className="text-foreground">&quot;{deleteTarget?.title}&quot;</strong>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            size="md"
            loading={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
