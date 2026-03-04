import { useState, useEffect, useCallback } from "react";
import { Search, Receipt, Calendar, Users, ChevronRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import { formatDate } from "../lib/utils";

export default function SplitBills() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchSplitBills(currentPage);
  }, [currentPage]);

  const fetchSplitBills = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/split-bills?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setRecords(data.data.records);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalItems);
      } else {
        setError(data.message || "Failed to fetch split bills");
      }
    } catch (err) {
      setError("An error occurred while fetching split bills");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredRecords = records.filter(
    (record) =>
      record.activityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.owner && (
        record.owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.owner.email.toLowerCase().includes(searchQuery.toLowerCase())
      ))
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Riwayat Split Bill
        </h1>
        <p
          className="text-sm font-regular mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Lihat dan kelola semua rekaman split bill yang telah Anda simpan.
        </p>
      </div>

      {/* Stats Summary (Optional, but adds premium feel) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="p-6"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1.2rem",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <Receipt className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Total Records
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: "var(--foreground)" }}
              >
                {totalItems}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "1.2rem",
          boxShadow: "var(--shadow-soft)",
          overflow: "hidden",
        }}
      >
        <div
          className="px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search
                className="h-5 w-5"
                style={{ color: "var(--muted-foreground)" }}
              />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full pl-10 pr-4 py-2.5 text-sm transition-all"
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                borderRadius: "calc(var(--radius) - 4px)",
                color: "var(--foreground)",
              }}
              placeholder="Cari aktivitas atau peserta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-[#fbfcff]">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Aktivitas
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Tanggal
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Peserta
                </th>
                {user.isAdmin && (
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Pemilik
                  </th>
                )}
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Total Tagihan
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                       <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-sm text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                       <Receipt className="h-12 w-12 text-gray-300" />
                       <span className="text-lg font-medium text-gray-400">Tidak ada data split bill</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-primary-soft text-primary font-bold">
                          {record.activityName[0].toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
                            {record.activityName}
                          </div>
                          <div className="text-xs text-gray-500">
                             ID: {record.id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(record.occurredAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 text-gray-400" />
                        {record.participants.length} Orang
                      </div>
                    </td>
                    {user.isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                           <div className="font-semibold text-gray-900">{record.owner?.name || "Unknown"}</div>
                           <div className="text-xs text-gray-500">{record.owner?.email || "-"}</div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(record.summary.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/split-bills/${record.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-primary hover:bg-primary-soft transition-all font-semibold"
                      >
                        Detail
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemName="split bills"
        />
      </div>
    </div>
  );
}
