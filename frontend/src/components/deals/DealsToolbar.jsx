import { Search, Download, Zap, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const typePills = [
  { label: "All", value: "All" },
  { label: "Buy", value: "Buy", variant: "buy" },
  { label: "Sell", value: "Sell", variant: "sell" },
  { label: "Vesting", value: "Vesting" },
  { label: "Tax Sale", value: "TaxSale" },
  { label: "Options", value: "OptionsExercise" },
  { label: "Hedge", value: "HedgeSettlement" },
];

const valuePills = [
  { label: "All", value: 0 },
  { label: "R1m+", value: 1e6 },
  { label: "R5m+", value: 5e6 },
];

const periodPills = ["1W", "1M", "3M", "6M", "YTD", "1Y", "All"];

export function DealsToolbar({
  search, onSearchChange,
  typeFilter, onTypeChange,
  minValue, onMinValueChange,
  period, onPeriodChange,
  openMarketOnly, onOpenMarketChange,
  clustersOnly, onClustersChange, clusterCount = 0,
  density, onDensityChange,
  onExport,
  count,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="h-8 w-[200px] pl-9 text-sm"
        />
      </div>

      {/* ── Signal filters ──
          The two that actually separate signal from noise: discretionary
          open-market trades, and companies where several insiders moved. */}
      <Button
        variant={openMarketOnly ? "lime" : "outline"}
        size="xs"
        onClick={() => onOpenMarketChange(!openMarketOnly)}
        title="Only discretionary open-market trades — hides vesting, tax sales, option exercises and transfers"
      >
        <Zap className="mr-1 h-3 w-3" strokeWidth={2.5} />
        Open-market
      </Button>
      <Button
        variant={clustersOnly ? "lime" : "outline"}
        size="xs"
        onClick={() => onClustersChange(!clustersOnly)}
        title="Only companies where 2+ insiders traded — the strongest insider signal"
      >
        <Users className="mr-1 h-3 w-3" strokeWidth={2.5} />
        Clusters{clusterCount ? ` (${clusterCount})` : ""}
      </Button>

      <div className="h-5 w-px bg-grey-200" />

      {/* Type */}
      {typePills.map((p) => (
        <Button
          key={p.value}
          variant={typeFilter === p.value ? (p.variant || "dark") : "outline"}
          size="xs"
          onClick={() => onTypeChange(p.value)}
          className="font-mono"
        >
          {p.label}
        </Button>
      ))}

      <div className="h-5 w-px bg-grey-200" />

      {/* Min value */}
      {valuePills.map((p) => (
        <Button
          key={p.value}
          variant={minValue === p.value ? "dark" : "outline"}
          size="xs"
          onClick={() => onMinValueChange(p.value)}
        >
          {p.label}
        </Button>
      ))}

      <div className="h-5 w-px bg-grey-200" />

      {/* Period */}
      {periodPills.map((p) => (
        <button
          key={p}
          onClick={() => onPeriodChange(p)}
          className={`cursor-pointer rounded-lg border-none px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
            period === p ? "bg-grey-900 text-white" : "bg-transparent text-grey-400 hover:text-grey-600"
          }`}
        >
          {p}
        </button>
      ))}

      {/* Right side: density, export, count */}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex items-center rounded-lg border border-grey-200 p-0.5">
          {[
            { k: "compact", label: "Compact" },
            { k: "regular", label: "Regular" },
          ].map((d) => (
            <button
              key={d.k}
              onClick={() => onDensityChange(d.k)}
              title={`${d.label} row height`}
              className={`cursor-pointer rounded-md border-none px-2 py-1 font-mono text-[10px] font-semibold transition-colors ${
                density === d.k ? "bg-grey-900 text-white" : "bg-transparent text-grey-400 hover:text-grey-600"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <Button variant="outline" size="xs" onClick={onExport} title="Download the filtered rows as CSV">
          <Download className="mr-1 h-3 w-3" strokeWidth={2.5} />
          CSV
        </Button>

        <span className="font-mono text-xs text-grey-400 tabular-nums">{count}</span>
      </div>
    </div>
  );
}
