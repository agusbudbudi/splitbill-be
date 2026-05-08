import { useState, useEffect } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { Star, MessageSquare, Phone } from "lucide-react";
import {
  Card, CardHeader,
  StatCard, SearchInput, Badge,
  Table, Thead, Tbody, Tr, Th, Td, TableSkeleton,
  EmptyState, Pagination,
} from "../components/ui";
import { formatDateTime } from "../lib/utils";
import { apiFetch } from "../lib/api";

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "text-warning" : "text-border"}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  usePageMeta(
    "Daftar Review",
    "Pantau feedback dan pengalaman pengguna untuk meningkatkan kualitas layanan."
  );
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [contactableCount, setContactableCount] = useState(0);

  useEffect(() => {
    fetchReviews(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchReviews = async (page) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/reviews?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.reviews);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
      } else {
        setError(data.message || "Gagal memuat data review");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch("/api/reviews?page=1&limit=1000");
      const data = await res.json();
      if (data.success) {
        const all = data.data.reviews;
        const avg = all.length > 0 ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
        setAvgRating(avg);
        setContactableCount(all.filter((r) => r.contactPermission).length);
      }
    } catch {
      // stats are non-critical, ignore errors
    }
  };

  const filteredReviews = reviews.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.review.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Daftar Review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pantau feedback dan pengalaman pengguna untuk meningkatkan kualitas layanan.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Review"
          value={totalItems}
          icon={MessageSquare}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Rating Rata-rata"
          value={avgRating.toFixed(1)}
          icon={Star}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Bersedia Dihubungi"
          value={contactableCount}
          icon={Phone}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama atau isi review..."
            className="max-w-xs w-full"
          />
        </CardHeader>

        <Table>
          <Thead>
            <Tr className="hover:bg-transparent">
              <Th>Nama</Th>
              <Th className="w-2/5">Review</Th>
              <Th>Rating</Th>
              <Th>Tanggal & Waktu</Th>
              <Th>Kontak</Th>
            </Tr>
          </Thead>

          {loading ? (
            <TableSkeleton cols={5} rows={8} />
          ) : error ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={5} className="text-center py-12 text-destructive">{error}</Td>
              </Tr>
            </Tbody>
          ) : filteredReviews.length === 0 ? (
            <Tbody>
              <Tr className="hover:bg-transparent">
                <Td colSpan={5} className="p-0">
                  <EmptyState
                    icon={MessageSquare}
                    title="Tidak ada review ditemukan"
                    description={searchQuery ? "Coba ubah kata kunci pencarian." : "Belum ada review masuk."}
                  />
                </Td>
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {filteredReviews.map((review, index) => (
                <Tr key={index}>
                  <Td className="font-semibold whitespace-nowrap">{review.name}</Td>
                  <Td className="text-muted-foreground break-words">{review.review}</Td>
                  <Td>
                    <StarRating rating={review.rating} />
                  </Td>
                  <Td className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(review.createdAt)}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge variant={review.contactPermission ? "success" : "neutral"}>
                        {review.contactPermission ? "Bersedia" : "Tidak"}
                      </Badge>
                      {review.contactPermission && (
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                          {review.email && <div>{review.email}</div>}
                          {review.phone && <div>{review.phone}</div>}
                        </div>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>

        {!loading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemName="review"
          />
        )}
      </Card>
    </div>
  );
}
