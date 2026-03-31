import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { TransactionTag } from "@/components/shared/TransactionTag";
import { SensButton } from "@/components/shared/SensButton";
import { Loader } from "@/components/shared/Loader";
import { fmtCur, fmt, curSymbol, dealColorHex } from "@/lib/format";
import api from "@/api";

export function CompanyPage({ ticker, go }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.companyDeals(ticker, 100)
      .then((d) => { setDeals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-10 pb-16">
        <Loader />
      </div>
    );
  }

  if (!deals.length) {
    return (
      <div className="max-w-[960px] mx-auto px-10 pb-16">
        <Button variant="link" onClick={() => go("dashboard")} className="py-5 px-0 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="py-10 text-center text-grey-400 font-mono text-sm">
          No deals found for {ticker}.
        </div>
      </div>
    );
  }

  const co = deals[0].company;
  const mkt = deals[0].market || "JSE";
  const cc = (v) => fmtCur(v, mkt);
  const buys = deals.filter((d) => d.transaction_type === "Buy");
  const sells = deals.filter((d) => d.transaction_type === "Sell");
  const bv = buys.reduce((s, d) => s + (d.value || 0), 0);
  const sv = sells.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="max-w-page mx-auto px-10 pb-16">
      <Button variant="link" onClick={() => go("dashboard")} className="py-5 px-0 gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="animate-rise">
        <h1 className="text-[52px] font-extrabold tracking-tighter uppercase">{ticker}</h1>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xl text-grey-500">{co}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 my-7 animate-rise" style={{ animationDelay: ".06s" }}>
        <StatCard label="Buys" value={cc(bv)} color="text-buy" />
        <StatCard label="Sells" value={cc(sv)} color="text-sell" />
        <StatCard label="Net Flow" value={cc(bv - sv)} color={bv >= sv ? "text-buy" : "text-sell"} />
        <StatCard label="Directors" value={[...new Set(deals.map((d) => d.director))].length} color="text-grey-900" />
      </div>

      <h3 className="text-xs font-mono uppercase tracking-widest text-grey-400 mb-3">
        All Director Deals
      </h3>

      <div className="border-t-2 border-grey-900">
        {deals.map((d, i) => (
          <div
            key={d.id || i}
            className="flex justify-between items-center py-3.5 border-b border-grey-100"
          >
            <div className="flex items-center gap-3.5">
              <TransactionTag type={d.transaction_type} />
              <span className="font-semibold">{d.director}</span>
              <span className="text-grey-400 text-[11px] font-mono">{d.role}</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="font-mono text-xs text-grey-400">{fmt.full(d.transaction_date)}</span>
              <span className="font-mono text-xs text-grey-500">
                {fmt.num(d.shares)}
                {d.price != null
                  ? " @ " + curSymbol(d.currency || "ZAR") + Number(d.price).toFixed(2)
                  : ""}
              </span>
              <span
                className="font-mono text-sm font-bold min-w-[80px] text-right"
                style={{ color: dealColorHex(d.transaction_type) }}
              >
                {fmtCur(d.value, mkt, d.currency)}
              </span>
              {d.source_url && <SensButton id={d.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
