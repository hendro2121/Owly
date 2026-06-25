import { ArrowLeft, TrendingUp, Users, Layers, Scale, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/* The cornerstone guide. Educational content — deliberately framed as
   "how to read the signal", not investment advice. */

function H2({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[24px] font-extrabold tracking-tight text-grey-900 mt-12 mb-4 scroll-mt-24">
      {Icon && (
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-lime-200 shrink-0">
          <Icon className="h-4 w-4 text-grey-900" strokeWidth={2.25} />
        </span>
      )}
      {children}
    </h2>
  );
}

function P({ children }) {
  return <p className="text-[16.5px] leading-[1.75] text-grey-700 mb-4">{children}</p>;
}

function Callout({ children }) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-lime-400 bg-lime-50 px-5 py-4 text-[15px] leading-relaxed text-grey-800">
      {children}
    </div>
  );
}

export function Post({ go }) {
  return (
    <article className="max-w-[760px] mx-auto px-6 md:px-10 pt-10 pb-20">
      <button
        onClick={() => go("insights")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-grey-500 hover:text-grey-900 transition-colors mb-8 bg-transparent border-none cursor-pointer group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Insights
      </button>

      <div className="flex items-center gap-2 mb-5">
        <span className="rounded-full bg-lime-200 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wide text-grey-900">
          Guide
        </span>
        <span className="text-[13px] font-mono text-grey-400">12 min read · The fundamentals</span>
      </div>

      <h1 className="font-display text-[34px] md:text-[44px] font-bold tracking-tight leading-[1.08] text-grey-900">
        How to read director dealings
      </h1>
      <p className="text-[19px] leading-relaxed text-grey-500 mt-5">
        Insiders know their business better than anyone on the outside. When they buy or sell their own
        shares, they leave a trail. Here is how to tell a real signal from the noise.
      </p>

      <div className="flex items-center gap-3 mt-7 pb-8 border-b border-grey-200">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-grey-900 text-white text-xs font-bold font-mono">R</span>
        <div>
          <div className="text-[13px] font-semibold text-grey-900">The Raven Team</div>
          <div className="text-[12px] font-mono text-grey-400">Updated June 2026</div>
        </div>
      </div>

      <div className="mt-8">
        <P>
          Every director, CEO and CFO of a listed company is also, usually, a shareholder in it. When they
          trade those shares, the law requires them to disclose it — on the JSE through a SENS announcement,
          in the UK through an RNS, in the US through an SEC Form 4. That disclosure is one of the few moments
          the people who run a business reveal what they actually think of its prospects with their own money.
        </P>
        <P>
          But the raw filings are noisy. Most of what gets reported isn’t a conviction trade at all — it’s
          options vesting, tax-driven sales, or scheme allocations. Reading director dealings well is mostly
          about learning what to ignore. Here’s the framework Raven is built around.
        </P>

        <H2 icon={TrendingUp}>1. Buys matter more than sells</H2>
        <P>
          This is the single most important asymmetry. An insider can sell for a hundred reasons that have
          nothing to do with the company: a divorce, a house, a tax bill, diversifying a fortune that’s 90%
          tied up in one stock. A sell tells you very little on its own.
        </P>
        <P>
          A purchase is different. There is really only one reason an insider takes money out of their own
          pocket to buy more of a company they’re already heavily exposed to: they believe the shares are
          worth more than the price. Open-market buys are the signal worth leaning on.
        </P>
        <Callout>
          <strong>Rule of thumb:</strong> weight buys heavily, treat isolated sells as low-information, and
          only worry about selling when it’s the CEO or CFO dumping a large slice of their holding at once.
        </Callout>

        <H2 icon={Layers}>2. Separate conviction from admin</H2>
        <P>
          A huge share of disclosed “dealings” are non-discretionary — the insider didn’t choose to trade,
          the calendar did. Filter these out before you read anything into a filing:
        </P>
        <P>
          <strong>Vesting & option exercises</strong> are pay, not a market call. <strong>Tax sales</strong>{" "}
          (selling just enough to cover the tax on shares received) are mechanical. <strong>Scheme and trust
          allocations</strong> are corporate plumbing. None of these reflect a view on value. What you want is
          the discretionary <em>open-market purchase</em> — real money, freely chosen.
        </P>

        <H2 icon={Users}>3. Cluster buying is the strongest tell</H2>
        <P>
          One insider buying is interesting. Three or four insiders at the same company buying within a few
          weeks of each other is the signal professionals actually act on. A single person can be wrong, or
          buying for optics. A cluster is much harder to fake — it means the people closest to the numbers
          independently reached the same conclusion at the same time.
        </P>
        <Callout>
          Cluster buys around a results announcement or after a sharp price fall are especially worth a
          second look — the insiders have just seen the full picture and are voting with their wallets.
        </Callout>

        <H2 icon={Scale}>4. Size and role give it weight</H2>
        <P>
          Context turns a data point into a signal. Ask two questions of any buy:
        </P>
        <P>
          <strong>How big is it relative to the person?</strong> A R200,000 purchase from a director earning
          R20m a year is rounding error. The same purchase from someone on a R1.5m salary is conviction. Size
          the trade against the person’s wealth, not the company’s market cap.
        </P>
        <P>
          <strong>Who is it?</strong> A CEO or CFO sees the full forward picture — guidance, the pipeline, the
          balance sheet — long before the market does. Their buying carries more information than a
          non-executive director who attends a few board meetings a year.
        </P>

        <H2 icon={Clock}>5. Timing and price context</H2>
        <P>
          The most powerful purchases tend to come when they’re least comfortable to make: after a profit
          warning, during a sector sell-off, or when sentiment is at its worst. An insider buying into a
          falling price is telling you they think the market has overreacted. Buying at all-time highs is a
          weaker signal — momentum, not value.
        </P>

        <H2 icon={AlertTriangle}>6. What it can’t tell you</H2>
        <P>
          Director dealings are a signal, not a crystal ball. Insiders are often early, and sometimes simply
          wrong — they’re optimistic about their own company by nature. Disclosures also lag the trade by a
          day or more, and a buy tells you nothing about position sizing or your own risk tolerance. Use it as
          one input that sharpens a thesis you’ve built other ways, never as a standalone reason to act.
        </P>

        <H2>Putting it together with Raven</H2>
        <P>
          Raven exists to do the filtering for you: it scrapes every SENS dealing, strips out the vesting,
          tax and scheme noise, flags cluster buys across multiple insiders, and lets you size each trade by
          role and value. The goal isn’t to tell you what to buy — it’s to make sure you never miss the
          handful of trades that actually carry information.
        </P>

        <div className="mt-10 rounded-2xl bg-grey-900 px-7 py-8 text-center">
          <h3 className="text-xl font-bold text-white">See the signal live</h3>
          <p className="text-grey-400 text-sm mt-2 mb-5 max-w-sm mx-auto">
            Open the Insider Conviction dashboard to see today’s open-market buys, filtered and ranked.
          </p>
          <Button variant="lime" onClick={() => go("dashboard")}>
            Open the dashboard
          </Button>
        </div>

        <p className="text-[12px] font-mono text-grey-400 leading-relaxed mt-8 pt-6 border-t border-grey-200">
          This article is educational and does not constitute financial advice. Raven aggregates public
          regulatory filings; always do your own research and consider professional advice before investing.
        </p>
      </div>
    </article>
  );
}
