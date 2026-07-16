import { useState, useRef, useEffect } from "react";
import { Download, SlidersHorizontal } from "lucide-react";

/* One quiet control row — macOS grammar instead of a wall of pills:
   a segmented type control, a single Filters popover holding everything
   secondary, and a segmented period on the right. */

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-lg bg-grey-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-md border-none px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            value === o.value
              ? "bg-white text-grey-900 shadow-subtle"
              : "bg-transparent text-grey-500 hover:text-grey-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span>
        <span className="block text-[13px] text-grey-900">{label}</span>
        {hint && <span className="block text-[11px] text-grey-500">{hint}</span>}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        role="switch"
        aria-checked={checked}
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors ${
          checked ? "bg-grey-900" : "bg-grey-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-subtle transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

const TYPE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Buys", value: "Buy" },
  { label: "Sells", value: "Sell" },
  { label: "Other", value: "Other" },
];

const PERIODS = ["1M", "3M", "6M", "1Y", "All"].map((p) => ({ label: p, value: p }));

const VALUE_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "R1m+", value: 1e6 },
  { label: "R5m+", value: 5e6 },
];

export function DealsToolbar({
  typeFilter, onTypeChange,
  minValue, onMinValueChange,
  period, onPeriodChange,
  openMarketOnly, onOpenMarketChange,
  clustersOnly, onClustersChange, clusterCount = 0,
  onExport,
  count,
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const active = (openMarketOnly ? 1 : 0) + (clustersOnly ? 1 : 0) + (minValue > 0 ? 1 : 0);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Segmented value={typeFilter} options={TYPE_OPTIONS} onChange={onTypeChange} />

      {/* Everything secondary lives in one popover */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            active
              ? "border-grey-900 bg-grey-900 text-white"
              : "border-grey-200 bg-white text-grey-700 hover:border-grey-300"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.25} />
          Filters
          {active > 0 && (
            <span className="rounded-full bg-lime-400 px-1.5 text-[10px] font-bold text-grey-900">{active}</span>
          )}
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[290px] rounded-2xl bg-white p-4 shadow-floaty ring-1 ring-grey-900/5">
            <Toggle
              checked={openMarketOnly}
              onChange={onOpenMarketChange}
              label="Open-market only"
              hint="Hide vesting, tax sales, options and transfers"
            />
            <Toggle
              checked={clustersOnly}
              onChange={onClustersChange}
              label={`Cluster buys${clusterCount ? ` · ${clusterCount}` : ""}`}
              hint="Companies where 2+ insiders traded"
            />
            <div className="mt-3 border-t border-grey-100 pt-3">
              <div className="mb-2 text-[11px] font-medium text-grey-500">Minimum value</div>
              <Segmented value={minValue} options={VALUE_OPTIONS} onChange={onMinValueChange} />
            </div>
            {active > 0 && (
              <button
                onClick={() => { onOpenMarketChange(false); onClustersChange(false); onMinValueChange(0); }}
                className="mt-3 cursor-pointer border-none bg-transparent p-0 text-[12px] font-medium text-grey-500 hover:text-grey-900"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Segmented value={period} options={PERIODS} onChange={onPeriodChange} />
        <button
          onClick={onExport}
          title="Download the filtered rows as CSV"
          className="inline-flex cursor-pointer items-center rounded-lg border border-grey-200 bg-white p-[7px] text-grey-500 transition-colors hover:border-grey-300 hover:text-grey-900"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
        <span className="text-[12px] text-grey-500 tabular-nums">{count} deals</span>
      </div>
    </div>
  );
}
