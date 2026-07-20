import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown, Plus, LogOut,
  Download, SlidersHorizontal,
} from "lucide-react";

/* Superinvestor moves, in the same workbench language as Insider Trades.
   Illustrative sample data — fictional funds — until the TR-1/beneficial-
   interest feed lands. */

const MOVES = [
  { date: "12 Jul 2026", investor: "Oakhaven Capital", action: "New", ticker: "NPN", company: "Naspers", stake: 5.2, value: 1.8e9 },
  { date: "07 Jul 2026", investor: "Meridian Value Partners", action: "Added", ticker: "FSR", company: "FirstRand", stake: 8.1, value: 3.2e9 },
  { date: "30 Jun 2026", investor: "Cape Point Asset Mgmt", action: "Trimmed", ticker: "SHP", company: "Shoprite", stake: 3.4, value: 9.4e8 },
  { date: "21 Jun 2026", investor: "Highveld Partners", action: "Exited", ticker: "SOL", company: "Sasol", stake: 0, value: 0 },
  { date: "13 Jun 2026", investor: "Oakhaven Capital", action: "Added", ticker: "PRX", company: "Prosus", stake: 2.7, value: 1.1e9 },
  { date: "02 Jun 2026", investor: "Table Bay Equity", action: "New", ticker: "CPI", company: "Capitec", stake: 4.0, value: 2.0e9 },
  { date: "19 May 2026", investor: "Karoo Long Fund", action: "Added", ticker: "AGL", company: "Anglo American", stake: 6.3, value: 4.7e9 },
  { date: "06 May 2026", investor: "Meridian Value Partners", action: "Trimmed", ticker: "MTN", company: "MTN Group", stake: 2.1, value: 6.2e8 },
  { date: "17 Apr 2026", investor: "Bushveld Capital", action: "New", ticker: "GFI", company: "Gold Fields", stake: 5.8, value: 3.4e9 },
  { date: "28 Mar 2026", investor: "Table Bay Equity", action: "Exited", ticker: "TFG", company: "TFG", stake: 0, value: 0 },
  { date: "12 Feb 2026", investor: "Karoo Long Fund", action: "Added", ticker: "SBK", company: "Standard Bank", stake: 7.2, value: 5.1e9 },
  { date: "20 Dec 2025", investor: "Bushveld Capital", action: "Trimmed", ticker: "DSY", company: "Discovery", stake: 1.8, value: 4.1e8 },
];

const fmtBn = (v) => (v >= 1e9 ? `R${(v / 1e9).toFixed(1)}bn` : v > 0 ? `R${Math.round(v / 1e6)}m` : "—");

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-lg bg-grey-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-md border-none px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            value === o.value ? "bg-white text-grey-900 shadow-subtle" : "bg-transparent text-grey-500 hover:text-grey-900"
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
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors ${checked ? "bg-grey-900" : "bg-grey-200"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-subtle transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function SortHeader({ column, right, children }) {
  const dir = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(dir === "asc")}
      className={`group inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[12px] font-medium text-grey-500 hover:text-grey-900 ${right ? "ml-auto" : ""}`}
    >
      {children}
      {dir === "asc" ? <ChevronUp className="h-3 w-3" strokeWidth={2.5} />
        : dir === "desc" ? <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
        : <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" strokeWidth={2} />}
    </button>
  );
}

function ActionPill({ action }) {
  if (action === "Exited") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-sell-bg px-1.5 py-0.5 text-[10.5px] font-semibold text-sell"><LogOut className="h-2.5 w-2.5" strokeWidth={3} />Exited</span>;
  }
  if (action === "Trimmed") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-grey-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-grey-600"><ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />Trimmed</span>;
  }
  if (action === "Added") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-lime-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-grey-900"><ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />Added</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-md bg-lime-300 px-1.5 py-0.5 text-[10.5px] font-semibold text-grey-900"><Plus className="h-2.5 w-2.5" strokeWidth={3} />New</span>;
}

const col = createColumnHelper();
const columns = [
  col.accessor("date", {
    header: ({ column }) => <SortHeader column={column}>Date</SortHeader>,
    cell: (i) => <span className="whitespace-nowrap text-[11.5px] text-grey-500 tabular-nums">{i.getValue()}</span>,
    sortingFn: (a, b) => new Date(a.original.date) - new Date(b.original.date),
    size: 92,
  }),
  col.accessor("action", {
    header: "Action",
    cell: (i) => <ActionPill action={i.getValue()} />,
    size: 96,
  }),
  col.accessor("investor", {
    header: "Investor",
    cell: (i) => <span className="block truncate text-[12.5px] text-grey-900">{i.getValue()}</span>,
    size: 180,
  }),
  col.accessor("ticker", {
    header: "Company",
    cell: (i) => {
      const d = i.row.original;
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo ticker={d.ticker} name={d.company} size={22} className="rounded-full ring-1 ring-grey-900/5" />
          <span className="text-[12.5px] font-semibold text-grey-900">{d.ticker}</span>
          <span className="truncate text-[11.5px] text-grey-500">{d.company}</span>
        </div>
      );
    },
    size: 200,
  }),
  col.accessor("stake", {
    header: ({ column }) => <SortHeader column={column} right>Stake</SortHeader>,
    cell: (i) => <span className="text-[12.5px] font-semibold tabular-nums text-grey-900">{i.getValue() > 0 ? `${i.getValue().toFixed(1)}%` : "—"}</span>,
    size: 80,
    meta: { align: "right" },
  }),
  col.accessor("value", {
    header: ({ column }) => <SortHeader column={column} right>Value</SortHeader>,
    cell: (i) => {
      const d = i.row.original;
      const neg = d.action === "Trimmed" || d.action === "Exited";
      return <span className={`text-[12.5px] font-semibold tabular-nums ${neg ? "text-sell" : "text-grey-900"}`}>{fmtBn(i.getValue())}</span>;
    },
    size: 96,
    meta: { align: "right" },
  }),
];

function Stat({ k, v, tone }) {
  return (
    <div className="flex flex-col items-end">
      <span className={`text-[15px] font-semibold leading-tight tabular-nums ${tone || "text-grey-900"}`}>{v}</span>
      <span className="text-[11px] text-grey-500">{k}</span>
    </div>
  );
}

const PERIODS = ["1M", "3M", "6M", "1Y", "All"].map((p) => ({ label: p, value: p }));
const ACTIONS = ["All", "New", "Added", "Trimmed", "Exited"].map((a) => ({ label: a, value: a }));

function cutoffFor(period) {
  if (period === "All") return null;
  const n = new Date(); const c = new Date(n);
  if (period === "1M") c.setMonth(n.getMonth() - 1);
  else if (period === "3M") c.setMonth(n.getMonth() - 3);
  else if (period === "6M") c.setMonth(n.getMonth() - 6);
  else if (period === "1Y") c.setFullYear(n.getFullYear() - 1);
  return c;
}

export function SuperinvestorsDashboard({ go, setTicker, search = "" }) {
  const [action, setAction] = useState("All");
  const [period, setPeriod] = useState("6M");
  const [bigStakesOnly, setBigStakesOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: "date", desc: true }]);

  const filtered = useMemo(() => {
    const cutoff = cutoffFor(period);
    const q = search.trim().toLowerCase();
    return MOVES.filter((m) => {
      if (action !== "All" && m.action !== action) return false;
      if (bigStakesOnly && m.stake < 5) return false;
      if (cutoff && new Date(m.date) < cutoff) return false;
      if (q && ![m.investor, m.company, m.ticker].some((f) => (f || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [action, period, bigStakesOnly, search]);

  const stats = useMemo(() => {
    const investors = new Set(filtered.map((m) => m.investor)).size;
    const news = filtered.filter((m) => m.action === "New").length;
    const net = filtered.reduce((s, m) => s + (m.action === "Trimmed" || m.action === "Exited" ? -m.value : m.value), 0);
    const counts = {};
    filtered.forEach((m) => { counts[m.ticker] = (counts[m.ticker] || 0) + 1; });
    const most = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { investors, news, net, most: most ? most[0] : "—" };
  }, [filtered]);

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const active = bigStakesOnly ? 1 : 0;
  const exportCsv = () => {
    const cols = ["date", "action", "investor", "ticker", "company", "stake", "value"];
    const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(","), ...filtered.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `owly-superinvestors-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-grey-900">Superinvestors</h1>
          <span className="text-[11px] text-grey-400">Sample data · live feed in build</span>
        </div>
        <div className="flex items-center gap-7">
          <Stat k="Investors" v={String(stats.investors)} />
          <Stat k="New positions" v={String(stats.news)} />
          <Stat k="Net flow" v={fmtBn(Math.abs(stats.net))} tone={stats.net < 0 ? "text-sell" : undefined} />
          <Stat k="Most held" v={stats.most} />
        </div>
      </div>

      <div className="shrink-0 px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Segmented value={action} options={ACTIONS} onChange={setAction} />
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active ? "border-grey-900 bg-grey-900 text-white" : "border-grey-200 bg-white text-grey-700 hover:border-grey-300"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.25} />
              Filters
              {active > 0 && <span className="rounded-full bg-lime-400 px-1.5 text-[10px] font-bold text-grey-900">{active}</span>}
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-2xl bg-white p-4 shadow-floaty ring-1 ring-grey-900/5">
                  <Toggle checked={bigStakesOnly} onChange={setBigStakesOnly} label="Stakes of 5% or more" hint="Only substantial disclosed positions" />
                  {active > 0 && (
                    <button onClick={() => setBigStakesOnly(false)} className="mt-3 cursor-pointer border-none bg-transparent p-0 text-[12px] font-medium text-grey-500 hover:text-grey-900">
                      Clear filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Segmented value={period} options={PERIODS} onChange={setPeriod} />
            <button onClick={exportCsv} title="Download the filtered rows as CSV" className="inline-flex cursor-pointer items-center rounded-lg border border-grey-200 bg-white p-[7px] text-grey-500 transition-colors hover:border-grey-300 hover:text-grey-900">
              <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
            <span className="text-[12px] text-grey-500 tabular-nums">{filtered.length} moves</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-6 pb-6">
        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-grey-900/5">
          <div className="scroll-sleek min-h-0 flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#F3F3F3]">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-none hover:bg-transparent">
                    {hg.headers.map((h) => {
                      const meta = h.column.columnDef.meta || {};
                      return (
                        <TableHead key={h.id} style={{ width: h.getSize() }} className={`select-none ${meta.align === "right" ? "text-right" : ""}`}>
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-grey-400">
                      No moves match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} onClick={() => { setTicker?.(row.original.ticker); go("company"); }} className="cursor-pointer">
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta || {};
                        return (
                          <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className={`py-[5px] ${meta.align === "right" ? "text-right" : ""}`}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
    </div>
  );
}
