import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/StatCard";
import { Loader } from "@/components/shared/Loader";
import { DashboardHeader } from "./DashboardHeader";
import { FeedTab } from "./FeedTab";
import { ClustersTab } from "./ClustersTab";
import { SectorsTab } from "./SectorsTab";
import { CompaniesTab } from "./CompaniesTab";
import { fmtCur } from "@/lib/format";
import api from "@/api";

export function Dashboard({ go, setTicker }) {
  const [allDeals, setAllDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [market] = useState(null);

  // Only fetch what the default (Feed) view needs. Each tab lazy-loads its own
  // data when opened, so the initial render isn't blocked on cluster/sector/
  // company queries the user may never look at.
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

  const handleDealClick = (deal) => {
    setTicker(deal.ticker);
    go("company");
  };

  const handleCompanyClick = (ticker) => {
    setTicker(ticker);
    go("company");
  };

  const header = (
    <DashboardHeader
      page="deals"
      go={go}
      title="Insider Trades"
      subtitle="Track how directors and executives trade their own money. Open-market buys signal conviction; cluster activity is the strongest tell."
    />
  );

  if (loading) {
    return (
      <div className="max-w-page mx-auto px-6 md:px-10 pb-16">
        {header}
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-page mx-auto px-6 md:px-10 pb-16">
      {header}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7 animate-rise">
        <StatCard label="Net Insider Flow" value={cur(bv - sv)} color="text-grey-900" />
        <StatCard label="Buy Volume" value={cur(bv)} color="text-grey-900" />
        <StatCard label="Sell Volume" value={cur(sv)} color="text-sell" />
        <StatCard label="Cluster Signals" value={String(clusterCount)} color="text-grey-900" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feed">
        <div className="flex justify-between items-center mb-0">
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="clusters">Clusters</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="feed">
          <FeedTab deals={allDeals} onDealClick={handleDealClick} />
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
    </div>
  );
}
