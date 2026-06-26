import { Plus, ArrowUp, ArrowDown, LogOut } from "lucide-react";
import { DashboardHeader } from "./DashboardHeader";
import { StatCard } from "@/components/shared/StatCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

/* Illustrative sample data — fictional funds, not real disclosures.
   Replaces once the major-shareholding (TR-1 / beneficial-interest) feed is wired up. */
const STATS = [
  { label: "Tracked investors", value: "32" },
  { label: "New positions · 30d", value: "11" },
  { label: "Net flow · 30d", value: "R4.6bn" },
  { label: "Most-held name", value: "NPN" },
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
  Exited: { cls: "bg-sell-bg text-sell", Icon: LogOut },
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
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Holdings moves — clean table on the shared primitives */}
      <div className="rounded-2xl border border-grey-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between bg-grey-900 px-5 py-3.5">
          <span className="text-white font-medium text-[15px]">Recent position changes</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-grey-400">Live</span>
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b border-grey-200 hover:bg-transparent">
              <TableHead className="pl-5">Investor &amp; position</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead className="text-right pr-5">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOVES.map((m, i) => {
              const a = ACTION_STYLES[m.action];
              return (
                <TableRow key={i}>
                  <TableCell className="pl-5 py-3.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${a.cls}`}>
                        <a.Icon className="h-3 w-3" strokeWidth={2.5} />
                        {m.action}
                      </span>
                      <span className="font-medium text-[14px] text-grey-900 truncate">{m.investor}</span>
                    </div>
                    <div className="text-[12px] text-grey-500 mt-0.5 truncate">
                      <span className="font-mono font-bold text-grey-400">{m.ticker}</span> · {m.company} · {m.date}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3.5 font-mono text-[13px] font-bold text-grey-900">
                    {m.stake}
                  </TableCell>
                  <TableCell className="text-right pr-5 py-3.5 font-mono text-[13px] font-bold text-grey-900">
                    {m.value}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
