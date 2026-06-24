import { useMemo, useState } from "react";
import { Card, Metric, Text, Flex, Badge, AreaChart, SparkAreaChart, BarList } from "@tremor/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtCur } from "@/lib/format";

/* Tremor-powered insider-trades overview.
   - 4 KPI tiles with sparklines + delta vs prior window
   - Net-flow area chart over the chosen window
   - "Top tickers" bar list of where the money is going */

const cur = (v) => fmtCur(v || 0, "JSE");

/** Bucket deals into daily totals over the last `days`, filling empty days with 0. */
function dailySeries(deals, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), buy: 0, sell: 0, net: 0 };
  }
  for (const d of deals) {
    const dt = d.transaction_date?.slice(0, 10);
    if (!dt || !(dt in buckets)) continue;
    const v = d.value || 0;
    if (d.transaction_type === "Buy") buckets[dt].buy += v;
    else if (d.transaction_type === "Sell") buckets[dt].sell += v;
    buckets[dt].net = buckets[dt].buy - buckets[dt].sell;
  }
  return Object.values(buckets);
}

/** Sum a window from the daily series. */
function windowTotal(series, key) {
  return series.reduce((s, p) => s + (p[key] || 0), 0);
}

function delta(curr, prev) {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / Math.abs(prev)) * 100);
}

function DeltaBadge({ pct, inverse = false }) {
  if (pct === 0 || Number.isNaN(pct)) {
    return <Badge color="gray" icon={Minus} size="xs">flat</Badge>;
  }
  const positive = inverse ? pct < 0 : pct > 0;
  return (
    <Badge color={positive ? "lime" : "red"} icon={positive ? TrendingUp : TrendingDown} size="xs">
      {pct > 0 ? "+" : ""}{pct}%
    </Badge>
  );
}

const PERIODS = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y",  days: 365 },
];

export function InsiderOverview({ deals }) {
  const [periodIdx, setPeriodIdx] = useState(0);
  const days = PERIODS[periodIdx].days;

  const series = useMemo(() => dailySeries(deals, days * 2), [deals, days]);
  const recent = series.slice(-days);
  const prior  = series.slice(0, days);

  const buys = windowTotal(recent, "buy");
  const sells = windowTotal(recent, "sell");
  const net = buys - sells;
  const priorBuys = windowTotal(prior, "buy");
  const priorSells = windowTotal(prior, "sell");
  const priorNet = priorBuys - priorSells;
  const activeTickers = new Set(deals.filter(d => {
    const dt = new Date(d.transaction_date || 0);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return dt >= cutoff;
  }).map(d => d.ticker)).size;

  // Top tickers by buy volume in the window
  const topBuyers = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const totals = {};
    for (const d of deals) {
      if (d.transaction_type !== "Buy") continue;
      const dt = new Date(d.transaction_date || 0);
      if (dt < cutoff) continue;
      totals[d.ticker] = (totals[d.ticker] || 0) + (d.value || 0);
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [deals, days]);

  return (
    <div className="space-y-5">
      {/* Period switcher */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono uppercase tracking-widest text-grey-400">
          Last {days} days · {activeTickers} active companies
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-grey-100 p-1">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-all ${
                i === periodIdx ? "bg-white text-grey-900 shadow-subtle" : "text-grey-500 hover:text-grey-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Net Insider Flow"
          value={cur(net)}
          delta={delta(net, priorNet)}
          series={recent}
          dataKey="net"
          color="lime"
          tone={net >= 0 ? "good" : "bad"}
        />
        <KpiTile
          label="Buy Volume"
          value={cur(buys)}
          delta={delta(buys, priorBuys)}
          series={recent}
          dataKey="buy"
          color="lime"
        />
        <KpiTile
          label="Sell Volume"
          value={cur(sells)}
          delta={delta(sells, priorSells)}
          series={recent}
          dataKey="sell"
          color="red"
          inverse
        />
        <KpiTile
          label="Active Companies"
          value={String(activeTickers)}
          delta={null}
          series={recent}
          dataKey="buy"
          color="gray"
          subdued
        />
      </div>

      {/* Net flow area chart + top buyers */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-3">
        <Card className="ring-grey-200 shadow-none">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-grey-500">Net insider flow</Text>
              <Metric className="text-grey-900 tracking-tight">{cur(net)}</Metric>
            </div>
            <DeltaBadge pct={delta(net, priorNet)} />
          </Flex>
          <AreaChart
            className="mt-4 h-44"
            data={recent}
            index="date"
            categories={["net"]}
            colors={["lime"]}
            showGridLines={false}
            showXAxis={false}
            showLegend={false}
            valueFormatter={cur}
            curveType="monotone"
            startEndOnly
          />
        </Card>

        <Card className="ring-grey-200 shadow-none">
          <Text className="text-grey-500">Top tickers by buy volume</Text>
          <Metric className="text-grey-900 tracking-tight mt-1">{cur(buys)}</Metric>
          {topBuyers.length === 0 ? (
            <div className="mt-6 py-8 text-center text-sm text-grey-400 font-mono">
              No buys in this window yet.
            </div>
          ) : (
            <BarList
              data={topBuyers.map(t => ({ ...t, color: "lime" }))}
              valueFormatter={cur}
              className="mt-4"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiTile({ label, value, delta, series, dataKey, color, tone, inverse, subdued }) {
  return (
    <Card className="ring-grey-200 shadow-none p-4">
      <Text className="text-[10px] font-mono uppercase tracking-widest text-grey-400">{label}</Text>
      <Flex alignItems="end" justifyContent="between" className="mt-1">
        <Metric className={`tracking-tight ${tone === "bad" ? "text-sell" : "text-grey-900"}`}>
          {value}
        </Metric>
        {delta !== null && <DeltaBadge pct={delta} inverse={inverse} />}
      </Flex>
      <SparkAreaChart
        data={series}
        index="date"
        categories={[dataKey]}
        colors={[subdued ? "gray" : color]}
        className="h-9 w-full mt-2"
        curveType="monotone"
      />
    </Card>
  );
}
