import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar, Users, Receipt, CreditCard, ArrowRight, Share2, Printer, Info, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/utils";

export default function SplitBillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedParticipants, setExpandedParticipants] = useState({});
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const toggleParticipantItems = (idx) => {
    setExpandedParticipants(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/split-bills/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setRecord(data.record);
      } else {
        setError(data.message || "Gagal mengambil detail split bill");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat mengambil data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-500 font-medium">Memuat detail split bill...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-full bg-red-50 text-red-500">
           <Receipt className="h-12 w-12" />
        </div>
        <p className="text-red-600 font-semibold text-lg">{error || "Data tidak ditemukan"}</p>
        <button 
          onClick={() => navigate("/split-bills")}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/split-bills")}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors group"
        >
          <div className="p-1 px-1.5 rounded-md border border-gray-200 group-hover:border-primary/30 group-hover:bg-primary-soft">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Kembali ke Daftar
        </button>
        <div className="flex gap-2">
           <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" title="Share (Coming Soon)">
             <Share2 className="h-5 w-5" />
           </button>
           <button 
             onClick={() => window.print()}
             className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
             title="Print"
           >
             <Printer className="h-5 w-5" />
           </button>
        </div>
      </div>

      {/* Header Info */}
      <div 
        className="p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)",
          borderRadius: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          color: "white"
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Receipt className="h-3 w-3" />
              Detail Tagihan
            </div>
            <div>
              <h1 className="text-4xl font-black">{record.activityName}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 opacity-90 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(record.occurredAt)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {record.participants.length} Peserta
                </div>
                {user.isAdmin && record.owner && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20">
                    <div className="h-1 w-1 rounded-full bg-indigo-200"></div>
                    Pemilik: <span className="font-bold">{record.owner.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-white/70 text-sm font-medium uppercase tracking-widest">Total Tagihan</p>
            <p className="text-5xl font-black mt-1">
              {formatCurrency(record.summary.total)}
            </p>
          </div>
        </div>
        {/* Abstract shapes for design */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Expenses List */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-primary"></div>
              Rincian Pengeluaran
            </h2>
            
            <div className="space-y-3">
              {/* Base Expenses */}
              {record.expenses.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover:bg-primary-soft group-hover:text-primary transition-colors">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{item.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Dibayar oleh: <span className="text-gray-600 font-semibold">{record.participants.find(p => p.id === item.paidBy)?.name || "Unknown"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">{formatCurrency(item.amount)}</p>
                    <div className="flex flex-wrap justify-end gap-1 mt-2">
                       {item.participants.map(pId => {
                         const pName = record.participants.find(p => p.id === pId)?.name || "??";
                         return (
                           <span key={pId} className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                             {pName}
                           </span>
                         );
                       })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Additional Expenses (Tax, Promo, etc) */}
              {record.additionalExpenses.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="flex items-center justify-between p-5 bg-stone-50 border border-stone-200 border-dashed rounded-2xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                      <Info className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-700">{item.description}</p>
                      <p className="text-xs text-stone-500 mt-1 italic">Biaya Tambahan ({item.splitType})</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${item.amount < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Settlements */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-orange-500"></div>
              Pelunasan (Settlement)
            </h2>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4">
              {record.summary.settlements.length === 0 ? (
                <p className="text-center py-6 text-gray-400 italic">Tidak ada pelunasan yang diperlukan.</p>
              ) : (
                record.summary.settlements.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                    <div className="flex-1 text-center">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">Dari</p>
                      <p className="font-black text-gray-800 text-lg">{record.participants.find(p => p.id === s.from)?.name}</p>
                    </div>
                    <div className="flex flex-col items-center">
                       <p className="text-[10px] font-black text-orange-500 uppercase mb-1">Transfer</p>
                       <div className="p-1 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-200">
                         <ArrowRight className="h-3 w-3" />
                       </div>
                       <p className="text-sm font-black text-gray-900 mt-2">{formatCurrency(s.amount)}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">Kepada</p>
                      <p className="font-black text-gray-800 text-lg">{record.participants.find(p => p.id === s.to)?.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Per Participant Summary */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-emerald-500"></div>
              Ringkasan Peserta
            </h2>
            <div className="space-y-3">
              {record.summary.perParticipant.map((p, idx) => (
                <div key={idx} className="p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-gray-800">{record.participants.find(part => part.id === p.participantId)?.name}</p>
                      <button 
                        onClick={() => toggleParticipantItems(idx)}
                        className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
                        title="Toggle Items"
                      >
                        {expandedParticipants[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.balance > 0 ? 'bg-green-100 text-green-700' : p.balance < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.balance > 0 ? 'PIUTANG' : p.balance < 0 ? 'HUTANG' : 'LUNAS'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Membayar</p>
                      <p className="font-extrabold text-sm text-gray-900">{formatCurrency(p.paid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tagihan</p>
                      <p className="font-extrabold text-sm text-gray-900">{formatCurrency(p.owed)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                    {p.balance < 0 ? (
                      record.summary.settlements
                        .filter(s => s.from === p.participantId)
                        .map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500 font-medium">
                              Bayar ke <span className="font-bold text-gray-700">{record.participants.find(part => part.id === s.to)?.name}</span>
                            </span>
                            <span className="font-black text-rose-600">
                              {formatCurrency(s.amount)}
                            </span>
                          </div>
                        ))
                    ) : p.balance > 0 ? (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-500 font-medium">Terima Total</span>
                        <span className="font-black text-emerald-600">
                          {formatCurrency(p.balance)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center text-[11px]">
                        <span className="text-gray-400 font-bold uppercase tracking-widest italic">Lunas</span>
                      </div>
                    )}
                  </div>
                  {expandedParticipants[idx] && p.owedItems && p.owedItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Item Detail</p>
                      <div className="space-y-1.5">
                        {p.owedItems.map((item, i) => (
                          <div key={i} className="flex justify-between items-start gap-4">
                            <span className="text-[10px] text-gray-600 italic leading-tight">{item.description}</span>
                            <span className="text-[10px] font-bold text-gray-800 whitespace-nowrap">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Payment Methods */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-indigo-500"></div>
              Metode Pembayaran
            </h2>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4">
              {record.paymentMethodSnapshots.length === 0 ? (
                <p className="text-center py-4 text-gray-400 italic">Tidak ada metode pembayaran dilampirkan.</p>
              ) : (
                record.paymentMethodSnapshots.map((method, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-indigo-500" />
                      <span className="text-[10px] font-black text-indigo-500 uppercase">{method.category.replace('_', ' ')}</span>
                    </div>
                    <p className="font-black text-gray-900">{method.provider}</p>
                    <p className="text-sm font-medium text-gray-600">{method.ownerName}</p>
                    <p className="text-sm font-black text-primary flex items-center gap-2 mt-1">
                      {method.accountNumber || method.phoneNumber}
                      <button 
                        onClick={() => navigator.clipboard.writeText(method.accountNumber || method.phoneNumber)}
                        className="p-1 rounded bg-white border border-indigo-100 hover:bg-indigo-50 transition-colors"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path></svg>
                      </button>
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
