import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Plus,
  Pencil,
  Trash2,
  Award,
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

const METRIC_LABELS = {
  splitCount: "Jumlah split",
  totalAmount: "Total nominal",
  friendCount: "Jumlah teman",
};

function formatRule(rule) {
  const label = METRIC_LABELS[rule.metric] || rule.metric;
  const value =
    rule.metric === "totalAmount"
      ? `Rp${Number(rule.value).toLocaleString("id-ID")}`
      : rule.value;
  return `${label} ${rule.operator} ${value}`;
}

export default function UserLevels() {
  usePageMeta(
    "Manajemen User Level",
    "Atur jenjang level gamifikasi user berdasarkan history split bill yang sudah finalize."
  );

  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/levels?includeInactive=true");
      const data = await res.json();
      if (data.success) {
        setLevels(data.data || []);
      } else {
        toast({ message: data.error || "Gagal memuat data level", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan saat memuat data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (level) => {
    setTogglingId(level._id);
    try {
      const res = await apiFetch(`/api/levels/${level._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !level.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setLevels((prev) =>
          prev.map((l) => (l._id === level._id ? data.data : l))
        );
        toast({
          message: `Level "${level.name}" ${!level.isActive ? "diaktifkan" : "dinonaktifkan"}`,
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
      const res = await apiFetch(`/api/levels/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setLevels((prev) => prev.filter((l) => l._id !== deleteTarget._id));
        toast({ message: "Level berhasil dihapus", type: "success" });
      } else {
        toast({ message: data.error || "Gagal menghapus level", type: "error" });
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

  const sortedLevels = [...levels].sort((a, b) => b.order - a.order);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">User Level</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur jenjang level gamifikasi berdasarkan history split bill yang sudah finalize.
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate("/user-levels/new")}
          className="flex-shrink-0"
        >
          Tambah Level
        </Button>
      </div>

      {/* Level list */}
      {sortedLevels.length === 0 ? (
        <Card>
          <EmptyState
            icon={Award}
            title="Belum ada user level"
            description="Buat level pertama untuk sistem gamifikasi split bill."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                size="sm"
                onClick={() => navigate("/user-levels/new")}
              >
                Tambah Level
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedLevels.map((level) => (
            <Card key={level._id} className="overflow-hidden flex flex-col">
              <CardBody className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {level.icon ? (
                      <img
                        src={level.icon}
                        alt={level.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <Award className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {level.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Order: {level.order}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      level.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {level.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(level.rules || []).map((rule, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {formatRule(rule)}
                    </span>
                  ))}
                </div>
              </CardBody>

              <CardFooter className="py-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleActive(level)}
                  disabled={togglingId === level._id}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title={level.isActive ? "Nonaktifkan" : "Aktifkan"}
                >
                  {level.isActive ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                  {togglingId === level._id ? "..." : level.isActive ? "Aktif" : "Nonaktif"}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/user-levels/${level._id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleteTarget(level)}
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
        title="Hapus User Level"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus level{" "}
            <strong className="text-foreground">&quot;{deleteTarget?.name}&quot;</strong>?
            User yang sedang berada di level ini otomatis dievaluasi ulang ke level lain.
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
