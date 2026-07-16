import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader } from "@/components/shared/Loader";
import { FeedTab } from "./FeedTab";
import { ClustersTab } from "./ClustersTab";
import { SectorsTab } from "./SectorsTab";
import { CompaniesTab } from "./CompaniesTab";
import { fmtCur } from "@/lib/format";
import api from "@/api";

/* Figures sit on the title line — sentence-case label, black number. */
function Stat({ k, v, tone }) {
  return (
    <div className="flex flex-col items-end">
      <span className={`text-[15px] font-semibold leading-tight tabular-nums ${tone || "text-grey-900"}`}>{v}</span>
      <span className="text-[11px] text-grey-500">{k}</span>
    </div>
  );
}

export function Dashboard({ go, setTicker, search }) {
  const [allDeals, setAllDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [market] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.deals({ perPage: 200, market: market || undefined, excludeNonDiscretionary: false }).catch(() => ({ deals: [] })),
      api.stats(365, market || undefined).catch(() => null),
    ]).then(([d, st]) => {
      setAllDeals(d.deals || []);
      setStats(st);
      setLoading(false);
    });
  }, [market]);

  const bv = stats ? stats.buy_value : allDeals.filter((d) => d.transaction_type === "Buy").reduce((s, d) => s + (d.value || 0), 0);
  const sv = stats ? stats.sell_value : allDeals.filter((d) => d.transaction_type === "Sell").reduce((s, d) => s + (d.value || 0), 0);
  const clusterCount = stats ? stats.cluster_count : 0;
  const cur = (v) => fmtCur(v, market || "JSE");

  const handleDealClick = (deal) => { setTicker(deal.ticker); go("company"); };
  const handleCompanyClick = (ticker) => { setTicker(ticker); go("company"); };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* One title line: heading left, figures right. Nothing else. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-6">
        <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-grey-900">Insider trades</h1>
        <div className="flex items-center gap-7">
          <Stat k="Net flow" v={cur(bv - sv)} tone={bv - sv >= 0 ? "text-grey-900" : "text-sell"} />
          <Stat k="Buys" v={cur(bv)} />
          <Stat k="Sells" v={cur(sv)} tone="text-sell" />
          <Stat k="Clusters" v={String(clusterCount)} />
        </div>
      </div>

      {loading ? (
        <div className="px-6"><Loader /></div>
      ) : (
        <Tabs defaultValue="feed" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-6">
            <TabsList className="w-full">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="clusters">Clusters</TabsTrigger>
              <TabsTrigger value="sectors">Sectors</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="feed" className="mt-0 min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-4">
            <FeedTab deals={allDeals} onDealClick={handleDealClick} search={search} />
          </TabsContent>

          <TabsContent value="clusters" className="mt-0 min-h-0 flex-1 overflow-auto px-6 pb-6 pt-4">
            <ClustersTab market={market} onCompanyClick={handleCompanyClick} />
          </TabsContent>

          <TabsContent value="sectors" className="mt-0 min-h-0 flex-1 overflow-auto px-6 pb-6 pt-4">
            <SectorsTab market={market} />
          </TabsContent>

          <TabsContent value="companies" className="mt-0 min-h-0 flex-1 overflow-auto px-6 pb-6 pt-4">
            <CompaniesTab market={market} onCompanyClick={handleCompanyClick} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
