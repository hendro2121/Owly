import { useState, useEffect, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper,
} from "@tanstack/react-table";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { ChevronUp, ChevronDown, ChevronsUpDown, Users } from "lucide-react";
import { fmtCur, titleIfShouty } from "@/lib/format";
import { Loader } from "@/components/shared/Loader";
import api from "@/api";

/* Cluster buys — several insiders buying the same company — in the workbench
   table language. */

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
          <CompanyLogo ticker={d.ticker} name={d.company} size={22} className="rounded-full ring-1 ring-grey-900/5" />
          <span className="text-[12.5px] font-semibold text-grey-900">{d.ticker}</span>
          <span className="truncate text-[11.5px] text-grey-500">{titleIfShouty(d.company)}</span>
        </div>
      );
    },
    size: 210,
  }),
  col.accessor("sector", {
    header: "Sector",
    cell: (i) => <span className="block truncate text-[11.5px] text-grey-700">{i.getValue() || "—"}</span>,
    size: 130,
  }),
  col.accessor("insider_count", {
    header: ({ column }) => <SortHeader column={column} right>Insiders</SortHeader>,
    cell: (i) => (
      <span className="inline-flex items-center gap-1 rounded-md bg-lime-300 px-1.5 py-0.5 text-[10.5px] font-semibold text-grey-900">
        <Users className="h-2.5 w-2.5" strokeWidth={3} />{i.getValue()}
      </span>
    ),
    size: 80,
    meta: { align: "right" },
  }),
  col.accessor((r) => (r.directors || []).map((d) => d.name).join(", "), {
    id: "directors",
    header: "Directors",
    cell: (i) => <span className="block truncate text-[11.5px] text-grey-500">{titleIfShouty(i.getValue())}</span>,
    size: 250,
  }),
  col.accessor("total_value", {
    header: ({ column }) => <SortHeader column={column} right>Combined</SortHeader>,
    cell: (i) => (
      <span className="text-[12.5px] font-semibold tabular-nums text-grey-900">{fmtCur(i.getValue(), "JSE")}</span>
    ),
    size: 100,
    meta: { align: "right" },
    sortingFn: "basic",
  }),
];

export function ClustersTab({ market, onCompanyClick, search = "" }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState([{ id: "insider_count", desc: true }]);

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

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

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
  );
}
