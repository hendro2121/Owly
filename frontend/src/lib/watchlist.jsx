import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/api";

/* Shared watchlist state. Holds the set of watched tickers so any component
   (deal rows, company cards, the watchlist page) can read/toggle without
   prop-drilling. Toggling optimistically updates, then syncs to the backend. */

const WatchlistCtx = createContext({
  tickers: new Set(),
  count: 0,
  loading: false,
  isWatched: () => false,
  toggle: () => {},
  refresh: () => {},
});

export function WatchlistProvider({ user, go, children }) {
  const [tickers, setTickers] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!user) { setTickers(new Set()); return; }
    setLoading(true);
    api.watchlist()
      .then((d) => setTickers(new Set((d.tickers || []).map((t) => t.toUpperCase()))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isWatched = useCallback((t) => tickers.has((t || "").toUpperCase()), [tickers]);

  const toggle = useCallback(async (t) => {
    const ticker = (t || "").toUpperCase();
    if (!ticker) return;
    if (!user) { go && go("login"); return; }

    const wasWatched = tickers.has(ticker);
    // Optimistic update
    setTickers((prev) => {
      const next = new Set(prev);
      if (wasWatched) next.delete(ticker);
      else next.add(ticker);
      return next;
    });

    try {
      if (wasWatched) await api.removeWatch(ticker);
      else await api.addWatch(ticker);
    } catch {
      refresh(); // revert to server truth on failure
    }
  }, [user, go, tickers, refresh]);

  return (
    <WatchlistCtx.Provider value={{ tickers, count: tickers.size, loading, isWatched, toggle, refresh }}>
      {children}
    </WatchlistCtx.Provider>
  );
}

export const useWatchlist = () => useContext(WatchlistCtx);
