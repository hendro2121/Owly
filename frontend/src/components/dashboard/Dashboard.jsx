import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader } from "@/components/shared/Loader";
import { FeedTab } from "./FeedTab";
import { ClustersTab } from "./ClustersTab";
import { SectorsTab } from "./SectorsTab";
import { CompaniesTab } from "./CompaniesTab";
import { fmtCur } from "@/lib/format";
import api from "@/api";

/* Figures live in the chrome as a dense strip, not a grid of oversized cards —
   the workspace belongs to the data. */
function Stat({ k, v, tone }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-grey-400">{k}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${tone || "text-grey-900"}`}>{v}</span>
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
    <div className="px-5 py-4">
      {/* dense header strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-grey-100 pb-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-grey-900">Insider Trades</h1>
        <span className="h-4 w-px bg-grey-200" />
        <Stat k="Net flow" v={cur(bv - sv)} tone={bv - sv >= 0 ? "text-grey-900" : "text-sell"} />
        <Stat k="Buy" v={cur(bv)} />
        <Stat k="Sell" v={cur(sv)} tone="text-sell" />
        <Stat k="Clusters" v={String(clusterCount)} />
        <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.1em] text-grey-400">
          JSE · SENS
        </span>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <Tabs defaultValue="feed">
          <div className="mb-0 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="clusters">Clusters</TabsTrigger>
              <TabsTrigger value="sectors">Sectors</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="feed">
            <FeedTab deals={allDeals} onDealClick={handleDealClick} search={search} />
          </TabsContent>

          <TabsContent value="clusters">
            <ClustersTab market={market} onCompanyClick={handleCompanyClick} />
          </TabsContent>

          <TabsContent value="sectors">
            <SectorsTab market={market} />
          </TabsContent>

          <TabsContent value="companies">
            <CompaniesTab market={market} onCompanyClick={handleCompanyClick} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
