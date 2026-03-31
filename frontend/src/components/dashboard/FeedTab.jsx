import { useState, useMemo } from "react";
import { DealsTable } from "@/components/deals/DealsTable";
import { DealsToolbar } from "@/components/deals/DealsToolbar";

export function FeedTab({ deals, onDealClick }) {
  const [tf, setTf] = useState("All");
  const [q, setQ] = useState("");
  const [mv, setMv] = useState(0);
  const [period, setPeriod] = useState("All");

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

  const filtered = useMemo(() => deals.filter((t) => {
    if (t.ticker && (/^\d/.test(t.ticker) || (/\d$/.test(t.ticker) && t.ticker.length >= 4))) return false;
    if (tf !== "All" && t.transaction_type !== tf) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![t.company, t.ticker, t.director].some((x) => (x || "").toLowerCase().includes(s))) return false;
    }
    if (t.value < mv) return false;
    if (cutoff && new Date(t.transaction_date) < cutoff) return false;
    return true;
  }), [deals, tf, q, mv, cutoff]);

  return (
    <div>
      <DealsToolbar
        search={q}
        onSearchChange={setQ}
        typeFilter={tf}
        onTypeChange={setTf}
        minValue={mv}
        onMinValueChange={setMv}
        period={period}
        onPeriodChange={setPeriod}
        count={filtered.length}
      />
      <DealsTable data={filtered} onRowClick={onDealClick} />
    </div>
  );
}
