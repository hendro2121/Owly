import { Plus, ArrowUp, ArrowDown, LogOut, Star, Users } from "lucide-react";
import { DashboardHeader } from "./DashboardHeader";
import { StatCard } from "@/components/shared/StatCard";

/* Illustrative sample data — fictional funds, not real disclosures.
   Replaces once the major-shareholding (TR-1 / beneficial-interest) feed is wired up. */
const STATS = [
  { label: "Tracked investors", value: "32" },
  { label: "New positions · 30d", value: "11" },
  { label: "Net flow · 30d", value: "R4.6bn" },
  { label: "Most-held name", value: "NPN" },
];

const CONSENSUS = [
  { ticker: "NPN", company: "Naspers", holders: 9 },
  { ticker: "FSR", company: "FirstRand", holders: 7 },
  { ticker: "PRX", company: "Prosus", holders: 6 },
  { ticker: "CPI", company: "Capitec", holders: 5 },
];

const MOVES = [
  { investor: "Oakhaven Capital", action: "New", ticker: "NPN", company: "Naspers", stake: "5.2%", value: "R1.8bn", date: "11 Jun 2026" },
  { investor: "Meridian Value Partners", action: "Added", ticker: "FSR", company: "FirstRand", stake: "8.1%", value: "R3.2bn", date: "09 Jun 2026" },
  { investor: "Cape Point Asset Mgmt", action: "Trimmed", ticker: "SHP", company: "Shoprite", stake: "3.4%", value: "R940m", date: "06 Jun 2026" },
  { investor: "Highveld Partners", action: "Exited", ticker: "SOL", company: "Sasol", stake: "0%", value: "—", date: "04 Jun 2026" },
  { investor: "Oakhaven Capital", action: "Added", ticker: "PRX", company: "Prosus", stake: "2.7%", value: "R1.1bn", date: "02 Jun 2026" },
  { investor: "Table Bay Equity", action: "New", ticker: "CPI", company: "Capitec", stake: "4.0%", value: "R2.0bn", date: "01 Jun 2026" },
];

const ACTION_STYLES = {
  New: { cls: "bg-lime-200 text-grey-900", Icon: Plus },
  Added: { cls: "bg-lime-100 text-grey-900", Icon: ArrowUp },
  Trimmed: { cls: "bg-grey-100 text-grey-600", Icon: ArrowDown },
  Exited: { cls: "bg-red-50 text-sell", Icon: LogOut },
};

export function SuperinvestorsDashboard({ go }) {
  return (
    <div className="max-w-page mx-auto px-6 md:px-10 pb-16">
      <DashboardHeader
        page="superinvestors"
        go={go}
        title="Superinvestors"
        subtitle="Follow the disclosed holdings of South Africa’s most respected funds and investors. See where the smart money is building positions — and where it’s heading for the exit."
        beta="holdings-disclosure"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7 animate-rise">
        {STATS.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color="text-grey-900" />
        ))}
      </div>

      {/* Consensus / most-held */}
      <div className="rounded-2xl border border-grey-200 bg-grey-50 p-5 mb-7">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-grey-900" strokeWidth={2.25} />
          <h2 className="text-xs font-mono uppercase tracking-widest text-grey-500 font-medium">
            Consensus holdings — names the most tracked investors share
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CONSENSUS.map((c) => (
            <div key={c.ticker} className="rounded-xl bg-white border border-grey-200 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[14px] text-grey-900">{c.ticker}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] font-mono font-bold text-grey-900">
                  <Star className="h-2.5 w-2.5" strokeWidth={2.5} fill="currentColor" />
                  {c.holders}
                </span>
              </div>
              <div className="text-[12px] text-grey-500 mt-1">{c.company}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings moves feed */}
      <div className="rounded-2xl border border-grey-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_92px_110px] sm:grid-cols-[1fr_120px_140px] items-center px-5 py-3 border-b border-grey-200 bg-grey-50">
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400">Investor & position</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400 text-right">Stake</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400 text-right">Value</span>
        </div>
        {MOVES.map((m, i) => {
          const a = ACTION_STYLES[m.action];
          return (
            <div
              key={i}
              className={`grid grid-cols-[1fr_92px_110px] sm:grid-cols-[1fr_120px_140px] items-center px-5 py-3.5 hover:bg-grey-50 transition-colors ${
                i < MOVES.length - 1 ? "border-b border-grey-100" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 w-fit rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${a.cls}`}>
                    <a.Icon className="h-3 w-3" strokeWidth={2.5} />
                    {m.action}
                  </span>
                  <span className="font-semibold text-[14px] text-grey-900 truncate">{m.investor}</span>
                </div>
                <div className="text-[12px] text-grey-500 truncate mt-0.5">
                  <span className="font-mono font-bold text-grey-400">{m.ticker}</span> · {m.company} · {m.date}
                </div>
              </div>
              <span className="font-mono text-[13px] font-bold text-grey-900 text-right">{m.stake}</span>
              <span className="font-mono text-[13px] font-bold text-grey-900 text-right">{m.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
