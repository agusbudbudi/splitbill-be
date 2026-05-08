import { ChevronLeft } from "lucide-react";

export default function PageHero({
  onBack,
  backLabel = "Kembali",
  badges,
  title,
  meta,
  statLabel,
  statValue,
}) {
  return (
    <div
      className="p-6 rounded-lg relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #2DA7FD 0%, #39C1FE 45%, #2894FE 100%)",
        color: "white",
      }}
    >
      <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {backLabel}
              </button>
            )}
            {badges}
          </div>
          <h1 className="text-2xl font-black leading-tight">{title}</h1>
          {meta && (
            <div className="flex flex-wrap items-center gap-4 text-sm opacity-90">
              {meta}
            </div>
          )}
        </div>

        {(statLabel || statValue) && (
          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 sm:gap-0">
             <div className="flex flex-col sm:items-end">
                <div className="text-[11px] text-white/70 font-semibold uppercase tracking-widest">
                  {statLabel}
                </div>
                <p className="text-2xl sm:text-3xl font-black">{statValue}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
