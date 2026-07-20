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
  ChevronUp, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown,
  ArrowUpRight, ArrowRightLeft, Download, SlidersHorizontal,
} from "lucide-react";

/* Management changes, in the same workbench language as Insider Trades.
   Illustrative sample data — generic names — until the board-change feed lands. */

const MOVES = [
  { date: "14 Jul 2026", person: "A. Mokoena", role: "Chief Financial Officer", ticker: "NPN", company: "Naspers", change: "Appointed", from: "Prosus" },
  { date: "10 Jul 2026", person: "M. Dlamini", role: "Chief Executive Officer", ticker: "SOL", company: "Sasol", change: "Appointed", from: "Exxaro" },
  { date: "10 Jul 2026", person: "D. Pretorius", role: "Chief Executive Officer", ticker: "SOL", company: "Sasol", change: "Resigned", from: null },
  { date: "02 Jul 2026", person: "K. Naidoo", role: "Chief Executive Officer", ticker: "FSR", company: "FirstRand", change: "Promoted", from: null },
  { date: "24 Jun 2026", person: "L. van Tonder", role: "Independent Non-Executive Director", ticker: "SHP", company: "Shoprite", change: "Appointed", from: "Woolworths" },
  { date: "17 Jun 2026", person: "T. Khumalo", role: "Chief Operating Officer", ticker: "MTN", company: "MTN Group", change: "Resigned", from: null },
  { date: "05 Jun 2026", person: "S. Botha", role: "Chairperson", ticker: "AGL", company: "Anglo American", change: "Appointed", from: null },
  { date: "22 May 2026", person: "R. Pillay", role: "Chief Financial Officer", ticker: "DSY", company: "Discovery", change: "Promoted", from: null },
  { date: "09 May 2026", person: "J. Fourie", role: "Non-Executive Director", ticker: "CPI", company: "Capitec", change: "Appointed", from: "Investec" },
  { date: "18 Apr 2026", person: "P. Mashaba", role: "Chief Executive Officer", ticker: "TFG", company: "TFG", change: "Resigned", from: null },
  { date: "02 Apr 2026", person: "N. Grobler", role: "Chief Risk Officer", ticker: "SBK", company: "Standard Bank", change: "Appointed", from: "Nedbank" },
  { date: "14 Feb 2026", person: "E. van Wyk", role: "Independent Non-Executive Director", ticker: "VOD", company: "Vodacom", change: "Appointed", from: null },
  { date: "28 Jan 2026", person: "B. Sithole", role: "Chief Executive Officer", ticker: "GFI", company: "Gold Fields", change: "Promoted", from: null },
  { date: "11 Nov 2025", person: "W. Joubert", role: "Chief Financial Officer", ticker: "WHL", company: "Woolworths", change: "Resigned", from: null },
];

const IS_CSUITE = (role) => /chief|ceo|cfo|coo|chair/i.test(role || "");

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

function ChangePill({ change }) {
  if (change === "Resigned") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sell-bg px-1.5 py-0.5 text-[10.5px] font-semibold text-sell">
        <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />Resigned
      </span>
    );
  }
  if (change === "Promoted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-grey-900 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
        <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={3} />Promoted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-lime-300 px-1.5 py-0.5 text-[10.5px] font-semibold text-grey-900">
      <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />Appointed
    </span>
  );
}

const col = createColumnHelper();
const columns = [
  col.accessor("date", {
    header: ({ column }) => <SortHeader column={column}>Date</SortHeader>,
    cell: (i) => <span className="whitespace-nowrap text-[11.5px] text-grey-500 tabular-nums">{i.getValue()}</span>,
    sortingFn: (a, b) => new Date(a.original.date) - new Date(b.original.date),
    size: 92,
  }),
  col.accessor("change", {
    header: "Change",
    cell: (i) => <ChangePill change={i.getValue()} />,
    size: 100,
  }),
  col.accessor("person", {
    header: "Person",
    cell: (i) => <span className="block truncate text-[12.5px] font-semibold text-grey-900">{i.getValue()}</span>,
    size: 120,
  }),
  col.accessor("role", {
    header: "Role",
    cell: (i) => <span className="block truncate text-[11.5px] text-grey-700">{i.getValue()}</span>,
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
    size: 190,
  }),
  col.accessor("from", {
    header: "From",
    cell: (i) =>
      i.getValue() ? (
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-grey-700">
          <ArrowRightLeft className="h-3 w-3 text-grey-400" strokeWidth={2.25} />{i.getValue()}
        </span>
      ) : (
        <span className="text-[11.5px] text-grey-300">—</span>
      ),
    size: 110,
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
const CHANGES = ["All", "Appointed", "Promoted", "Resigned"].map((c) => ({ label: c, value: c }));

function cutoffFor(period) {
  if (period === "All") return null;
  const n = new Date(); const c = new Date(n);
  if (period === "1M") c.setMonth(n.getMonth() - 1);
  else if (period === "3M") c.setMonth(n.getMonth() - 3);
  else if (period === "6M") c.setMonth(n.getMonth() - 6);
  else if (period === "1Y") c.setFullYear(n.getFullYear() - 1);
  return c;
}

export function MovementsDashboard({ go, setTicker, search = "" }) {
  const [change, setChange] = useState("All");
  const [period, setPeriod] = useState("6M");
  const [csuiteOnly, setCsuiteOnly] = useState(false);
  const [crossOnly, setCrossOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: "date", desc: true }]);

  const filtered = useMemo(() => {
    const cutoff = cutoffFor(period);
    const q = search.trim().toLowerCase();
    return MOVES.filter((m) => {
      if (change !== "All" && m.change !== change) return false;
      if (csuiteOnly && !IS_CSUITE(m.role)) return false;
      if (crossOnly && !m.from) return false;
      if (cutoff && new Date(m.date) < cutoff) return false;
      if (q && ![m.person, m.company, m.ticker, m.role, m.from].some((f) => (f || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [change, period, csuiteOnly, crossOnly, search]);

  const stats = useMemo(() => ({
    appointed: filtered.filter((m) => m.change === "Appointed").length,
    departed: filtered.filter((m) => m.change === "Resigned").length,
    csuite: filtered.filter((m) => IS_CSUITE(m.role)).length,
    cross: filtered.filter((m) => m.from).length,
  }), [filtered]);

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const active = (csuiteOnly ? 1 : 0) + (crossOnly ? 1 : 0);
  const exportCsv = () => {
    const cols = ["date", "change", "person", "role", "ticker", "company", "from"];
    const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(","), ...filtered.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `owly-management-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-grey-900">Management</h1>
          <span className="text-[11px] text-grey-400">Sample data · live feed in build</span>
        </div>
        <div className="flex items-center gap-7">
          <Stat k="Appointed" v={String(stats.appointed)} />
          <Stat k="Departed" v={String(stats.departed)} tone={stats.departed ? "text-sell" : undefined} />
          <Stat k="C-suite" v={String(stats.csuite)} />
          <Stat k="Cross-company" v={String(stats.cross)} />
        </div>
      </div>

      <div className="shrink-0 px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Segmented value={change} options={CHANGES} onChange={setChange} />
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
                  <Toggle checked={csuiteOnly} onChange={setCsuiteOnly} label="C-suite only" hint="CEO, CFO, COO and chair changes" />
                  <Toggle checked={crossOnly} onChange={setCrossOnly} label="Cross-company only" hint="Executives arriving from another listed firm" />
                  {active > 0 && (
                    <button onClick={() => { setCsuiteOnly(false); setCrossOnly(false); }} className="mt-3 cursor-pointer border-none bg-transparent p-0 text-[12px] font-medium text-grey-500 hover:text-grey-900">
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
            <span className="text-[12px] text-grey-500 tabular-nums">{filtered.length} changes</span>
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
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} style={{ width: h.getSize() }} className="select-none">
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-grey-400">
                      No changes match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} onClick={() => { setTicker?.(row.original.ticker); go("company"); }} className="cursor-pointer">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="py-[5px]">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
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
