import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/StatCard";
import { Loader } from "@/components/shared/Loader";
import { FeedTab } from "./FeedTab";
import { ClustersTab } from "./ClustersTab";
import { SectorsTab } from "./SectorsTab";
import { CompaniesTab } from "./CompaniesTab";
import { fmtCur } from "@/lib/format";
import api from "@/api";

export function Dashboard({ go, setTicker }) {
  const [allDeals, setAllDeals] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [market] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.deals({ perPage: 200, market: market || undefined, excludeNonDiscretionary: false }).catch(() => ({ deals: [] })),
      api.clusters(365, 2, market || undefined).catch(() => []),
      api.sectors(365, market || undefined).catch(() => []),
      api.stats(365, market || undefined).catch(() => null),
      api.companies(undefined, 365, market || undefined).catch(() => []),
    ]).then(([d, c, s, st, co]) => {
      setAllDeals(d.deals || []);
      setClusters(c);
      setSectors(s);
      setStats(st);
      setCompanies(co);
      setLoading(false);
    });
  }, [market]);

  const bv = stats ? stats.buy_value : allDeals.filter((d) => d.transaction_type === "Buy").reduce((s, d) => s + (d.value || 0), 0);
  const sv = stats ? stats.sell_value : allDeals.filter((d) => d.transaction_type === "Sell").reduce((s, d) => s + (d.value || 0), 0);
  const clusterCount = stats ? stats.cluster_count : clusters.length;
  const cur = (v) => fmtCur(v, market || "JSE");

  const handleDealClick = (deal) => {
    setTicker(deal.ticker);
    go("company");
  };

  const handleCompanyClick = (ticker) => {
    setTicker(ticker);
    go("company");
  };

  if (loading) {
    return (
      <div className="max-w-page mx-auto px-10 pb-16">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-page mx-auto px-10 pb-16">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 my-7 animate-rise">
        <StatCard label="Net Insider Flow" value={cur(bv - sv)} color="text-buy" />
        <StatCard label="Buy Volume" value={cur(bv)} color="text-buy" />
        <StatCard label="Sell Volume" value={cur(sv)} color="text-sell" />
        <StatCard label="Cluster Signals" value={String(clusterCount)} color="text-raven-orange" />
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
          <ClustersTab clusters={clusters} market={market} onCompanyClick={handleCompanyClick} />
        </TabsContent>

        <TabsContent value="sectors">
          <SectorsTab initialSectors={sectors} market={market} />
        </TabsContent>

        <TabsContent value="companies">
          <CompaniesTab initialCompanies={companies} market={market} onCompanyClick={handleCompanyClick} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
