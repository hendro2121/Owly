import { useState, useMemo } from "react";
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

export function DealsTable({ data, onRowClick }) {
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

  return (
    <div className="border border-grey-200 rounded-xl overflow-hidden">
      <div className="max-h-[620px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
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
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-raven-orange/40 ${
                            header.column.getIsResizing() ? "bg-raven-orange" : ""
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = cell.column.columnDef.meta?.align;
                    return (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className={align === "right" ? "text-right" : ""}
                      >
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
    </div>
  );
}
