import { ArrowRight, ArrowUpRight } from "lucide-react";

const FEATURED = {
  category: "Guide",
  title: "How to read director dealings",
  excerpt:
    "Insiders know their business better than anyone outside it. When they buy or sell their own shares, they leave a trail — here’s how to tell a real signal from the noise.",
  readTime: "12 min read",
  date: "Jun 2026",
};

/* Upcoming pieces — each maps to a part of the product. */
const UPCOMING = [
  { category: "Playbook", title: "What a cluster buy really tells you", blurb: "Why three insiders buying at once is the signal professionals act on." },
  { category: "Analysis", title: "Reading a new CEO", blurb: "How management movements between companies foreshadow a change in strategy." },
  { category: "Profiles", title: "Following the superinvestors", blurb: "Using holdings disclosures to see where the smart money is building positions." },
  { category: "Explainer", title: "Vesting, options & tax sales", blurb: "The non-discretionary noise to strip out before you read any filing." },
];

export function Insights({ go }) {
  return (
    <div className="max-w-page mx-auto px-6 md:px-10 pt-12 pb-20">
      {/* Header */}
      <div className="max-w-2xl">
        <div className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium mb-3">
          Insights
        </div>
        <h1 className="font-display text-[40px] md:text-[52px] font-bold tracking-tight leading-[1.05] text-grey-900">
          Field notes on the smart money.
        </h1>
        <p className="text-lg text-grey-500 leading-relaxed mt-5">
          How to read insider activity, management moves and superinvestor disclosures — plain-English
          guides from the Owly team.
        </p>
      </div>

      {/* Featured */}
      <button
        onClick={() => go("post")}
        className="group mt-12 w-full text-left bg-transparent border-none cursor-pointer p-0"
      >
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0 rounded-2xl border border-grey-200 overflow-hidden hover:shadow-elevated transition-shadow">
          <div className="p-8 md:p-10 flex flex-col">
            <span className="w-fit rounded-full bg-lime-200 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wide text-grey-900">
              {FEATURED.category}
            </span>
            <h2 className="font-display text-[28px] md:text-[34px] font-bold tracking-tight leading-[1.1] text-grey-900 mt-5">
              {FEATURED.title}
            </h2>
            <p className="text-grey-500 leading-relaxed mt-4 max-w-md">{FEATURED.excerpt}</p>
            <div className="flex items-center gap-3 mt-auto pt-8">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-grey-900 group-hover:gap-2.5 transition-all">
                Read the guide
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-mono text-grey-400">· {FEATURED.readTime}</span>
            </div>
          </div>
          {/* Visual panel */}
          <div className="relative bg-grey-900 min-h-[220px] overflow-hidden hidden lg:block">
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div className="absolute inset-0 flex items-center justify-center p-10">
              <div className="font-mono text-lime-400 text-[13px] leading-relaxed">
                <div className="text-grey-500">// open-market buys</div>
                <div className="mt-2">NPN <span className="text-white">▲ R12.4m</span></div>
                <div>FSR <span className="text-white">▲ R8.1m</span></div>
                <div>SBK <span className="text-white">▲ R5.9m</span></div>
                <div className="text-grey-500 mt-2">// 3 insiders · cluster</div>
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Upcoming */}
      <div className="mt-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium">
            More in the series
          </h2>
          <span className="text-[11px] font-mono text-grey-400">Publishing weekly</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {UPCOMING.map((a, i) => (
            <div
              key={i}
              className="rounded-2xl border border-grey-200 bg-white p-6 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-grey-500">
                  {a.category}
                </span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wide text-grey-400 border border-grey-200 rounded-full px-2 py-0.5">
                  Soon
                </span>
              </div>
              <h3 className="text-lg font-bold text-grey-900 mt-3">{a.title}</h3>
              <p className="text-sm text-grey-500 leading-relaxed mt-1.5">{a.blurb}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-14 rounded-2xl border border-grey-200 bg-grey-50 px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h3 className="text-xl font-bold text-grey-900">Read the data behind the writing</h3>
          <p className="text-grey-500 text-sm mt-1">Every guide is built on Owly’s live dashboards.</p>
        </div>
        <button
          onClick={() => go("dashboard")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-grey-900 bg-transparent border-none cursor-pointer hover:gap-2.5 transition-all shrink-0"
        >
          Explore the dashboards
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
