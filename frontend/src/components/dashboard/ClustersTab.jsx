import { fmtCur, fmt } from "@/lib/format";

export function ClustersTab({ clusters, market, onCompanyClick }) {
  const cur = (v) => fmtCur(v, market || "JSE");

  return (
    <div>
      <p className="text-[15px] text-grey-500 mb-5 leading-relaxed max-w-xl">
        When multiple directors buy their own company's stock around the same time, it often
        signals they believe the price will rise. These are{" "}
        <strong className="text-grey-900">cluster buys</strong>.
      </p>

      {clusters.length === 0 ? (
        <div className="py-10 text-center font-mono text-sm text-grey-400">
          No cluster signals detected yet.
        </div>
      ) : (
        <div className="space-y-0">
          {clusters.map((c, i) => (
            <div
              key={i}
              onClick={() => onCompanyClick(c.ticker)}
              className={`py-6 cursor-pointer transition-all hover:pl-2 border-b border-grey-200 ${
                i === 0 ? "border-t-2 border-t-grey-900" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-mono font-extrabold text-[22px]">{c.ticker}</span>
                  <span className="text-grey-400 ml-3 text-base">{c.company}</span>
                </div>
                <span className="px-3.5 py-1 rounded-lg bg-raven-orange-light font-mono text-xs font-bold text-raven-orange">
                  {c.insider_count} insiders buying
                </span>
              </div>

              {(c.directors || []).map((d, j) => (
                <div
                  key={j}
                  className={`flex justify-between py-2 ${j > 0 ? "border-t border-grey-100" : ""}`}
                >
                  <div>
                    <span className="font-medium text-sm">{d.name}</span>
                    <span className="text-grey-400 text-[11px] font-mono ml-2.5">{d.role}</span>
                  </div>
                  <div className="flex gap-5 items-center">
                    <span className="font-mono text-[11px] text-grey-400">{fmt.d(d.date)}</span>
                    <span className="font-mono text-[13px] font-bold text-buy">{cur(d.value)}</span>
                  </div>
                </div>
              ))}

              <div className="mt-3.5 text-[10px] font-mono text-grey-400 uppercase tracking-wide">
                Combined{" "}
                <span className="font-extrabold text-grey-900 text-lg ml-2">{cur(c.total_value)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
