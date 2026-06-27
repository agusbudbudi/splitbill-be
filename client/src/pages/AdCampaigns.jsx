import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Image as ImageIcon,
  Video,
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

export default function AdCampaigns() {
  usePageMeta(
    "Manajemen Ad Campaigns",
    "Atur iklan yang ditampilkan ke pengguna non-VIP."
  );

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/ad-campaigns?admin=true");
      const data = await res.json();
      if (data.success) {
        setAds(data.data || []);
      } else {
        toast({ message: data.error || "Gagal memuat ad campaigns", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan saat memuat data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ad) => {
    setTogglingId(ad._id);
    try {
      const res = await apiFetch(`/api/ad-campaigns/${ad._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setAds((prev) =>
          prev.map((a) => (a._id === ad._id ? data.data : a))
        );
        toast({
          message: `Ad "${ad.title || ad.id}" ${!ad.isActive ? "diaktifkan" : "dinonaktifkan"}`,
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
      const res = await apiFetch(`/api/ad-campaigns/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setAds((prev) => prev.filter((a) => a._id !== deleteTarget._id));
        toast({ message: "Ad campaign berhasil dihapus", type: "success" });
      } else {
        toast({ message: data.error || "Gagal menghapus ad", type: "error" });
      }
    } catch {
      toast({ message: "Terjadi kesalahan", type: "error" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const isYouTube = (url) =>
    url && (url.includes("youtube.com") || url.includes("youtu.be"));

  const getYouTubeThumbnail = (url) => {
    try {
      let videoId = null;
      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
      } else {
        videoId = new URL(url).searchParams.get("v");
      }
      return videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : null;
    } catch {
      return null;
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
          <h1 className="text-xl font-bold text-foreground">Ad Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola iklan yang ditampilkan kepada pengguna non-VIP.
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate("/ad-campaigns/new")}
          className="flex-shrink-0"
        >
          Tambah Ad
        </Button>
      </div>

      {/* Stats bar */}
      {ads.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Total:{" "}
            <span className="font-semibold text-foreground">{ads.length}</span>
          </span>
          <span className="text-muted-foreground">
            Aktif:{" "}
            <span className="font-semibold text-green-600">
              {ads.filter((a) => a.isActive).length}
            </span>
          </span>
          <span className="text-muted-foreground">
            Nonaktif:{" "}
            <span className="font-semibold text-muted-foreground">
              {ads.filter((a) => !a.isActive).length}
            </span>
          </span>
        </div>
      )}

      {/* Ad grid */}
      {ads.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="Belum ada ad campaign"
            description="Buat ad campaign pertama untuk ditampilkan ke pengguna non-VIP."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                size="sm"
                onClick={() => navigate("/ad-campaigns/new")}
              >
                Tambah Ad
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ads.map((ad) => {
            const ytThumb = isYouTube(ad.mediaUrl)
              ? getYouTubeThumbnail(ad.mediaUrl)
              : null;

            return (
              <Card key={ad._id} className="overflow-hidden flex flex-col">
                {/* Media preview */}
                <div
                  className="w-full h-40 bg-muted flex items-center justify-center relative overflow-hidden flex-shrink-0"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {ytThumb ? (
                    <img
                      src={ytThumb}
                      alt={ad.title || ad.id}
                      className="w-full h-full object-cover"
                    />
                  ) : ad.mediaType === "image" && ad.mediaUrl ? (
                    <img
                      src={ad.mediaUrl}
                      alt={ad.title || ad.id}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : ad.mediaType === "video" && ad.mediaUrl ? (
                    <video
                      src={ad.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {ad.mediaType === "video" ? (
                        <Video className="h-8 w-8" />
                      ) : (
                        <ImageIcon className="h-8 w-8" />
                      )}
                      <span className="text-xs">Preview tidak tersedia</span>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ad.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ad.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  {/* Media type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white flex items-center gap-1">
                      {isYouTube(ad.mediaUrl) ? (
                        "YouTube"
                      ) : ad.mediaType === "video" ? (
                        <>
                          <Video className="h-2.5 w-2.5" /> Video
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-2.5 w-2.5" /> Image
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <CardBody className="space-y-2 flex-1">
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-snug line-clamp-1">
                      {ad.title || ad.id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ad.sponsorName}
                    </p>
                  </div>

                  {ad.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {ad.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>⏱ {ad.durationSeconds}s</span>
                    {ad.ctaText && (
                      <span className="truncate">🔗 {ad.ctaText}</span>
                    )}
                    <span className="ml-auto text-[10px] opacity-60">
                      #{ad.id}
                    </span>
                  </div>
                </CardBody>

                <CardFooter className="py-3 flex items-center justify-between gap-2">
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(ad)}
                    disabled={togglingId === ad._id}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title={ad.isActive ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {ad.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                    {togglingId === ad._id ? "..." : ad.isActive ? "Aktif" : "Nonaktif"}
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => navigate(`/ad-campaigns/${ad._id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setDeleteTarget(ad)}
                    >
                      Hapus
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Ad Campaign"
        size="sm"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus ad{" "}
            <strong className="text-foreground">
              &quot;{deleteTarget?.title || deleteTarget?.id}&quot;
            </strong>
            ? Tindakan ini tidak dapat dibatalkan.
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
