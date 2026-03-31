import { useState, useEffect } from "react";
import { fmtCur } from "@/lib/format";
import api from "@/api";
import { periodToDays } from "@/lib/format";

export function SectorsTab({ initialSectors, market }) {
  const [sectors, setSectors] = useState(initialSectors || []);
  const [period, setPeriod] = useState("1Y");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.sectors(periodToDays(period), market || undefined)
      .then((s) => { setSectors(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, market]);

  const cur = (v) => fmtCur(v, market || "JSE");
  const maxS = Math.max(...sectors.map((s) => Math.max(s.buy_value || 0, s.sell_value || 0)), 1);

  const periods = ["1W", "1M", "3M", "YTD", "6M", "1Y"];

  return (
    <div>
      <p className="text-[15px] text-grey-500 mb-4 leading-relaxed max-w-xl">
        Which JSE sectors are directors putting their own money into? Green shows buying, red
        shows selling.
      </p>

      <div className="flex gap-1 mb-5 items-center">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold border-none cursor-pointer transition-colors ${
              period === p ? "bg-grey-900 text-white" : "bg-transparent text-grey-400 hover:text-grey-600"
            }`}
          >
            {p}
          </button>
        ))}
        {loading && (
          <div className="w-1.5 h-1.5 rounded-full bg-raven-orange animate-pulse ml-2" />
        )}
      </div>

      {sectors.length === 0 && !loading ? (
        <div className="py-10 text-center font-mono text-sm text-grey-400">
          No sector data available yet.
        </div>
      ) : (
        <div className="border-t-2 border-grey-900">
          {sectors.map((s) => (
            <div
              key={s.sector}
              className="flex items-center gap-5 py-4 border-b border-grey-100"
            >
              <div className="w-40 shrink-0">
                <div className="font-bold text-[15px]">{s.sector}</div>
                <div className="text-[11px] font-mono text-grey-400">{s.trade_count} trades</div>
              </div>

              <div className="flex-1">
                <div className="flex gap-0.5 h-2 rounded overflow-hidden bg-grey-100">
                  <div
                    className="bg-buy rounded transition-all duration-500"
                    style={{ width: `${((s.buy_value || 0) / maxS) * 100}%` }}
                  />
                  <div
                    className="bg-sell rounded transition-all duration-500"
                    style={{ width: `${((s.sell_value || 0) / maxS) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px] font-mono text-buy">{cur(s.buy_value)}</span>
                  <span className="text-[11px] font-mono text-sell">{cur(s.sell_value)}</span>
                </div>
              </div>

              <div className="w-24 text-right">
                <div
                  className={`font-mono text-sm font-extrabold ${
                    (s.net_flow || 0) >= 0 ? "text-buy" : "text-sell"
                  }`}
                >
                  {(s.net_flow || 0) >= 0 ? "+" : ""}
                  {cur(Math.abs(s.net_flow || 0))}
                </div>
                <div className="text-[10px] font-mono text-grey-400">net flow</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
