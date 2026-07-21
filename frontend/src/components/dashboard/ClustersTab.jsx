import { useState, useEffect, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper,
} from "@tanstack/react-table";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, Users, ArrowUpRight } from "lucide-react";
import { fmtCur, fmt, titleIfShouty } from "@/lib/format";
import { Loader } from "@/components/shared/Loader";
import api from "@/api";

/* Cluster buys in the workbench language. Each cluster is one compact row —
   company, sector, insider count, combined value — and expands on click to
   list the individual buys with the sum at the foot, instead of cramming
   director names into a horizontally scrolling column. */

/* Display-side hygiene for parser leftovers ("and capacity: LG Rapp, CEO"). */
const cleanName = (s) =>
  titleIfShouty(String(s || "").replace(/^and\s+(capacity|relationship)\s*:\s*/i, "").replace(/\s+/g, " ").trim());

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

export function ClustersTab({ market, onCompanyClick, search = "" }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState([{ id: "insider_count", desc: true }]);
  const [openRows, setOpenRows] = useState(() => new Set());

  useEffect(() => {
    setLoading(true);
    api.clusters(365, 2, market || undefined)
      .then((c) => { setClusters(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [market]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clusters;
    return clusters.filter((c) =>
      [c.ticker, c.company, c.sector, ...(c.directors || []).map((d) => d.name)]
        .some((f) => (f || "").toLowerCase().includes(q)));
  }, [clusters, search]);

  const columns = useMemo(() => [
    col.display({
      id: "expand",
      header: "",
      cell: (i) => (
        <ChevronRight
          className={`h-3.5 w-3.5 text-grey-400 transition-transform ${openRows.has(i.row.original.ticker) ? "rotate-90" : ""}`}
          strokeWidth={2.25}
        />
      ),
      size: 32,
    }),
    col.accessor("ticker", {
      header: "Company",
      cell: (i) => {
        const d = i.row.original;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyLogo ticker={d.ticker} name={d.company} size={22} className="rounded-full ring-1 ring-grey-900/5" />
            <span className="text-[12.5px] font-semibold text-grey-900">{d.ticker}</span>
            <span className="truncate text-[11.5px] text-grey-500">{titleIfShouty(d.company)}</span>
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
    col.accessor("insider_count", {
      header: ({ column }) => <SortHeader column={column} right>Insiders</SortHeader>,
      cell: (i) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-lime-300 px-1.5 py-0.5 text-[10.5px] font-semibold text-grey-900">
          <Users className="h-2.5 w-2.5" strokeWidth={3} />{i.getValue()}
        </span>
      ),
      size: 84,
      meta: { align: "right" },
    }),
    col.accessor("total_value", {
      header: ({ column }) => <SortHeader column={column} right>Combined</SortHeader>,
      cell: (i) => (
        <span className="text-[12.5px] font-semibold tabular-nums text-grey-900">{fmtCur(i.getValue(), "JSE")}</span>
      ),
      size: 110,
      meta: { align: "right" },
      sortingFn: "basic",
    }),
  ], [openRows]);

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const toggle = (ticker) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker); else next.add(ticker);
      return next;
    });
  };

  if (loading) return <Loader />;

  return (
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
                  No cluster signals in the last year.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const c = row.original;
                const open = openRows.has(c.ticker);
                return [
                  <TableRow key={row.id} onClick={() => toggle(c.ticker)} className="cursor-pointer">
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta || {};
                      return (
                        <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className={`py-[6px] ${meta.align === "right" ? "text-right" : ""}`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>,
                  open && (
                    <TableRow key={row.id + "-detail"} className="hover:bg-transparent">
                      <TableCell colSpan={columns.length} className="p-0">
                        <div className="mx-3 mb-2 mt-1 rounded-xl bg-grey-50 px-4 py-1.5 ring-1 ring-grey-900/5">
                          {(c.directors || []).map((d, j) => (
                            <div key={j} className={`flex items-center gap-3 py-[7px] ${j > 0 ? "border-t border-grey-200/60" : ""}`}>
                              <span className="inline-flex items-center rounded-md bg-lime-300 px-1.5 py-0.5 text-[10px] font-semibold text-grey-900">Buy</span>
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-grey-900">{cleanName(d.name)}</span>
                              <span className="hidden truncate text-[11.5px] text-grey-500 sm:block sm:max-w-[220px]">{cleanName(d.role)}</span>
                              <span className="shrink-0 text-[11.5px] text-grey-500 tabular-nums">{d.date ? fmt.d(d.date) : ""}</span>
                              <span className="w-20 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-grey-900">
                                {fmtCur(d.value, "JSE")}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-grey-200 py-[7px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); onCompanyClick?.(c.ticker); }}
                              className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[11.5px] font-medium text-grey-500 hover:text-grey-900"
                            >
                              Open {c.ticker} <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
                            </button>
                            <span className="text-[11.5px] text-grey-500">
                              Combined · {c.insider_count} insiders{" "}
                              <span className="ml-1 text-[12.5px] font-semibold tabular-nums text-grey-900">{fmtCur(c.total_value, "JSE")}</span>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
