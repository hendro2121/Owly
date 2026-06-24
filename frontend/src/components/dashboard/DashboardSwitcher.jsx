import { TrendingUp, Users, Crown } from "lucide-react";

/* The three Raven dashboards. #1 runs on live data; #2 and #3 are in beta,
   rendering representative sample data until their feeds are wired up. */
export const DASHBOARDS = [
  { id: "dashboard", label: "Insider Trades", short: "Trades", icon: TrendingUp, beta: false },
  { id: "movements", label: "Management Movements", short: "Movements", icon: Users, beta: true },
  { id: "superinvestors", label: "Superinvestors", short: "Superinvestors", icon: Crown, beta: true },
];

export function DashboardSwitcher({ page, go }) {
  return (
    <div className="-mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex items-center gap-1 rounded-full bg-grey-100 p-1">
        {DASHBOARDS.map((d) => {
        const active = page === d.id;
        return (
          <button
            key={d.id}
            onClick={() => go(d.id)}
            className={`relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all ${
              active
                ? "bg-white text-grey-900 shadow-subtle"
                : "text-grey-500 hover:text-grey-900"
            }`}
          >
            <d.icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="hidden sm:inline">{d.label}</span>
            <span className="sm:hidden">{d.short}</span>
            {d.beta && (
              <span className="rounded-full bg-lime-200 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wide text-grey-900">
                Beta
              </span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}
