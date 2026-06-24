import { useState, useEffect } from "react";
import { Star, ArrowRight, Bell, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/watchlist";
import { WatchlistStar } from "@/components/shared/WatchlistStar";
import { TransactionTag } from "@/components/shared/TransactionTag";
import { Flag } from "@/components/shared/Flag";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { fmtCur, fmt, dealColorHex } from "@/lib/format";
import api from "@/api";

const MARKETS = {
  JSE: "za", LSE: "gb", AMS: "nl", "Euronext AMS": "nl",
  NYSE: "us", NASDAQ: "us", ASX: "au", TSX: "ca",
};

export function WatchlistPage({ go, user, setTicker }) {
  const { count } = useWatchlist();
  const openCompany = (ticker) => { if (setTicker) setTicker(ticker); go("company"); };
  const [items, setItems] = useState([]);
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.watchlist().catch(() => ({ items: [] })),
      api.watchlistDigest(30).catch(() => null),
    ]).then(([w, d]) => {
      setItems(w.items || []);
      setDigest(d);
      setLoading(false);
    });
  }, [user, count]);

  /* Logged-out gate */
  if (!user) {
    return (
      <div className="max-w-page mx-auto px-6 md:px-10 pt-20 pb-24 text-center">
        <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-lime-200 mb-5">
          <Lock className="h-5 w-5 text-grey-900" strokeWidth={2.25} />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-grey-900">Your watchlist</h1>
        <p className="text-grey-500 mt-3 max-w-md mx-auto leading-relaxed">
          Track the companies you care about and get a monthly recap of every disclosure. Log in to start your watchlist.
        </p>
        <div className="flex justify-center gap-3 mt-7">
          <Button variant="lime" onClick={() => go("login")}>Log in</Button>
          <Button variant="outline" onClick={() => go("dashboard")}>Browse trades</Button>
        </div>
      </div>
    );
  }

  const trades = digest?.insider_trades || [];

  return (
    <div className="max-w-page mx-auto px-6 md:px-10 pt-10 pb-20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[28px] md:text-[32px] font-bold tracking-tight text-grey-900">Your Watchlist</h1>
          <p className="text-grey-500 mt-1.5 max-w-2xl leading-relaxed">
            Companies you’re tracking across insider trades, management movements and superinvestor holdings.
          </p>
        </div>
        <Button variant="outline" onClick={() => go("dashboard")} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Add companies
        </Button>
      </div>

      {/* Monthly recap notice */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-lime-300 bg-lime-50 px-4 py-3">
        <Bell className="h-4 w-4 text-grey-900 mt-0.5 shrink-0" strokeWidth={2} />
        <p className="text-sm text-grey-700 leading-relaxed">
          You’ll get a <strong>monthly recap</strong> of every disclosure for these companies.
          Email delivery is being switched on soon — your watchlist is saved and ready.
        </p>
      </div>

      {count === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-grey-300 bg-grey-50 px-6 py-16 text-center">
          <Star className="h-7 w-7 text-grey-300 mx-auto mb-3" strokeWidth={1.75} />
          <p className="text-grey-700 font-medium">You’re not tracking any companies yet</p>
          <p className="text-grey-400 text-sm mt-1 max-w-sm mx-auto">
            Tap the ☆ next to any company on the Insider Trades dashboard to add it here.
          </p>
          <Button variant="lime" onClick={() => go("dashboard")} className="mt-6">
            Find companies <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
          {/* Tracked companies */}
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium mb-4">
              Tracked companies · {count}
            </h2>
            <div className="space-y-2">
              {items.map((c) => (
                <div
                  key={c.ticker}
                  onClick={() => c.deal_count > 0 && openCompany(c.ticker)}
                  className={`flex items-center gap-3 rounded-xl border border-grey-200 bg-white px-4 py-3 transition-shadow ${
                    c.deal_count > 0 ? "hover:shadow-card cursor-pointer" : ""
                  }`}
                >
                  <WatchlistStar ticker={c.ticker} />
                  <CompanyLogo ticker={c.ticker} name={c.name} domain={c.website} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[13px] text-grey-900">{c.ticker}</span>
                      {MARKETS[c.market] && <Flag code={MARKETS[c.market]} size={14} />}
                    </div>
                    <div className="text-[13px] text-grey-500 truncate">{c.name || "—"}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold text-grey-900">{c.deal_count || 0}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-grey-400">deals</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent disclosures */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-grey-400 font-medium">
                Recent disclosures · last 30 days
              </h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold text-grey-500">LIVE</span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-grey-400 font-mono text-sm">Loading…</div>
            ) : trades.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-grey-300 bg-grey-50 px-6 py-12 text-center">
                <p className="text-grey-500 text-sm font-medium">No disclosures in the last 30 days</p>
                <p className="text-grey-400 text-xs font-mono mt-1">New activity for your companies will appear here.</p>
              </div>
            ) : (
              <div className="border border-grey-200 rounded-2xl overflow-hidden bg-white">
                {trades.map((d, i) => (
                  <div
                    key={d.id || i}
                    onClick={() => openCompany(d.ticker)}
                    className={`flex justify-between items-center py-3 px-4 hover:bg-grey-50 transition-colors cursor-pointer ${
                      i < trades.length - 1 ? "border-b border-grey-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TransactionTag type={d.transaction_type} />
                      <span className="font-bold font-mono text-[13px] text-grey-900">{d.ticker}</span>
                      <span className="text-grey-500 text-sm truncate">{d.director}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-grey-400">{fmt.d(d.transaction_date)}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: dealColorHex(d.transaction_type) }}>
                        {fmtCur(d.value, d.market || "JSE", d.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
