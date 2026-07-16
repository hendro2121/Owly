import { useState, useMemo } from "react";
import { DealsTable } from "@/components/deals/DealsTable";
import { DealsToolbar } from "@/components/deals/DealsToolbar";

/* Trades an insider didn't choose the timing of — vesting schedules, tax
   withholding, option mechanics. They carry no conviction signal, so hiding
   them is the single most useful filter on this screen. */
const NON_DISCRETIONARY = new Set([
  "Vesting", "TaxSale", "OptionsExercise", "HedgeSettlement", "Conversion", "Transfer",
]);

const CSV_COLS = [
  "transaction_date", "ticker", "company", "director", "role",
  "transaction_type", "shares", "price", "value", "currency", "source_url",
];

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [CSV_COLS.join(","), ...rows.map((r) => CSV_COLS.map((c) => esc(r[c])).join(","))].join("\n");
}

export function FeedTab({ deals, onDealClick, search = "" }) {
  const [tf, setTf] = useState("All");
  const [mv, setMv] = useState(0);
  const [period, setPeriod] = useState("All");
  const [openMarketOnly, setOpenMarketOnly] = useState(false);
  const [clustersOnly, setClustersOnly] = useState(false);

  const cutoff = useMemo(() => {
    if (period === "All") return null;
    const n = new Date();
    const c = new Date(n);
    if (period === "1W") c.setDate(n.getDate() - 7);
    else if (period === "1M") c.setMonth(n.getMonth() - 1);
    else if (period === "3M") c.setMonth(n.getMonth() - 3);
    else if (period === "6M") c.setMonth(n.getMonth() - 6);
    else if (period === "YTD") { c.setMonth(0); c.setDate(1); }
    else if (period === "1Y") c.setFullYear(n.getFullYear() - 1);
    return c;
  }, [period]);

  // Everything except the cluster pass — clusters are derived from what's left,
  // so the cluster count always reflects the window you're actually looking at.
  const base = useMemo(() => deals.filter((t) => {
    if (t.ticker && (/^\d/.test(t.ticker) || (/\d$/.test(t.ticker) && t.ticker.length >= 4))) return false;
    // Segmented type control: All | Buys | Sells | Other (anything non-Buy/Sell).
    if (tf === "Other") {
      if (t.transaction_type === "Buy" || t.transaction_type === "Sell") return false;
    } else if (tf !== "All" && t.transaction_type !== tf) return false;
    if (openMarketOnly && NON_DISCRETIONARY.has(t.transaction_type)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (![t.company, t.ticker, t.director].some((x) => (x || "").toLowerCase().includes(s))) return false;
    }
    if (t.value < mv) return false;
    if (cutoff && new Date(t.transaction_date) < cutoff) return false;
    return true;
  }), [deals, tf, search, mv, cutoff, openMarketOnly]);

  // A cluster = a company several *different* insiders traded in this window.
  const clusterTickers = useMemo(() => {
    const byTicker = new Map();
    for (const d of base) {
      if (!d.ticker) continue;
      if (!byTicker.has(d.ticker)) byTicker.set(d.ticker, new Set());
      byTicker.get(d.ticker).add(d.director);
    }
    return new Set([...byTicker].filter(([, insiders]) => insiders.size >= 2).map(([t]) => t));
  }, [base]);

  const filtered = useMemo(
    () => (clustersOnly ? base.filter((d) => clusterTickers.has(d.ticker)) : base),
    [base, clustersOnly, clusterTickers]
  );

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owly-deals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <DealsToolbar
        typeFilter={tf} onTypeChange={setTf}
        minValue={mv} onMinValueChange={setMv}
        period={period} onPeriodChange={setPeriod}
        openMarketOnly={openMarketOnly} onOpenMarketChange={setOpenMarketOnly}
        clustersOnly={clustersOnly} onClustersChange={setClustersOnly}
        clusterCount={clusterTickers.size}
        onExport={exportCsv}
        count={filtered.length}
      />
      {/* Takes whatever height is left — the rows scroll, the page never does. */}
      <div className="min-h-0 flex-1">
        <DealsTable
          data={filtered}
          onRowClick={onDealClick}
          clusterTickers={clusterTickers}
        />
      </div>
    </div>
  );
}
