import { Search } from "lucide-react";
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
  count,
}) {
  return (
    <div className="flex gap-1.5 mb-4 flex-wrap items-center">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="pl-9 w-[200px] h-8 text-sm"
        />
      </div>

      {/* Type filter pills */}
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

      <div className="w-px h-5 bg-grey-200" />

      {/* Value filter pills */}
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

      <div className="w-px h-5 bg-grey-200" />

      {/* Period filter pills */}
      {periodPills.map((p) => (
        <button
          key={p}
          onClick={() => onPeriodChange(p)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border-none cursor-pointer transition-colors ${
            period === p
              ? "bg-grey-900 text-white"
              : "bg-transparent text-grey-400 hover:text-grey-600"
          }`}
        >
          {p}
        </button>
      ))}

      {/* Count */}
      <span className="ml-auto text-xs font-mono text-grey-400">{count}</span>
    </div>
  );
}
