import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Mail,
  Plus,
  Send,
  Clock,
  RefreshCw,
  MoreHorizontal,
  X,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Spinner,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
  useToast,
} from "../components/ui";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/utils";

const SEGMENT_OPTIONS = [
  { id: "all", label: "Semua User", color: "bg-blue-500" },
  { id: "unverified", label: "Belum Verifikasi", color: "bg-amber-500" },
  { id: "free", label: "Pengguna Gratis", color: "bg-slate-500" },
  {
    id: "free_scan_exhausted",
    label: "Kuota Gratis Habis",
    color: "bg-orange-500",
  },
  { id: "inactive_30d", label: "Tidak Aktif > 30 Hari", color: "bg-red-500" },
  { id: "premium", label: "Pengguna Premium", color: "bg-emerald-500" },
  {
    id: "no_split_bill",
    label: "Belum Pernah Split Bill",
    color: "bg-pink-500",
  },
];

export default function Campaigns() {
  usePageMeta(
    "Email Campaigns",
    "Kelola dan kirim pesan pemasaran tersegmentasi ke pengguna.",
  );

  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/campaigns");
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.data);
      } else {
        setError(json.error || "Gagal memuat data kampanye");
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateDraft = async () => {
    setCreating(true);
    try {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ initializeDraft: true }),
      });
      const json = await res.json();
      if (json.success) {
        navigate(`/campaigns/${json.data._id}`);
      } else {
        toast({
          title: "Gagal",
          message: "Gagal membuat draft baru",
          type: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        message: "Kesalahan saat membuat draft",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/campaigns/${id}`);
  };

  const handleDeleteDraft = async (id) => {
    if (!confirm("Hapus draft ini?")) return;
    try {
      const res = await apiFetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Terhapus",
          message: "Draft berhasil dihapus",
          type: "success",
        });
        fetchCampaigns();
      }
    } catch (err) {
      toast({
        title: "Error",
        message: "Gagal menghapus draft",
        type: "error",
      });
    }
  };

  const handleSendDraft = async (id) => {
    if (!confirm("Kirim draft ini sekarang?")) return;
    try {
      const res = await apiFetch(`/api/campaigns/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Terkirim",
          message: "Draft berhasil dikirim",
          type: "success",
        });
        fetchCampaigns();
      }
    } catch (err) {
      toast({ title: "Error", message: "Gagal mengirim draft", type: "error" });
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data kampanye...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola pengiriman email blast ke pengguna secara tersegmen.
          </p>
        </div>
        <Button
          onClick={handleCreateDraft}
          disabled={creating}
          isLoading={creating}
          leftIcon={<Plus size={18} />}
        >
          Buat Kampanye
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Riwayat Kampanye
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Log pengiriman campaign sebelumnya
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCampaigns}
            className="text-muted-foreground hover:text-primary"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-2 text-xs">Refresh</span>
          </Button>
        </CardHeader>
        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Kampanye</Th>
              <Th>Segmen</Th>
              <Th className="text-center">Status</Th>
              <Th className="text-center">Total Target</Th>
              <Th>Tanggal Kirim</Th>
              <Th className="text-right"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {campaigns.length === 0 ? (
              <Tr className="hover:bg-transparent">
                <Td colSpan={6} className="p-0">
                  <EmptyState
                    icon={Mail}
                    title="Belum ada kampanye"
                    description="Kampanye yang Anda kirim akan muncul riwayatnya di sini."
                  />
                </Td>
              </Tr>
            ) : (
              campaigns.map((c) => (
                <Tr key={c._id}>
                  <Td>
                    <div className="font-bold text-sm text-foreground">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
                      {c.subject}
                    </div>
                  </Td>
                  <Td>
                    <Badge
                      variant="outline"
                      className="capitalize text-[10px] font-medium flex items-center gap-1.5 w-fit"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${SEGMENT_OPTIONS.find((o) => o.id === c.segment)?.color || "bg-gray-500"}`}
                      />
                      {SEGMENT_OPTIONS.find((o) => o.id === c.segment)?.label ||
                        c.segment}
                    </Badge>
                  </Td>
                  <Td className="text-center">
                    <Badge
                      className="text-[10px] uppercase font-bold px-2 py-0.5"
                      variant={
                        c.status === "sent"
                          ? "success"
                          : c.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {c.status}
                    </Badge>
                  </Td>
                  <Td className="text-center">
                    <span className="text-sm font-bold text-foreground">
                      {(c.recipientCount || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      user
                    </span>
                  </Td>
                  <Td className="text-muted-foreground text-xs font-medium">
                    {c.sentAt ? formatDateTime(c.sentAt) : "-"}
                  </Td>
                  <Td className="text-right">
                    {c.status === "draft" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendDraft(c._id)}
                          className="h-8 px-2 text-primary"
                          title="Kirim"
                        >
                          <Send size={14} className="mr-1" /> Kirim
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(c._id)}
                          className="h-8 px-2 text-amber-500"
                          title="Edit"
                        >
                          <Edit size={14} className="mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDraft(c._id)}
                          className="h-8 px-2 text-red-500"
                          title="Hapus"
                        >
                          <Trash2 size={14} className="mr-1" /> Hapus
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(c._id)}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        title="Lihat Detail"
                      >
                        <Eye size={14} className="mr-1" /> View
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
