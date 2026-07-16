import { useState, useEffect } from "react";
import { ArrowRight, ArrowUpRight, ArrowUp, ArrowDown, TrendingUp, Users, Crown, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionTag } from "@/components/shared/TransactionTag";
import { Flag } from "@/components/shared/Flag";
import { Footer } from "@/components/layout/Footer";
import { fmtCur, fmt, dealColorHex } from "@/lib/format";
import LOGO_MANIFEST from "../../../public/logos/manifest.json";
import api from "@/api";

/* ─────────────────────────  illustrative sample data  ───────────────────────── */

const MOCK_TICKS = [
  { t: "NPN", chg: "+4.2%", up: true },
  { t: "FSR", chg: "+2.6%", up: true },
  { t: "SOL", chg: "-1.8%", up: false },
];
const MOCK_DEALS = [
  { tag: "Buy", t: "NPN", who: "J. Molefe", val: "R12.4m", up: true },
  { tag: "Buy", t: "FSR", who: "S. van Wyk", val: "R8.1m", up: true },
  { tag: "Sell", t: "SOL", who: "T. Naidoo", val: "R3.7m", up: false },
];
const MOCK_MOVES = [
  { tag: "Appointed", who: "M. Dlamini", role: "CEO · Sasol", up: true },
  { tag: "Appointed", who: "A. Mokoena", role: "CFO · Naspers", up: true },
  { tag: "Resigned", who: "D. Pretorius", role: "CEO · Sasol", up: false },
];
const MOCK_HOLDINGS = [
  { tag: "New", who: "Oakhaven Capital", t: "NPN", stake: "5.2%", up: true },
  { tag: "Added", who: "Meridian Value", t: "FSR", stake: "8.1%", up: true },
  { tag: "Trimmed", who: "Cape Point", t: "SHP", stake: "3.4%", up: false },
];
const MOCK_BARS = [44, 62, 38, 74, 52, 88, 60, 96, 56, 70, 48, 82];

function Tag({ label, up }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold shrink-0 ${up ? "bg-lime-200 text-grey-900" : "bg-red-50 text-sell"}`}>
      {up ? <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} /> : <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />}
      {label}
    </span>
  );
}

function DealsBody() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {MOCK_TICKS.map((m, i) => (
          <div key={i} className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2 flex items-center justify-between">
            <span className="font-mono font-bold text-[12px] text-grey-900">{m.t}</span>
            <span className={`inline-flex items-center text-[11px] font-mono font-semibold ${m.up ? "text-grey-900" : "text-sell"}`}>
              {m.up ? <ArrowUp className="h-3 w-3" strokeWidth={3} /> : <ArrowDown className="h-3 w-3" strokeWidth={3} />}{m.chg}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-grey-200 overflow-hidden mb-3">
        {MOCK_DEALS.map((d, i) => (
          <div key={i} className={`flex items-center justify-between px-3.5 py-2.5 ${i < MOCK_DEALS.length - 1 ? "border-b border-grey-100" : ""}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Tag label={d.tag} up={d.up} />
              <span className="font-mono font-bold text-[12px] text-grey-900">{d.t}</span>
              <span className="text-[12px] text-grey-500 truncate">{d.who}</span>
            </div>
            <span className="font-mono font-bold text-[12px] text-grey-900 shrink-0">{d.val}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400">30-day buy volume</span>
          <span className="text-[11px] font-mono font-bold text-grey-900">R612m</span>
        </div>
        <div className="flex items-end gap-1 h-10">
          {MOCK_BARS.map((h, i) => (
            <div key={i} className={`flex-1 rounded-sm ${i === 7 ? "bg-lime-400" : "bg-grey-200"}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </>
  );
}

function MovesBody() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[{ v: "24", l: "Appointments" }, { v: "17", l: "Departures" }].map((s, i) => (
          <div key={i} className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2">
            <div className="font-mono font-bold text-[18px] text-grey-900 leading-none">{s.v}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-grey-400 mt-1">{s.l} · 30d</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-grey-200 overflow-hidden mb-3">
        {MOCK_MOVES.map((m, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < MOCK_MOVES.length - 1 ? "border-b border-grey-100" : ""}`}>
            <Tag label={m.tag} up={m.up} />
            <span className="font-semibold text-[12px] text-grey-900 shrink-0">{m.who}</span>
            <span className="text-[12px] text-grey-500 truncate">{m.role}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-grey-50 border border-grey-200 px-3.5 py-2.5">
        <span className="font-mono text-[11px] font-semibold text-grey-500">Exxaro</span>
        <ArrowRight className="h-3.5 w-3.5 text-lime-500" strokeWidth={2.5} />
        <span className="font-mono text-[11px] font-bold text-grey-900">Sasol</span>
        <span className="ml-auto text-[11px] text-grey-500 truncate">new CEO appointed</span>
      </div>
    </>
  );
}

function HoldingsBody() {
  return (
    <>
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-3.5 py-2.5 mb-3 flex items-center justify-between">
        <span className="text-[11px] font-mono text-grey-500">Investors tracked</span>
        <span className="font-mono font-bold text-[15px] text-grey-900">32</span>
      </div>
      <div className="rounded-xl border border-grey-200 overflow-hidden mb-3">
        {MOCK_HOLDINGS.map((h, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < MOCK_HOLDINGS.length - 1 ? "border-b border-grey-100" : ""}`}>
            <Tag label={h.tag} up={h.up} />
            <span className="font-semibold text-[12px] text-grey-900 truncate flex-1">{h.who}</span>
            <span className="font-mono font-bold text-[11px] text-grey-400">{h.t}</span>
            <span className="font-mono font-bold text-[12px] text-grey-900 shrink-0">{h.stake}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400 shrink-0">Most held</span>
        {[{ t: "NPN", n: 9 }, { t: "FSR", n: 7 }, { t: "PRX", n: 6 }].map((c) => (
          <span key={c.t} className="inline-flex items-center gap-1 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] font-mono font-bold text-grey-900">
            {c.t}<Star className="h-2.5 w-2.5" strokeWidth={2.5} fill="currentColor" />{c.n}
          </span>
        ))}
      </div>
    </>
  );
}

const CATEGORIES = [
  { key: "deals", label: "Director Deals", icon: TrendingUp, Body: DealsBody },
  { key: "moves", label: "Management Changes", icon: Users, Body: MovesBody },
  { key: "supers", label: "Superinvestors", icon: Crown, Body: HoldingsBody },
];

/* ─────────────────────────  shared bits  ───────────────────────── */

function SectionLabel({ num, label, light }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className={`font-mono text-[13px] ${light ? "text-white/40" : "text-grey-400"}`}>{num}</span>
      <span className={`font-mono text-[13px] font-medium ${light ? "text-white" : "text-grey-900"}`}>{label}</span>
    </div>
  );
}

function WidgetHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-grey-900 text-white">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span className="font-bold text-grey-900">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
        <span className="text-[10px] font-mono font-semibold text-grey-500 tracking-wider">LIVE</span>
      </div>
    </div>
  );
}

/* A single floating product widget (used in the three-up section). */
function FloatingWidget({ cat, delay }) {
  return (
    <div
      className="rounded-2xl bg-white border border-grey-200/70 shadow-floaty p-5 animate-float"
      style={{ animationDelay: `${delay}s` }}
    >
      <WidgetHeader icon={cat.icon} label={cat.label} />
      <div style={{ minHeight: "248px" }}>
        <cat.Body />
      </div>
    </div>
  );
}

/* Soft sage panel holding a dashboard example (Semaloop-style). */
function ExamplePanel({ icon, label, children }) {
  return (
    <div className="rounded-[28px] bg-sage-200 p-5 sm:p-8 shadow-soft">
      <div className="rounded-2xl bg-white border border-grey-200/70 shadow-soft p-5">
        <WidgetHeader icon={icon} label={label} />
        {children}
      </div>
    </div>
  );
}

/* Alternating text / dashboard split section. */
function SplitSection({ num, label, title, desc, bullets, panel, reverse, onCta }) {
  return (
    <section className="max-w-page mx-auto px-6 md:px-10 py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        <div className={reverse ? "lg:order-2" : ""}>
          <SectionLabel num={num} label={label} />
          <h2 className="font-display text-[30px] md:text-[40px] font-bold tracking-tight leading-[1.08] text-grey-900">
            {title}
          </h2>
          <p className="text-[17px] text-grey-500 leading-relaxed mt-5 max-w-md">{desc}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[15px] text-grey-700">
                <span className="mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-md bg-lime-200 shrink-0">
                  <Check className="h-3 w-3 text-grey-900" strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <button
            onClick={onCta}
            className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-grey-900 bg-transparent border-none cursor-pointer hover:gap-2.5 transition-all"
          >
            Explore {label.toLowerCase()}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className={reverse ? "lg:order-1" : ""}>{panel}</div>
      </div>
    </section>
  );
}

/* ─────────────────────────  live ticker (real data)  ───────────────────────── */

function LiveTicker({ deals }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (deals.length === 0) return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % deals.length), 3000);
    return () => clearInterval(interval);
  }, [deals.length]);

  if (deals.length === 0) return null;
  const d = deals[idx];
  return (
    <div className="inline-flex items-center gap-3 bg-white border border-grey-200 rounded-full px-4 py-2 text-sm shadow-soft animate-fade-in" key={idx}>
      <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
      <span className="font-mono font-semibold text-grey-900">{d.ticker}</span>
      <span className="text-grey-500">{d.director}</span>
      <span className="font-mono font-bold" style={{ color: dealColorHex(d.transaction_type) }}>
        {fmtCur(d.value, d.market || "JSE", d.currency)}
      </span>
      <TransactionTag type={d.transaction_type} />
    </div>
  );
}

/* ─────────────────────────  logo wall  ───────────────────────── */

// Curated JSE names with locally-cached logos (guaranteed to render — no CDN errors).
const WALL_TICKERS = ["NPN", "ANG", "VAL", "SBK", "MTN", "DSY", "CLS", "NED", "HYP", "AFT"];
const LOGO_WALL = WALL_TICKERS
  .filter((t) => LOGO_MANIFEST[t])
  .map((t) => ({ t, src: `/logos/${t}.${LOGO_MANIFEST[t]}` }));

/* ─────────────────────────  markets  ───────────────────────── */

const markets = [
  { code: "za", country: "South Africa", exchange: "JSE", companies: "300+", status: "live" },
  { code: "gb", country: "United Kingdom", exchange: "LSE", companies: "15+", status: "live" },
  { code: "nl", country: "Netherlands", exchange: "Euronext", companies: "5+", status: "live" },
  { code: "us", country: "United States", exchange: "NYSE / NASDAQ", companies: "5,000+", status: "coming" },
  { code: "au", country: "Australia", exchange: "ASX", companies: "2,000+", status: "coming" },
  { code: "ca", country: "Canada", exchange: "TSX", companies: "1,500+", status: "coming" },
];

/* ═══════════════════════════════════════════════════════════════ */

export function Landing({ go }) {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.latest(10).catch(() => []), api.stats(30).catch(() => null)]).then(([d, s]) => {
      setDeals(d);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const liveStats = [
    { v: stats ? fmt.zar(stats.buy_value) : "—", l: "Buy volume · 30d" },
    { v: stats ? String(stats.active_companies) : "—", l: "Companies active" },
    { v: stats ? String(stats.total_deals) : "—", l: "Disclosures tracked" },
  ];

  return (
    <div className="bg-paper">
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(212,240,0,0.10), transparent 70%)" }} />
        <div className="relative max-w-page mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-grey-200 bg-white/80 backdrop-blur pl-2.5 pr-3.5 py-1.5 text-[12px] font-mono font-medium text-grey-600 shadow-subtle mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            LIVE · JSE · LSE · EURONEXT
          </div>

          <h1 className="font-display text-[46px] sm:text-[62px] lg:text-[76px] font-bold tracking-[-0.02em] leading-[1.02] text-grey-900 animate-rise mx-auto max-w-[16ch]">
            Follow insider conviction.
          </h1>
          <p className="text-lg md:text-xl text-grey-500 leading-relaxed max-w-[560px] mx-auto mt-6 animate-rise" style={{ animationDelay: ".1s" }}>
            Owly turns every director trade, leadership move and superinvestor disclosure into clear,
            searchable intelligence — before the market catches on.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mt-9 animate-rise" style={{ animationDelay: ".18s" }}>
            <Button size="lg" variant="lime" onClick={() => go("dashboard")} className="group">
              View Live Deals
              <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => go("pricing")}>See Pricing</Button>
          </div>

          <div className="h-10 mt-10 flex justify-center">{!loading && <LiveTicker deals={deals} />}</div>
        </div>
      </section>

      {/* ───── Logo wall ───── */}
      <section className="max-w-page mx-auto px-6 md:px-10 pb-6">
        <div className="rounded-3xl bg-white border border-grey-200/60 shadow-soft px-6 py-9 md:px-10">
          <p className="text-center text-xs font-mono uppercase tracking-widest text-grey-400 mb-7">
            Coverage across the JSE and the world’s largest companies
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-6 gap-y-9 items-center">
            {LOGO_WALL.map((logo) => (
              <img
                key={logo.t}
                src={logo.src}
                alt={logo.t}
                loading="lazy"
                className="h-10 max-w-[120px] w-auto mx-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ───── 00 Problem / 01 Solution ───── */}
      <section className="max-w-page mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          <div className="md:border-r md:border-grey-200 md:pr-12">
            <SectionLabel num="00" label="Problem" />
            <p className="text-[19px] md:text-[22px] text-grey-600 leading-[1.5] max-w-md">
              Company insiders and the funds that study them constantly signal where a stock is headed —
              but those disclosures are scattered, jargon-heavy, and easy to miss. Retail investors are
              left reacting <span className="text-grey-900 font-semibold">after</span> the move.
            </p>
          </div>
          <div>
            <SectionLabel num="01" label="Solution" />
            <p className="font-display text-[26px] md:text-[34px] font-bold tracking-tight leading-[1.18] text-grey-900 max-w-md">
              Owly reads every filing, strips the noise, and surfaces the conviction trades that
              matter — in plain English, the moment they’re public.
            </p>
          </div>
        </div>
      </section>

      {/* ───── 02 The feeds (three floating widgets) ───── */}
      <section className="max-w-page mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <span className="font-mono text-[13px] text-grey-400">02</span>
            <span className="font-mono text-[13px] font-medium text-grey-900">The feeds</span>
          </div>
          <h2 className="font-display text-[32px] md:text-[44px] font-bold tracking-tight leading-[1.06] text-grey-900">
            Three lenses on the smart money.
          </h2>
          <p className="text-[17px] text-grey-500 leading-relaxed mt-4">
            Every disclosure that matters, organised into three live feeds — updated continuously as
            the market discloses.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {CATEGORIES.map((cat, i) => (
            <FloatingWidget key={cat.key} cat={cat} delay={i * 0.9} />
          ))}
        </div>
      </section>

      {/* ───── 03 / 04 / 05 split sections ───── */}
      <SplitSection
        num="03"
        label="Insider conviction"
        title="See where executives back their own company."
        desc="Open-market buys are the strongest tell in the market — and clusters of insiders buying together are stronger still. Owly ranks them by conviction, not just recency."
        bullets={["Open-market buys vs routine admin, separated", "Cluster-buy detection across multiple insiders", "Sized by value and seniority"]}
        onCta={() => go("dashboard")}
        panel={<ExamplePanel icon={TrendingUp} label="Director Deals"><DealsBody /></ExamplePanel>}
      />

      <SplitSection
        num="04"
        label="Management moves"
        title="Know who runs the companies you follow."
        desc="A new CEO often precedes a change in strategy. Track board appointments, resignations, and executives moving between listed firms — the human layer behind the numbers."
        bullets={["Appointments and departures, as they happen", "Cross-company executive moves", "The context behind a re-rating"]}
        onCta={() => go("movements")}
        reverse
        panel={<ExamplePanel icon={Users} label="Management Changes"><MovesBody /></ExamplePanel>}
      />

      <SplitSection
        num="05"
        label="Superinvestors"
        title="Follow the funds with a track record."
        desc="See where South Africa’s most respected investors are building positions — and where they’re heading for the exit — straight from their disclosed holdings."
        bullets={["New, added, trimmed and exited positions", "Consensus holdings across tracked investors", "Stakes and disclosed values"]}
        onCta={() => go("superinvestors")}
        panel={<ExamplePanel icon={Crown} label="Superinvestors"><HoldingsBody /></ExamplePanel>}
      />

      {/* ───── 06 Global coverage (soft) ───── */}
      <section className="bg-white border-y border-grey-200/60">
        <div className="max-w-page mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
            <div>
              <SectionLabel num="06" label="Global coverage" />
              <h2 className="font-display text-[30px] md:text-[40px] font-bold tracking-tight text-grey-900">
                Markets we cover.
              </h2>
              <p className="text-grey-500 mt-3 max-w-lg leading-relaxed">
                Live across the JSE, LSE and Euronext today — with more exchanges rolling out.
              </p>
            </div>
            <Button variant="outline" onClick={() => go("dashboard")} className="group shrink-0">
              Explore all data
              <ArrowUpRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((m, i) => (
              <div
                key={i}
                className={`rounded-[24px] p-6 transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                  m.status === "live" ? "bg-paper" : "bg-grey-50"
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-white shadow-subtle">
                    <Flag code={m.code} size={24} />
                  </span>
                  {m.status === "live" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-grey-900 bg-lime-200 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-grey-900" />Live
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-semibold text-grey-400 bg-white rounded-full px-2.5 py-1">
                      Soon
                    </span>
                  )}
                </div>
                <div className="font-bold text-[17px] text-grey-900">{m.country}</div>
                <div className="text-[13px] font-mono text-grey-400 mt-0.5">{m.exchange}</div>
                <div className="text-[13px] text-grey-500 mt-3">{m.companies} companies tracked</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="max-w-page mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="relative overflow-hidden rounded-[32px] bg-grey-900 px-8 py-16 md:py-20 text-center">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(212,240,0,0.16), transparent 70%)" }} />
          <div className="relative">
            <h2 className="font-display text-[34px] md:text-[48px] font-bold tracking-tight text-white max-w-xl mx-auto leading-[1.05]">
              Follow the smart money.
            </h2>
            <p className="text-grey-400 text-base md:text-lg mt-5 mb-9 max-w-md mx-auto">
              Spot insider conviction, leadership shifts and superinvestor moves — before the market does.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" variant="lime" onClick={() => go("dashboard")} className="group">
                Open Dashboard
                <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => go("pricing")} className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20">
                See Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer go={go} />
    </div>
  );
}
