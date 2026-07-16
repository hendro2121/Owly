import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { dealColumns } from "./columns";

/* Row heights follow the enterprise-table convention: condensed 40px for
   scanning a lot of rows, regular 48px when you want breathing room. */
const ROW_PAD = { compact: "py-2", regular: "py-3.5" };

export function DealsTable({ data, onRowClick, density = "compact", clusterTickers }) {
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  const table = useReactTable({
    data,
    columns: dealColumns,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
  });

  const pad = ROW_PAD[density] || ROW_PAD.regular;

  return (
    <div className="overflow-hidden rounded-xl border border-grey-200">
      <div className="max-h-[620px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b-2 border-grey-900 hover:bg-transparent">
                {hg.headers.map((header) => {
                  const align = header.column.columnDef.meta?.align;
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={`relative select-none ${align === "right" ? "text-right" : ""}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}

                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-lime-300 ${
                            header.column.getIsResizing() ? "bg-lime-400" : ""
                          }`}
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={dealColumns.length}
                  className="h-24 text-center font-mono text-sm text-grey-400"
                >
                  No deals match your filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const inCluster = clusterTickers?.has(row.original.ticker);
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    title={inCluster ? "Cluster — several insiders traded this company in this window" : undefined}
                    className={`cursor-pointer ${inCluster ? "shadow-[inset_2px_0_0_0_#D4F000]" : ""}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const align = cell.column.columnDef.meta?.align;
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className={`${pad} ${align === "right" ? "text-right" : ""}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
