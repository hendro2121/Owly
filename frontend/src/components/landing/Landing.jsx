import { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowUpRight, BarChart3, Search, Zap, Globe, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TransactionTag } from "@/components/shared/TransactionTag";
import { Loader } from "@/components/shared/Loader";
import { fmtCur, fmt, dealColorHex } from "@/lib/format";
import api from "@/api";

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!target || started.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}

/* ── Live ticker ── */
function LiveTicker({ deals }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (deals.length === 0) return;
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % deals.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [deals.length]);

  if (deals.length === 0) return null;
  const d = deals[idx];

  return (
    <div className="inline-flex items-center gap-3 bg-grey-50 border border-grey-200 rounded-full px-4 py-2 text-sm animate-fade-in" key={idx}>
      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
      <span className="font-mono font-semibold text-grey-900">{d.ticker}</span>
      <span className="text-grey-500">{d.director}</span>
      <span className="font-mono font-bold" style={{ color: dealColorHex(d.transaction_type) }}>
        {fmtCur(d.value, d.market || "JSE", d.currency)}
      </span>
      <TransactionTag type={d.transaction_type} />
    </div>
  );
}

/* ── Markets data ── */
const markets = [
  {
    flag: "\uD83C\uDDFF\uD83C\uDDE6",
    country: "South Africa",
    exchange: "JSE",
    description: "Johannesburg Stock Exchange \u2014 Africa\u2019s largest exchange with 300+ listed companies. Full SENS announcement coverage.",
    status: "live",
    companies: "300+",
  },
  {
    flag: "\uD83C\uDDEC\uD83C\uDDE7",
    country: "United Kingdom",
    exchange: "LSE",
    description: "London Stock Exchange \u2014 tracking dual-listed SA companies trading on the LSE including PDMR notifications.",
    status: "live",
    companies: "15+",
  },
  {
    flag: "\uD83C\uDDF3\uD83C\uDDF1",
    country: "Netherlands",
    exchange: "Euronext AMS",
    description: "Euronext Amsterdam \u2014 covering companies like NEPI Rockcastle with European insider dealing disclosures.",
    status: "live",
    companies: "5+",
  },
  {
    flag: "\uD83C\uDDFA\uD83C\uDDF8",
    country: "United States",
    exchange: "NYSE / NASDAQ",
    description: "SEC Form 4 filings for US-listed companies. Director and officer transactions across all major US exchanges.",
    status: "coming",
    companies: "5,000+",
  },
  {
    flag: "\uD83C\uDDE6\uD83C\uDDFA",
    country: "Australia",
    exchange: "ASX",
    description: "Australian Securities Exchange \u2014 director interest notices (Appendix 3Y) for ASX-listed companies.",
    status: "coming",
    companies: "2,000+",
  },
  {
    flag: "\uD83C\uDDE8\uD83C\uDDE6",
    country: "Canada",
    exchange: "TSX",
    description: "Toronto Stock Exchange \u2014 SEDI insider reporting system for TSX and TSX Venture listed companies.",
    status: "coming",
    companies: "1,500+",
  },
];

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
  const buyCount = stats ? stats.buy_count : buys.length;
  const companyCount = stats ? stats.active_companies : 0;

  const [animBuys, buysRef] = useCountUp(buyCount);
  const [animClusters, clustersRef] = useCountUp(clusters.length);
  const [animCompanies, companiesRef] = useCountUp(companyCount);

  return (
    <div>
      {/* Hero */}
      <div className="px-10 pt-24 pb-20 max-w-page mx-auto">
        <div className="max-w-[680px]">
          {/* Live ticker */}
          <div className="mb-8 h-10">
            {!loading && <LiveTicker deals={deals} />}
          </div>

          <h1 className="text-[64px] font-extrabold tracking-tighter leading-[1.02] text-grey-900 animate-rise">
            Track insider
            <br />
            <span className="text-teal-500">conviction.</span>
          </h1>
          <p className="text-lg text-grey-500 leading-relaxed max-w-[520px] mt-6 animate-rise" style={{ animationDelay: ".1s" }}>
            Raven monitors every director trade across multiple exchanges and turns raw filings into structured, searchable intelligence.
          </p>
          <div className="flex gap-3 mt-8 animate-rise" style={{ animationDelay: ".18s" }}>
            <Button size="lg" onClick={() => go("dashboard")} className="group">
              View Live Deals
              <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => go("pricing")}>
              See Pricing
            </Button>
          </div>
        </div>
      </div>

      {/* Animated stats */}
      <div className="border-t border-grey-200">
        <div className="max-w-page mx-auto px-10 py-16 grid grid-cols-4 gap-8">
          {[
            { ref: buysRef, v: animBuys, l: "Insider buys", s: "last 30 days", icon: TrendingUp },
            { v: fmt.zar(buyVolume), l: "Buy volume", s: "30 days", icon: BarChart3 },
            { ref: clustersRef, v: animClusters, l: "Cluster signals", s: "2+ insiders", icon: Zap },
            { ref: companiesRef, v: animCompanies, l: "Companies tracked", s: "across exchanges", icon: Globe },
          ].map((s, i) => (
            <div key={i} ref={s.ref} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <s.icon className="h-5 w-5 text-teal-500 mb-3" strokeWidth={2} />
              <div className="text-4xl font-extrabold tracking-tight text-grey-900">{s.v}</div>
              <div className="text-xs font-mono text-grey-400 uppercase tracking-wider mt-1.5">{s.l}</div>
              <div className="text-sm text-grey-400 mt-0.5">{s.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="border-t border-grey-200">
        <div className="max-w-page mx-auto px-10 py-16">
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium">
              Latest Director Deals
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[11px] font-mono font-medium text-teal-500">LIVE</span>
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : deals.length === 0 ? (
            <div className="py-12 text-center text-grey-400 font-mono text-sm border border-grey-200 rounded-xl">
              No deals found yet. Data will appear after the scraper runs.
            </div>
          ) : (
            <div className="border border-grey-200 rounded-xl overflow-hidden bg-white">
              {deals.slice(0, 6).map((d, i) => (
                <div
                  key={d.id || i}
                  className={`flex justify-between items-center py-3.5 px-5 hover:bg-grey-50 transition-colors cursor-pointer ${
                    i < 5 ? "border-b border-grey-100" : ""
                  }`}
                  onClick={() => go("dashboard")}
                >
                  <div className="flex items-center gap-3.5">
                    <TransactionTag type={d.transaction_type} />
                    <span className="font-bold font-mono text-[13px] text-grey-900">{d.ticker}</span>
                    <span className="text-grey-500 text-sm">{d.director}</span>
                    <span className="text-grey-300 text-[11px] font-mono">{d.role}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-grey-400">{fmt.d(d.transaction_date)}</span>
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: dealColorHex(d.transaction_type) }}
                    >
                      {fmtCur(d.value, d.market || "JSE", d.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => go("dashboard")}
            className="mt-4 text-sm font-medium text-teal-500 bg-transparent border-none cursor-pointer flex items-center gap-1.5 hover:text-teal-600 transition-colors group"
          >
            View all deals
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-grey-200 bg-grey-50">
        <div className="max-w-page mx-auto px-10 py-20">
          <h2 className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                n: "01",
                t: "We scrape",
                d: "Every day at market close, Raven scans SENS announcements and regulatory filings for new director dealing disclosures.",
              },
              {
                icon: Zap,
                n: "02",
                t: "We parse",
                d: "Our system reads each announcement and extracts who traded, what they bought or sold, how many shares, and at what price.",
              },
              {
                icon: BarChart3,
                n: "03",
                t: "You see it",
                d: "Data appears on your dashboard within minutes. Filter, search, and spot patterns before the market catches on.",
              },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-grey-200 rounded-xl p-7 hover:shadow-card transition-shadow">
                <s.icon className="h-5 w-5 text-teal-500 mb-5" strokeWidth={2} />
                <div className="text-xs font-mono font-medium text-grey-400 mb-3">{s.n}</div>
                <div className="font-bold text-lg text-grey-900 mb-2">{s.t}</div>
                <div className="text-sm text-grey-500 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Markets */}
      <div className="border-t border-grey-200">
        <div className="max-w-page mx-auto px-10 py-20">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium mb-3">
                Global Coverage
              </h2>
              <p className="text-3xl font-bold tracking-tight text-grey-900">
                Markets we cover
              </p>
              <p className="text-grey-500 mt-2 max-w-lg">
                Raven tracks insider transactions across multiple exchanges and jurisdictions, with more markets being added regularly.
              </p>
            </div>
            <Button variant="outline" onClick={() => go("dashboard")} className="group shrink-0">
              Explore all data
              <ArrowUpRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {markets.map((m, i) => (
              <div
                key={i}
                className={`border border-grey-200 rounded-xl p-6 transition-all hover:shadow-card ${
                  m.status === "live" ? "bg-white" : "bg-grey-50"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl">{m.flag}</span>
                  {m.status === "live" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-teal-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-semibold text-grey-400">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className="font-bold text-grey-900 mb-0.5">{m.country}</div>
                <div className="text-xs font-mono text-grey-400 mb-3">{m.exchange} · {m.companies} companies</div>
                <div className="text-sm text-grey-500 leading-relaxed">{m.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-grey-200 bg-grey-900 py-20 px-10 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white">
          Follow the smart money
        </h2>
        <p className="text-grey-400 text-base mt-4 mb-8 max-w-md mx-auto">
          Join investors using Raven to spot insider conviction before the market moves.
        </p>
        <Button size="lg" variant="teal" onClick={() => go("dashboard")} className="group">
          Open Dashboard
          <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Footer */}
      <div className="flex justify-between px-10 py-5 max-w-page mx-auto">
        <span className="text-xs text-grey-400 font-mono">
          Data sourced from exchange regulatory filings. Not financial advice.
        </span>
        <span className="text-xs text-grey-300 font-mono">v0.3</span>
      </div>
    </div>
  );
}
