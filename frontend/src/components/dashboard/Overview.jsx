import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRight } from "lucide-react";
import { OwlyLogo } from "@/components/shared/OwlyLogo";
import { fmtCur } from "@/lib/format";
import api from "@/api";

/* The product dashboard, built to match the frame mock in the marketing landing:
   a search bar, a 4-up KPI row, a weekly volume chart with the peak highlighted,
   and a live disclosures feed — running on real /api/stats + /api/deals data. */

const WEEKS = 12;

function weeklyBuyVolume(deals) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: WEEKS }, () => 0);
  for (const d of deals) {
    if (d.transaction_type !== "Buy") continue;
    const dt = d.transaction_date ? new Date(d.transaction_date) : null;
    if (!dt || Number.isNaN(+dt)) continue;
    const weeksAgo = Math.floor((now - dt) / (7 * 86400000));
    if (weeksAgo >= 0 && weeksAgo < WEEKS) buckets[WEEKS - 1 - weeksAgo] += d.value || 0;
  }
  return buckets;
}

function Kpi({ k, v, d, up }) {
  return (
    <div className="border-r border-grey-100 px-5 py-4 last:border-r-0">
      <div className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-grey-400">{k}</div>
      <div className="mt-1.5 text-[clamp(17px,1.7vw,23px)] font-semibold tracking-[-0.025em] tabular-nums text-grey-900">{v}</div>
      {d && <div className={`mt-1 font-mono text-[10.5px] ${up ? "text-lime-600" : "text-grey-500"}`}>{d}</div>}
    </div>
  );
}

function QuickLink({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-grey-200 bg-white px-3.5 py-2 text-[13px] font-medium text-grey-700 transition-colors hover:border-grey-300 hover:text-grey-900"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
    </button>
  );
}

export function Overview({ go, setTicker }) {
  const [stats, setStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats(30).catch(() => null),
      api.deals({ perPage: 150 }).catch(() => ({ deals: [] })),
    ]).then(([s, d]) => {
      setStats(s);
      setDeals(d.deals || []);
      setLoading(false);
    });
  }, []);

  const bars = useMemo(() => weeklyBuyVolume(deals), [deals]);
  const peak = Math.max(...bars, 1);
  const hot = bars.indexOf(peak);
  const buy30 = stats ? stats.buy_value : 0;

  const feed = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = t
      ? deals.filter((d) =>
          [d.ticker, d.director, d.company].some((f) => (f || "").toLowerCase().includes(t)))
      : deals;
    return rows.slice(0, 14);
  }, [deals, q]);

  return (
    <div className="min-h-[70vh] bg-paper">
      <div className="max-w-page mx-auto px-6 md:px-10 py-8 pb-20">
        <div className="animate-rise overflow-hidden rounded-2xl border border-grey-200 bg-white shadow-soft">
          {/* top bar */}
          <div className="flex items-center justify-between gap-3.5 border-b border-grey-100 px-5 py-3.5">
            <div className="flex shrink-0 items-center gap-2 text-[14px] font-semibold text-grey-900">
              <OwlyLogo size={18} />
              Owly <span className="hidden font-normal text-grey-400 sm:inline">/ Director deals</span>
            </div>
            <div className="flex max-w-[300px] flex-1 items-center gap-2 rounded-lg border border-grey-200 bg-grey-50 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-grey-400" strokeWidth={2.25} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search companies, directors…"
                className="w-full border-none bg-transparent text-[13px] text-grey-900 outline-none placeholder:text-grey-400"
              />
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-grey-400">Live</span>
            </span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 border-b border-grey-100 md:grid-cols-4">
            <Kpi k="Buy volume · 30d" v={fmtCur(buy30, "JSE")} d={stats ? `${stats.buy_count} buys` : "—"} up />
            <Kpi k="Companies active" v={stats ? String(stats.active_companies) : "—"} d="JSE" />
            <Kpi k="Disclosures · 30d" v={stats ? String(stats.total_deals) : "—"} d={stats ? `${stats.active_directors} directors` : "—"} />
            <Kpi k="Cluster buys" v={stats ? String(stats.cluster_count) : "—"} d="2+ insiders" up={!!(stats && stats.cluster_count)} />
          </div>

          {/* chart | feed */}
          <div className="grid min-h-[270px] md:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col border-b border-grey-100 p-5 md:border-b-0 md:border-r">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[12px] text-grey-500">Weekly buy volume · last {WEEKS} weeks</span>
                <span className="text-[13px] font-semibold tabular-nums text-grey-900">{fmtCur(buy30, "JSE")}</span>
              </div>
              <div className="flex min-h-[130px] flex-1 items-end gap-1.5">
                {bars.map((v, i) => (
                  <span
                    key={i}
                    title={fmtCur(v, "JSE")}
                    className={`flex-1 rounded-t transition-all duration-700 ${i === hot && peak > 1 ? "bg-lime-400" : "bg-grey-200"}`}
                    style={{ height: `${Math.max((v / peak) * 100, 2)}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center justify-between border-b border-grey-100 px-5 py-3">
                <span className="text-[12px] font-medium text-grey-900">Latest disclosures</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-grey-400">SENS</span>
              </div>
              <ul className="max-h-[320px] flex-1 overflow-y-auto">
                {loading && <li className="px-5 py-4 text-[13px] text-grey-400">Loading…</li>}
                {!loading && feed.length === 0 && (
                  <li className="px-5 py-4 text-[13px] text-grey-400">No disclosures match that search.</li>
                )}
                {feed.map((d) => {
                  const sell = d.transaction_type === "Sell";
                  return (
                    <li
                      key={d.id}
                      onClick={() => { setTicker?.(d.ticker); go("company"); }}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-grey-100 px-5 py-2.5 transition-colors hover:bg-grey-50"
                    >
                      <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${sell ? "bg-sell-bg text-sell" : "bg-lime-200 text-grey-900"}`}>
                        {sell ? "S" : "B"}
                      </span>
                      <span className="font-mono text-[12px] font-bold text-grey-900">{d.ticker}</span>
                      <span className="truncate text-[12px] text-grey-500">{d.director}</span>
                      <span className={`ml-auto shrink-0 text-[12px] font-semibold tabular-nums ${sell ? "text-sell" : "text-grey-900"}`}>
                        {fmtCur(d.value, d.market || "JSE", d.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* drill-downs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <QuickLink onClick={() => go("deals")}>All director deals</QuickLink>
          <QuickLink onClick={() => go("movements")}>Management changes</QuickLink>
          <QuickLink onClick={() => go("superinvestors")}>Superinvestors</QuickLink>
        </div>
      </div>
    </div>
  );
}
