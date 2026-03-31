import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TransactionTag } from "@/components/shared/TransactionTag";
import { Loader } from "@/components/shared/Loader";
import { fmtCur, fmt, dealColorHex } from "@/lib/format";
import api from "@/api";

export function Landing({ go }) {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.latest(10).catch(() => []),
      api.stats(30).catch(() => null),
      api.clusters(30, 2).catch(() => []),
    ]).then(([d, s, c]) => {
      setDeals(d);
      setStats(s);
      setClusters(c);
      setLoading(false);
    });
  }, []);

  const buys = deals.filter((d) => d.transaction_type === "Buy");
  const buyVolume = stats ? stats.buy_value : buys.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div>
      {/* Hero */}
      <div className="px-10 pt-24 pb-20 max-w-page mx-auto animate-rise">
        <h1 className="text-[72px] font-extrabold tracking-tighter leading-[0.95] uppercase max-w-[900px]">
          WHERE INSIDERS PUT
          <br />
          THEIR MONEY <span className="italic text-raven-orange">{"\u2014"}FIRST</span>
        </h1>
        <p className="text-xl text-grey-500 leading-relaxed max-w-[520px] mt-7" style={{ animationDelay: ".08s" }}>
          Raven tracks every director trade on the JSE and turns it into structured, searchable
          intelligence.
        </p>
        <div className="flex gap-3 mt-8" style={{ animationDelay: ".14s" }}>
          <Button size="lg" onClick={() => go("dashboard")}>
            View Live Deals
          </Button>
          <Button size="lg" variant="outline" onClick={() => go("pricing")}>
            See Pricing
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-grey-200 max-w-page mx-auto" />

      {/* Stats row */}
      <div className="grid grid-cols-4 max-w-page mx-auto px-10 py-12 animate-rise" style={{ animationDelay: ".18s" }}>
        {[
          { v: stats ? stats.buy_count : buys.length, l: "INSIDER BUYS", s: "last 30 days" },
          { v: fmt.zar(buyVolume), l: "BUY VOLUME", s: "30 days" },
          { v: clusters.length, l: "CLUSTER SIGNALS", s: "2+ insiders" },
          { v: stats ? stats.active_companies : "\u2014", l: "COMPANIES", s: "with deals" },
        ].map((s, i) => (
          <div key={i} className="pr-10">
            <div className="text-5xl font-extrabold tracking-tight leading-none">{s.v}</div>
            <div className="text-[11px] font-mono text-grey-400 uppercase tracking-widest mt-2">
              {s.l}
            </div>
            <div className="text-sm text-grey-400 mt-0.5">{s.s}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-grey-200 max-w-page mx-auto" />

      {/* Live preview */}
      <div className="max-w-page mx-auto px-10 py-14">
        <div className="flex justify-between items-baseline mb-6">
          <h2 className="text-sm font-mono uppercase tracking-widest text-grey-400">
            Latest Director Deals
          </h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-raven-orange animate-pulse" />
            <span className="text-[11px] font-mono font-semibold text-raven-orange">LIVE</span>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : deals.length === 0 ? (
          <div className="py-10 text-center text-grey-400 font-mono text-sm">
            No deals found yet. Data will appear after the scraper runs.
          </div>
        ) : (
          <div className="border-t-2 border-grey-900">
            {deals.slice(0, 6).map((d, i) => (
              <div
                key={d.id || i}
                className="flex justify-between items-center py-4 border-b border-grey-100"
              >
                <div className="flex items-center gap-4">
                  <TransactionTag type={d.transaction_type} />
                  <span className="font-bold font-mono text-sm">{d.ticker}</span>
                  <span className="text-grey-500 text-sm">{d.director}</span>
                  <span className="text-grey-300 text-[11px] font-mono">{d.role}</span>
                </div>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: dealColorHex(d.transaction_type) }}
                >
                  {fmtCur(d.value, d.market || "JSE", d.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => go("dashboard")}
          className="mt-5 text-sm font-semibold text-raven-orange bg-transparent border-none cursor-pointer flex items-center gap-1.5"
        >
          View all deals <span className="text-lg">{"\u2192"}</span>
        </button>
      </div>

      <div className="border-t border-grey-200 max-w-page mx-auto" />

      {/* How it works */}
      <div className="max-w-page mx-auto px-10 py-16">
        <h2 className="text-5xl font-extrabold tracking-tight uppercase mb-12">
          HOW <span className="italic text-raven-orange">RAVEN</span> WORKS
        </h2>
        <div className="grid grid-cols-3 gap-0 border-t-2 border-grey-900">
          {[
            {
              n: "01",
              t: "WE SCRAPE",
              d: "Every day at market close, Raven scans JSE company investor relations websites for new director dealing announcements.",
            },
            {
              n: "02",
              t: "WE PARSE",
              d: "Our system reads each announcement and extracts who traded, what they bought or sold, how many shares, and at what price.",
            },
            {
              n: "03",
              t: "YOU SEE IT",
              d: 'The data appears on your dashboard within minutes. Filter, search, spot patterns \u2014 all in plain English.',
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`py-8 pr-8 ${i > 0 ? "pl-8 border-l border-grey-200" : ""}`}
            >
              <div className="font-mono text-sm font-semibold text-raven-orange mb-4">
                {s.n}
              </div>
              <div className="font-extrabold text-xl uppercase tracking-tight mb-2.5">
                {s.t}
              </div>
              <div className="text-[15px] text-grey-500 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-grey-900 py-20 px-10 text-center">
        <h2 className="text-5xl font-extrabold tracking-tight text-white uppercase">
          FOLLOW THE <span className="italic text-raven-orange">SMART MONEY</span>
        </h2>
        <p className="text-grey-500 text-base mt-4 mb-8">
          Join South African investors using Raven to spot insider conviction.
        </p>
        <Button size="lg" onClick={() => go("dashboard")}>
          Open Dashboard
        </Button>
      </div>

      {/* Footer */}
      <div className="flex justify-between px-10 py-5 max-w-page mx-auto">
        <span className="text-xs text-grey-400 font-mono">
          Data scraped from company IR pages. Not financial advice.
        </span>
        <span className="text-xs text-grey-300 font-mono">v0.3</span>
      </div>
    </div>
  );
}
