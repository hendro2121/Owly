import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";

/* A star toggle for a ticker. Filled lime when watched. Stops propagation so
   it can sit inside clickable rows/cards without triggering their navigation. */
export function WatchlistStar({ ticker, size = 16, className = "" }) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(ticker);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(ticker); }}
      aria-label={watched ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
      title={watched ? "In your watchlist" : "Add to watchlist"}
      className={`inline-flex items-center justify-center rounded-md p-1 bg-transparent border-none cursor-pointer transition-colors hover:bg-grey-100 ${className}`}
    >
      <Star
        style={{ width: size, height: size }}
        strokeWidth={2.25}
        fill={watched ? "currentColor" : "none"}
        className={watched ? "text-lime-500" : "text-grey-300"}
      />
    </button>
  );
}
