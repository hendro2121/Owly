import { UserPlus, UserMinus, ArrowUpRight, ArrowRightLeft, Building2 } from "lucide-react";
import { DashboardHeader } from "./DashboardHeader";
import { StatCard } from "@/components/shared/StatCard";

/* Illustrative sample data — generic names, no real individuals.
   Replaces once the board-change SENS feed is wired up. */
const STATS = [
  { label: "Appointments · 30d", value: "24" },
  { label: "Departures · 30d", value: "17" },
  { label: "CEO / CFO changes", value: "6" },
  { label: "Cross-company moves", value: "9" },
];

const MOVES = [
  { type: "Appointed", ticker: "NPN", company: "Naspers", person: "A. Mokoena", role: "Chief Financial Officer", from: "Prosus", date: "12 Jun 2026" },
  { type: "Appointed", ticker: "SOL", company: "Sasol", person: "M. Dlamini", role: "Chief Executive Officer", from: "Exxaro", date: "10 Jun 2026" },
  { type: "Resigned", ticker: "SOL", company: "Sasol", person: "D. Pretorius", role: "Chief Executive Officer", from: null, date: "10 Jun 2026" },
  { type: "Promoted", ticker: "FSR", company: "FirstRand", person: "K. Naidoo", role: "Deputy CEO → Chief Executive", from: null, date: "08 Jun 2026" },
  { type: "Appointed", ticker: "SHP", company: "Shoprite", person: "L. van Tonder", role: "Independent Non-Exec Director", from: "Woolworths", date: "05 Jun 2026" },
  { type: "Resigned", ticker: "MTN", company: "MTN Group", person: "T. Khumalo", role: "Chief Operating Officer", from: null, date: "03 Jun 2026" },
];

const TYPE_STYLES = {
  Appointed: { cls: "bg-lime-200 text-grey-900", Icon: UserPlus },
  Promoted: { cls: "bg-grey-900 text-white", Icon: ArrowUpRight },
  Resigned: { cls: "bg-red-50 text-sell", Icon: UserMinus },
};

export function MovementsDashboard({ go }) {
  return (
    <div className="max-w-page mx-auto px-6 md:px-10 pb-16">
      <DashboardHeader
        page="movements"
        go={go}
        title="Management Movements"
        subtitle="Track who runs the companies you follow — board appointments, resignations, and executives moving between listed firms. A new CEO often precedes a change in strategy."
        beta="board-change"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7 animate-rise">
        {STATS.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color="text-grey-900" />
        ))}
      </div>

      {/* Cross-company highlight */}
      <div className="rounded-2xl border border-grey-200 bg-grey-50 p-5 mb-7">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-4 w-4 text-grey-900" strokeWidth={2.25} />
          <h2 className="text-xs font-mono uppercase tracking-widest text-grey-500 font-medium">
            Cross-company moves this month
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {MOVES.filter((m) => m.from && m.type === "Appointed").map((m, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white border border-grey-200 px-4 py-3 min-w-0">
              <span className="font-mono text-[11px] font-semibold text-grey-500 shrink-0">{m.from}</span>
              <ArrowRightLeft className="h-3.5 w-3.5 text-lime-500 shrink-0" strokeWidth={2.5} />
              <span className="font-mono text-[11px] font-bold text-grey-900 shrink-0">{m.company}</span>
              <span className="ml-auto text-[12px] text-grey-500 truncate min-w-0 pl-1">{m.person} · {m.role.split(" → ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Movements feed */}
      <div className="rounded-2xl border border-grey-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[110px_1fr_120px] sm:grid-cols-[130px_1fr_140px] items-center px-5 py-3 border-b border-grey-200 bg-grey-50">
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400">Change</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400">Person & company</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-grey-400 text-right">Effective</span>
        </div>
        {MOVES.map((m, i) => {
          const ts = TYPE_STYLES[m.type];
          return (
            <div
              key={i}
              className={`grid grid-cols-[110px_1fr_120px] sm:grid-cols-[130px_1fr_140px] items-center px-5 py-3.5 hover:bg-grey-50 transition-colors ${
                i < MOVES.length - 1 ? "border-b border-grey-100" : ""
              }`}
            >
              <span className={`inline-flex items-center gap-1 w-fit rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${ts.cls}`}>
                <ts.Icon className="h-3 w-3" strokeWidth={2.5} />
                {m.type}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-grey-900 truncate">{m.person}</span>
                  <span className="font-mono text-[11px] font-bold text-grey-400">{m.ticker}</span>
                </div>
                <div className="text-[12px] text-grey-500 truncate flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-grey-300" strokeWidth={2} />
                  {m.role} · {m.company}
                  {m.from && <span className="text-grey-400">· from {m.from}</span>}
                </div>
              </div>
              <span className="font-mono text-[12px] text-grey-400 text-right">{m.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
