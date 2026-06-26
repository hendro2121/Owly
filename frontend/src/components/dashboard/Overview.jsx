import {
  TrendingUp,
  Users,
  Crown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Plus,
  Star,
} from "lucide-react";

/* Market overview — three at-a-glance cards (AlphaSense-style) in the Raven
   palette. Representative data matching the design comp; Director Deals wires
   to live data in a follow-up, Movements & Superinvestors stay on sample feeds. */

function CardShell({ Icon, title, onClick, children }) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col rounded-2xl border border-grey-200 bg-white shadow-card transition-shadow hover:shadow-elevated"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grey-900">
            <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
          </span>
          <span className="text-[17px] font-semibold text-grey-900">{title}</span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-grey-400">Live</span>
        </span>
      </div>
      {children}
    </div>
  );
}

function Tag({ tone = "pos", icon: I, children }) {
  const cls = tone === "neg" ? "bg-sell-bg text-sell" : "bg-lime-200 text-grey-900";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {I && <I className="h-3 w-3" strokeWidth={2.5} />}
      {children}
    </span>
  );
}

const N = "tabular-nums";

export function Overview({ go }) {
  return (
    <div className="min-h-[70vh] bg-paper">
      <div className="max-w-page mx-auto px-6 md:px-10 py-8 pb-20">
        <h1 className="text-[24px] font-semibold tracking-tight text-grey-900">Market overview</h1>
        <p className="mt-1 mb-6 text-grey-500">
          Insider trades, management changes and superinvestor moves across the JSE — at a glance.
        </p>

        <div className="grid grid-cols-1 gap-4 animate-rise lg:grid-cols-3">
          {/* ── Director Deals ── */}
          <CardShell Icon={TrendingUp} title="Director Deals" onClick={() => go("deals")}>
            <div className="flex gap-2 px-5 pb-4">
              {[
                { t: "NPN", p: "+4.2%", up: true },
                { t: "FSR", p: "+2.6%", up: true },
                { t: "SOL", p: "-1.8%", up: false },
              ].map((m) => (
                <span key={m.t} className="flex items-center gap-1.5 rounded-lg border border-grey-200 px-2.5 py-1.5 text-[12px]">
                  <span className="font-semibold text-grey-900">{m.t}</span>
                  <span className={`flex items-center gap-0.5 font-medium ${N} ${m.up ? "text-lime-600" : "text-sell"}`}>
                    {m.up ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
                    {m.p}
                  </span>
                </span>
              ))}
            </div>

            <div className="border-t border-grey-100">
              {[
                { type: "Buy", t: "NPN", n: "J. Molefe", v: "R12.4m" },
                { type: "Buy", t: "FSR", n: "S. van Wyk", v: "R8.1m" },
                { type: "Sell", t: "SOL", n: "T. Naidoo", v: "R3.7m" },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-grey-100 px-5 py-3">
                  <Tag tone={r.type === "Sell" ? "neg" : "pos"} icon={r.type === "Sell" ? ArrowDown : ArrowUp}>
                    {r.type}
                  </Tag>
                  <span className="text-[13px] font-semibold text-grey-900">{r.t}</span>
                  <span className="truncate text-[13px] text-grey-500">{r.n}</span>
                  <span className={`ml-auto text-[14px] font-semibold text-grey-900 ${N}`}>{r.v}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto px-5 pt-4 pb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-widest text-grey-400">30-day buy volume</span>
                <span className={`text-[14px] font-semibold text-grey-900 ${N}`}>R612m</span>
              </div>
              <div className="flex h-12 items-end gap-1">
                {[42, 60, 34, 30, 40, 52, 58, 96, 66, 50, 60, 38].map((h, i) => (
                  <span key={i} className={`flex-1 rounded-sm ${i === 7 ? "bg-lime-400" : "bg-grey-200"}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </CardShell>

          {/* ── Management Changes ── */}
          <CardShell Icon={Users} title="Management Changes" onClick={() => go("movements")}>
            <div className="grid grid-cols-2 gap-3 px-5 pb-4">
              {[
                { v: "24", l: "Appointments · 30d" },
                { v: "17", l: "Departures · 30d" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-grey-200 bg-grey-50 px-4 py-3">
                  <div className={`text-[26px] font-semibold leading-none text-grey-900 ${N}`}>{s.v}</div>
                  <div className="mt-1.5 text-[10px] font-medium uppercase tracking-widest text-grey-400">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-grey-100">
              {[
                { a: "Appointed", n: "M. Dlamini", r: "CEO · Sasol" },
                { a: "Appointed", n: "A. Mokoena", r: "CFO · Naspers" },
                { a: "Resigned", n: "D. Pretorius", r: "CEO · Sasol" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-grey-100 px-5 py-3">
                  <Tag tone={m.a === "Resigned" ? "neg" : "pos"} icon={m.a === "Resigned" ? ArrowDown : ArrowUp}>
                    {m.a}
                  </Tag>
                  <span className="text-[13px] font-semibold text-grey-900">{m.n}</span>
                  <span className="truncate text-[13px] text-grey-500">{m.r}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto px-5 py-4">
              <div className="flex items-center gap-2 rounded-xl border border-grey-200 bg-grey-50 px-4 py-3">
                <span className="text-[13px] font-medium text-grey-500">Exxaro</span>
                <ArrowRight className="h-3.5 w-3.5 text-lime-600" strokeWidth={2.5} />
                <span className="text-[13px] font-semibold text-grey-900">Sasol</span>
                <span className="ml-auto text-[12px] text-grey-400">new CEO appointed</span>
              </div>
            </div>
          </CardShell>

          {/* ── Superinvestors ── */}
          <CardShell Icon={Crown} title="Superinvestors" onClick={() => go("superinvestors")}>
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between rounded-xl border border-grey-200 bg-grey-50 px-4 py-3">
                <span className="text-[10px] font-medium uppercase tracking-widest text-grey-400">Investors tracked</span>
                <span className={`text-[22px] font-semibold text-grey-900 ${N}`}>32</span>
              </div>
            </div>

            <div className="border-t border-grey-100">
              {[
                { a: "New", n: "Oakhaven Capital", t: "NPN", p: "5.2%", icon: Plus },
                { a: "Added", n: "Meridian Value", t: "FSR", p: "8.1%", icon: ArrowUp },
                { a: "Trimmed", n: "Cape Point", t: "SHP", p: "3.4%", icon: ArrowDown, neg: true },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-grey-100 px-5 py-3">
                  <Tag tone={m.neg ? "neg" : "pos"} icon={m.icon}>{m.a}</Tag>
                  <span className="truncate text-[13px] font-semibold text-grey-900">{m.n}</span>
                  <span className="ml-auto text-[12px] text-grey-400">{m.t}</span>
                  <span className={`text-[13px] font-semibold text-grey-900 ${N}`}>{m.p}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 px-5 py-4">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-widest text-grey-400">Most held</span>
              {[
                { t: "NPN", n: 9 },
                { t: "FSR", n: 7 },
                { t: "PRX", n: 6 },
              ].map((h) => (
                <span key={h.t} className="inline-flex items-center gap-1 rounded-full bg-lime-200 px-2.5 py-1 text-[12px] font-semibold text-grey-900">
                  {h.t} <Star className="h-3 w-3" strokeWidth={2.5} /> {h.n}
                </span>
              ))}
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}
