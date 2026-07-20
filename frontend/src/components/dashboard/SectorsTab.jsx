import { useState, useEffect, useMemo } from "react";
import { fmtCur, periodToDays } from "@/lib/format";
import { Loader } from "@/components/shared/Loader";
import api from "@/api";

/* Sector flow as a diverging horizontal bar chart: one measure (net insider
   flow) around a zero axis, sectors sorted by it. Bar fills use lime-600 /
   sell-red — the validated diverging pair on a white surface — and every bar
   carries a direct value label, with side-of-axis as the second encoding. */

const POS = "#97AB00";
const NEG = "#DC2626";

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-lg bg-grey-100 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`cursor-pointer rounded-md border-none px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            value === o ? "bg-white text-grey-900 shadow-subtle" : "bg-transparent text-grey-500 hover:text-grey-900"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function SectorsTab({ market }) {
  const [sectors, setSectors] = useState([]);
  const [period, setPeriod] = useState("1Y");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.sectors(periodToDays(period), market || undefined)
      .then((s) => { setSectors(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, market]);

  const cur = (v) => fmtCur(v, market || "JSE");
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => (b.net_flow || 0) - (a.net_flow || 0)),
    [sectors]
  );
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.net_flow || 0)), 1);
  const totals = useMemo(() => ({
    buy: sorted.reduce((s, x) => s + (x.buy_value || 0), 0),
    sell: sorted.reduce((s, x) => s + (x.sell_value || 0), 0),
  }), [sorted]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-grey-700">
          <span className="h-2 w-2 rounded-full" style={{ background: POS }} />Net buying
        </span>
        <span className="ml-2 inline-flex items-center gap-1.5 text-[11.5px] text-grey-700">
          <span className="h-2 w-2 rounded-full" style={{ background: NEG }} />Net selling
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11.5px] text-grey-500 tabular-nums">
            Buys {cur(totals.buy)} · Sells <span className="text-sell">{cur(totals.sell)}</span>
          </span>
          <Segmented value={period} options={["1M", "3M", "6M", "1Y"]} onChange={setPeriod} />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-grey-900/5">
        <div className="scroll-sleek h-full overflow-y-auto px-5 py-2">
          {loading ? (
            <Loader />
          ) : sorted.length === 0 ? (
            <div className="py-10 text-center text-sm text-grey-400">No sector data for this period.</div>
          ) : (
            sorted.map((s, i) => {
              const net = s.net_flow || 0;
              const w = Math.max((Math.abs(net) / maxAbs) * 50, 0.75);
              const pos = net >= 0;
              return (
                <div
                  key={s.sector}
                  title={`${s.sector || "Unclassified"} — buys ${cur(s.buy_value)} (${s.buy_count}), sells ${cur(s.sell_value)} (${s.sell_count})`}
                  className={`flex items-center gap-4 py-[9px] transition-colors hover:bg-grey-50 ${i > 0 ? "border-t border-grey-100" : ""}`}
                >
                  <span className="w-40 shrink-0 truncate text-[12.5px] font-medium text-grey-900">{s.sector || "Unclassified"}</span>
                  <div className="relative h-[14px] min-w-0 flex-1">
                    <span className="absolute left-1/2 top-[-4px] h-[22px] w-px bg-grey-200" />
                    <span
                      className="absolute top-0 h-full"
                      style={
                        pos
                          ? { left: "50%", width: `${w}%`, background: POS, borderRadius: "0 4px 4px 0" }
                          : { right: "50%", width: `${w}%`, background: NEG, borderRadius: "4px 0 0 4px" }
                      }
                    />
                  </div>
                  <span className={`w-20 shrink-0 text-right text-[12.5px] font-semibold tabular-nums ${pos ? "text-grey-900" : "text-sell"}`}>
                    {pos ? "" : "−"}{cur(Math.abs(net))}
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-grey-500 tabular-nums">
                    {s.buy_count}B · {s.sell_count}S
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
