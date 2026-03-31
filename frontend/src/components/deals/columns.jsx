import { createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { TransactionTag } from "@/components/shared/TransactionTag";
import { SensButton } from "@/components/shared/SensButton";
import { Badge } from "@/components/ui/badge";
import { fmt, fmtCur, curSymbol, dealColor, dealColorHex } from "@/lib/format";

const col = createColumnHelper();

export const dealColumns = [
  col.accessor("transaction_date", {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-grey-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: (info) => (
      <span className="font-mono text-xs text-grey-400">{fmt.d(info.getValue())}</span>
    ),
    size: 110,
  }),

  col.accessor("ticker", {
    header: "Company",
    cell: (info) => {
      const d = info.row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono text-[13px]">{d.ticker}</span>
          {d.exchange && d.exchange !== "JSE" && (
            <Badge variant={d.exchange === "LSE" ? "lse" : d.exchange === "AMS" ? "ams" : "outline"}>
              {d.exchange}
            </Badge>
          )}
          <span className="text-grey-400 text-sm truncate">{d.company}</span>
        </div>
      );
    },
    size: 240,
  }),

  col.accessor("director", {
    header: "Director",
    cell: (info) => {
      const d = info.row.original;
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-grey-600 truncate">{d.director}</span>
          <span className="text-grey-300 text-[10px] font-mono shrink-0">{d.role}</span>
        </div>
      );
    },
    size: 240,
  }),

  col.accessor("transaction_type", {
    header: "Type",
    cell: (info) => <TransactionTag type={info.getValue()} />,
    size: 90,
    filterFn: "equals",
  }),

  col.accessor("shares", {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 ml-auto hover:text-grey-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Shares <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: (info) => (
      <span className="font-mono text-xs text-grey-500">{fmt.num(info.getValue())}</span>
    ),
    size: 100,
    meta: { align: "right" },
  }),

  col.accessor("price", {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 ml-auto hover:text-grey-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Price <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: (info) => {
      const d = info.row.original;
      const v = info.getValue();
      return (
        <span className="font-mono text-xs text-grey-500">
          {v != null ? curSymbol(d.currency || "ZAR") + Number(v).toFixed(2) : "\u2014"}
        </span>
      );
    },
    size: 100,
    meta: { align: "right" },
  }),

  col.accessor("value", {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 ml-auto hover:text-grey-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Value <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: (info) => {
      const d = info.row.original;
      const color = dealColorHex(d.transaction_type);
      return (
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {fmtCur(d.value, d.market || "JSE", d.currency)}
        </span>
      );
    },
    size: 110,
    meta: { align: "right" },
    sortingFn: "basic",
  }),

  col.display({
    id: "sens",
    header: "",
    cell: (info) =>
      info.row.original.source_url ? (
        <SensButton id={info.row.original.id} />
      ) : null,
    size: 70,
    enableResizing: false,
  }),
];
