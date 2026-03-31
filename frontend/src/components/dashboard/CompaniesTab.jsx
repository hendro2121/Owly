import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import api from "@/api";
import { periodToDays } from "@/lib/format";

export function CompaniesTab({ initialCompanies, market, onCompanyClick }) {
  const [companies, setCompanies] = useState(initialCompanies || []);
  const [period, setPeriod] = useState("1Y");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.companies(undefined, periodToDays(period), market || undefined)
      .then((co) => { setCompanies(co); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, market]);

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(s) ||
      (c.ticker || "").toLowerCase().includes(s) ||
      (c.sector || "").toLowerCase().includes(s)
    );
  });

  const periods = ["1M", "3M", "YTD", "6M", "1Y"];

  return (
    <div>
      <p className="text-[15px] text-grey-500 mb-4 leading-relaxed max-w-xl">
        Browse all JSE companies tracked by Raven. Click any company to see their full director
        dealing history.
      </p>

      <div className="flex gap-1 mb-4 items-center">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold border-none cursor-pointer transition-colors ${
              period === p ? "bg-grey-900 text-white" : "bg-transparent text-grey-400 hover:text-grey-600"
            }`}
          >
            {p}
          </button>
        ))}
        {loading && (
          <div className="w-1.5 h-1.5 rounded-full bg-raven-orange animate-pulse ml-2" />
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or ticker..."
            className="pl-9 w-[280px] h-8 text-sm"
          />
        </div>
        <span className="text-xs font-mono text-grey-400">{filtered.length} companies</span>
      </div>

      {companies.length === 0 ? (
        <div className="py-10 text-center font-mono text-sm text-grey-400">
          No companies loaded yet.
        </div>
      ) : (
        <div className="border border-grey-200 rounded-xl overflow-hidden">
          <div className="max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow className="border-b-2 border-grey-900 hover:bg-transparent">
                  <TableHead style={{ width: 80 }}>Ticker</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right" style={{ width: 100 }}>Deals</TableHead>
                  <TableHead className="text-right" style={{ width: 100 }}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.ticker}
                    className={`${c.deal_count > 0 ? "cursor-pointer" : "opacity-50"}`}
                    onClick={() => c.deal_count > 0 && onCompanyClick(c.ticker)}
                  >
                    <TableCell className="font-bold font-mono text-[13px] text-raven-orange">
                      {c.ticker}
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-grey-500 text-xs">{c.sector || "\u2014"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className={c.deal_count > 0 ? "font-bold text-grey-900" : "text-grey-300"}>
                        {c.deal_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.status === "delisted" ? "sell" : "buy"} className="text-[10px]">
                        {c.status || "listed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
