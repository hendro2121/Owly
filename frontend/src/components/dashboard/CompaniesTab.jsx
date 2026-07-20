import { useState, useEffect, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper,
} from "@tanstack/react-table";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { WatchlistStar } from "@/components/shared/WatchlistStar";
import { Flag } from "@/components/shared/Flag";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { titleIfShouty, periodToDays } from "@/lib/format";
import { Loader } from "@/components/shared/Loader";
import api from "@/api";

/* Company registry in the workbench table language. */

const MARKETS = {
  JSE: { country: "South Africa", code: "za" },
  LSE: { country: "United Kingdom", code: "gb" },
  AMS: { country: "Netherlands", code: "nl" },
  "Euronext AMS": { country: "Netherlands", code: "nl" },
  NYSE: { country: "United States", code: "us" },
  NASDAQ: { country: "United States", code: "us" },
  ASX: { country: "Australia", code: "au" },
  TSX: { country: "Canada", code: "ca" },
};

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

const col = createColumnHelper();
const columns = [
  col.accessor("ticker", {
    header: "Company",
    cell: (i) => {
      const d = i.row.original;
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo ticker={d.ticker} name={d.name} domain={d.website} size={22} className="rounded-full ring-1 ring-grey-900/5" />
          <span className="text-[12.5px] font-semibold text-grey-900">{d.ticker}</span>
          <span className="truncate text-[11.5px] text-grey-500">{titleIfShouty(d.name)}</span>
          {d.status === "delisted" && (
            <span className="rounded-md bg-grey-100 px-1.5 py-0.5 text-[10px] font-medium text-grey-500">Delisted</span>
          )}
        </div>
      );
    },
    size: 250,
  }),
  col.accessor("sector", {
    header: "Sector",
    cell: (i) => <span className="block truncate text-[11.5px] text-grey-700">{i.getValue() || "—"}</span>,
    size: 150,
  }),
  col.accessor("market", {
    header: "Market",
    cell: (i) => {
      const m = i.getValue() || "JSE";
      return (
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-grey-700">
          {MARKETS[m]?.code && <Flag code={MARKETS[m].code} size={13} />}{m}
        </span>
      );
    },
    size: 90,
  }),
  col.accessor("deal_count", {
    header: ({ column }) => <SortHeader column={column} right>Deals</SortHeader>,
    cell: (i) => <span className="text-[12.5px] font-semibold tabular-nums text-grey-900">{i.getValue() || 0}</span>,
    size: 70,
    meta: { align: "right" },
  }),
  col.display({
    id: "watch",
    header: "",
    cell: (i) => <WatchlistStar ticker={i.row.original.ticker} size={15} />,
    size: 44,
    meta: { align: "right" },
  }),
];

export function CompaniesTab({ market, onCompanyClick, search = "" }) {
  const [companies, setCompanies] = useState([]);
  const [period, setPeriod] = useState("1Y");
  const [country, setCountry] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState([{ id: "deal_count", desc: true }]);

  useEffect(() => {
    setLoading(true);
    api.companies(undefined, periodToDays(period), market || undefined)
      .then((co) => { setCompanies(co); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, market]);

  const availableMarkets = useMemo(
    () => [...new Set(companies.map((c) => c.market).filter(Boolean))].sort(),
    [companies]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (country !== "all" && c.market !== country) return false;
      if (q && ![c.ticker, c.name, c.sector].some((f) => (f || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [companies, country, search]);

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const marketOptions = [
    { value: "all", label: "All markets" },
    ...availableMarkets.map((m) => ({ value: m, label: m })),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {availableMarkets.length > 1 && (
          <Segmented value={country} options={marketOptions} onChange={setCountry} />
        )}
        <div className="ml-auto flex items-center gap-2">
          <Segmented
            value={period}
            options={["1M", "3M", "6M", "1Y"].map((p) => ({ value: p, label: p }))}
            onChange={setPeriod}
          />
          <span className="text-[12px] text-grey-500 tabular-nums">{filtered.length} companies</span>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-grey-900/5">
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
                      No companies match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} onClick={() => onCompanyClick?.(row.original.ticker)} className="cursor-pointer">
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
      )}
    </div>
  );
}
