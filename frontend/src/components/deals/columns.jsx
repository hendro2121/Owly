import { createColumnHelper } from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { SensButton } from "@/components/shared/SensButton";
import { fmt, fmtCur, curSymbol, isNonDiscretionary, typeLabel, titleIfShouty } from "@/lib/format";

const col = createColumnHelper();

/* Sortable header — sentence case, sort chevron appears on hover / when active,
   without disturbing the label's alignment. */
function SortHeader({ column, right, children }) {
  const dir = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(dir === "asc")}
      className={`group inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[12px] font-medium text-grey-500 hover:text-grey-900 ${right ? "ml-auto" : ""}`}
    >
      {children}
      {dir === "asc" ? (
        <ChevronUp className="h-3 w-3" strokeWidth={2.5} />
      ) : dir === "desc" ? (
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" strokeWidth={2} />
      )}
    </button>
  );
}

/* Buy wears the brand's bright lime pill; Sell a soft red one; the
   non-discretionary types stay quiet grey. */
function TypeCell({ type }) {
  if (isNonDiscretionary(type)) {
    return (
      <span className="inline-flex items-center rounded-md bg-grey-100 px-1.5 py-0.5 text-[10.5px] font-medium text-grey-600">
        {typeLabel(type)}
      </span>
    );
  }
  const buy = type === "Buy";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
        buy ? "bg-lime-300 text-grey-900" : "bg-sell-bg text-sell"
      }`}
    >
      {buy ? <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} /> : <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />}
      {typeLabel(type)}
    </span>
  );
}

export const dealColumns = [
  col.accessor("transaction_date", {
    header: ({ column }) => <SortHeader column={column}>Date</SortHeader>,
    cell: (info) => (
      <span className="whitespace-nowrap text-[11.5px] text-grey-500 tabular-nums">{fmt.d(info.getValue())}</span>
    ),
    size: 78,
  }),

  col.accessor("ticker", {
    header: "Company",
    cell: (info) => {
      const d = info.row.original;
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo ticker={d.ticker} name={d.company} size={22} className="rounded-full ring-1 ring-grey-900/5" />
          <span className="text-[12.5px] font-semibold text-grey-900">{d.ticker}</span>
          <span className="truncate text-[11.5px] text-grey-500">{titleIfShouty(d.company)}</span>
        </div>
      );
    },
    size: 200,
  }),

  col.accessor("director", {
    header: "Director",
    cell: (info) => (
      <span className="block truncate text-[12.5px] text-grey-900">{titleIfShouty(info.getValue())}</span>
    ),
    size: 146,
  }),

  col.accessor("role", {
    header: "Role",
    cell: (info) => (
      <span className="block truncate text-[11.5px] text-grey-700">{info.getValue() || "—"}</span>
    ),
    size: 108,
    meta: { responsive: "hidden md:table-cell" },
  }),

  col.accessor("transaction_type", {
    header: "Type",
    cell: (info) => <TypeCell type={info.getValue()} />,
    size: 84,
    filterFn: "equals",
  }),

  col.accessor("shares", {
    header: ({ column }) => <SortHeader column={column} right>Shares</SortHeader>,
    cell: (info) => <span className="text-[11.5px] text-grey-700 tabular-nums">{fmt.num(info.getValue())}</span>,
    size: 76,
    meta: { align: "right", responsive: "hidden xl:table-cell" },
  }),

  col.accessor("price", {
    header: ({ column }) => <SortHeader column={column} right>Price</SortHeader>,
    cell: (info) => {
      const d = info.row.original;
      const v = info.getValue();
      return (
        <span className="text-[11.5px] text-grey-700 tabular-nums">
          {v != null ? curSymbol(d.currency || "ZAR") + Number(v).toFixed(2) : "—"}
        </span>
      );
    },
    size: 74,
    meta: { align: "right", responsive: "hidden lg:table-cell" },
  }),

  col.accessor("value", {
    header: ({ column }) => <SortHeader column={column} right>Value</SortHeader>,
    cell: (info) => {
      const d = info.row.original;
      const sell = d.transaction_type === "Sell";
      return (
        <span className={`text-[12.5px] font-semibold tabular-nums ${sell ? "text-sell" : "text-grey-900"}`}>
          {fmtCur(d.value, d.market || "JSE", d.currency)}
        </span>
      );
    },
    size: 94,
    meta: { align: "right" },
    sortingFn: "basic",
  }),

  col.display({
    id: "sens",
    header: "",
    cell: (info) =>
      info.row.original.source_url ? <SensButton id={info.row.original.id} /> : null,
    size: 48,
    enableResizing: false,
  }),
];
