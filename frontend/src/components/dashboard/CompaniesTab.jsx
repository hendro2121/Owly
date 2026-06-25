import { useState, useEffect, useMemo } from "react";
import { Building2, ArrowRight, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { Flag } from "@/components/shared/Flag";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { WatchlistStar } from "@/components/shared/WatchlistStar";
import api from "@/api";
import { periodToDays } from "@/lib/format";

/* Exchange → country (flag code). Ready for LSE / Euronext / etc. */
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

export function CompaniesTab({ market, onCompanyClick }) {
  const [companies, setCompanies] = useState([]);
  const [period, setPeriod] = useState("1Y");
  const [country, setCountry] = useState("all");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

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

  const inCountry = useMemo(
    () => companies.filter((c) => country === "all" || c.market === country),
    [companies, country]
  );

  const sorted = useMemo(
    () => [...inCountry].sort(
      (a, b) => (b.deal_count || 0) - (a.deal_count || 0) || (a.name || "").localeCompare(b.name || "")
    ),
    [inCountry]
  );

  useEffect(() => {
    if (selected && !inCountry.some((c) => c.ticker === selected)) setSelected("");
  }, [inCountry, selected]);

  const company = sorted.find((c) => c.ticker === selected) || null;
  const periods = ["1M", "3M", "YTD", "6M", "1Y"];

  // Dropdown option models
  const countryOptions = [
    { value: "all", label: "All countries", code: null },
    ...availableMarkets.map((m) => ({ value: m, label: MARKETS[m]?.country || m, code: MARKETS[m]?.code })),
  ];
  const companyOptions = sorted.map((c) => ({
    value: c.ticker,
    label: c.ticker,
    name: c.name,
    website: c.website,
    deal_count: c.deal_count,
    search: `${c.ticker} ${c.name || ""}`,
  }));

  const countryLeading = (o) =>
    o.code ? <Flag code={o.code} /> : <Globe className="h-4 w-4 text-grey-400" strokeWidth={2} />;

  return (
    <div className="max-w-2xl">
      <p className="text-[15px] text-grey-500 mb-5 leading-relaxed">
        Pick a country and company to jump straight to its full director-dealing history.
      </p>

      {/* Period */}
      <div className="flex gap-1 mb-5 items-center">
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
        {loading && <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse ml-2" />}
      </div>

      {/* Filters — custom in-page dropdowns */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <span className="block text-[10px] font-mono uppercase tracking-widest text-grey-400 mb-1.5">Country</span>
          <Dropdown
            value={country}
            onChange={setCountry}
            options={countryOptions}
            renderTrigger={(o) => (<>{countryLeading(o)}<span className="truncate">{o.label}</span></>)}
            renderOption={(o) => (<>{countryLeading(o)}<span className="truncate">{o.label}</span></>)}
          />
        </div>
        <div>
          <span className="block text-[10px] font-mono uppercase tracking-widest text-grey-400 mb-1.5">Company · {inCountry.length}</span>
          <Dropdown
            value={selected}
            onChange={setSelected}
            options={companyOptions}
            placeholder="Select a company…"
            searchable
            renderTrigger={(o) => (
              <>
                <CompanyLogo ticker={o.value} name={o.name} domain={o.website} size={20} />
                <span className="font-mono font-bold text-[13px] text-grey-900">{o.value}</span>
                <span className="text-grey-500 text-[13px] truncate">{o.name}</span>
              </>
            )}
            renderOption={(o) => (
              <>
                <CompanyLogo ticker={o.value} name={o.name} domain={o.website} size={24} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-mono font-bold text-[13px] text-grey-900">{o.value}</span>
                  <span className="text-grey-500 text-[13px] ml-2">{o.name}</span>
                </span>
                {o.deal_count > 0 && <span className="font-mono text-[11px] text-grey-400 shrink-0">{o.deal_count} deals</span>}
              </>
            )}
          />
        </div>
      </div>

      {/* Result */}
      <div className="mt-5">
        {!company ? (
          <div className="rounded-2xl border border-dashed border-grey-300 bg-grey-50 px-6 py-10 text-center">
            <Building2 className="h-6 w-6 text-grey-300 mx-auto mb-3" strokeWidth={1.75} />
            <p className="text-grey-500 text-sm font-medium">Select a company above</p>
            <p className="text-grey-400 text-xs font-mono mt-1">
              {inCountry.length} companies tracked{country !== "all" ? ` · ${MARKETS[country]?.country || country}` : ""}.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-grey-200 bg-white p-6">
            <div className="flex items-start gap-3.5">
              <CompanyLogo ticker={company.ticker} name={company.name} domain={company.website} size={44} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-grey-900">{company.ticker}</span>
                  <Badge variant={company.status === "delisted" ? "sell" : "buy"} className="text-[10px]">
                    {company.status || "listed"}
                  </Badge>
                  <WatchlistStar ticker={company.ticker} size={18} />
                </div>
                <div className="text-grey-900 font-semibold mt-0.5 truncate">{company.name}</div>
                <div className="text-[13px] text-grey-500 mt-1 flex items-center gap-1.5">
                  <span>{company.sector || "—"}</span>
                  <span className="text-grey-300">·</span>
                  {MARKETS[company.market]?.code && <Flag code={MARKETS[company.market].code} size={14} />}
                  <span>{MARKETS[company.market]?.country || company.market}</span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-auto">
                <div className="text-3xl font-extrabold text-grey-900 leading-none">{company.deal_count || 0}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-grey-400 mt-1">deals · {period}</div>
              </div>
            </div>

            {company.deal_count > 0 ? (
              <button
                onClick={() => onCompanyClick(company.ticker)}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-grey-900 bg-transparent border-none cursor-pointer hover:gap-2.5 transition-all"
              >
                View full deal history
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <p className="mt-5 text-[13px] font-mono text-grey-400">
                No director deals recorded in this period.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
