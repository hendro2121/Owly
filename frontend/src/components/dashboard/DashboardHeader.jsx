import { Info } from "lucide-react";
import { DashboardSwitcher } from "./DashboardSwitcher";

export function DashboardHeader({ page, go, title, subtitle, beta }) {
  return (
    <div className="pt-7 pb-6">
      <DashboardSwitcher page={page} go={go} />

      <div className="mt-7">
        <h1 className="font-display text-[28px] md:text-[32px] font-bold tracking-tight text-grey-900">
          {title}
        </h1>
        <p className="text-grey-500 mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>
      </div>

      {beta && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-lime-300 bg-lime-50 px-4 py-3">
          <span className="mt-0.5 shrink-0 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wide text-grey-900">
            Beta
          </span>
          <p className="text-sm text-grey-700 leading-relaxed">
            <Info className="inline h-3.5 w-3.5 mb-0.5 mr-1 text-grey-500" strokeWidth={2} />
            Showing representative sample data. The live {beta} feed is being wired up — the layout and signals below preview what you’ll see once it’s on.
          </p>
        </div>
      )}
    </div>
  );
}
