import { useState, useEffect } from "react";
import { Nav } from "@/components/layout/Nav";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { MovementsDashboard } from "@/components/dashboard/MovementsDashboard";
import { SuperinvestorsDashboard } from "@/components/dashboard/SuperinvestorsDashboard";
import { Insights } from "@/components/insights/Insights";
import { Post } from "@/components/insights/Post";
import { WatchlistPage } from "@/components/watchlist/WatchlistPage";
import { CompanyPage } from "@/components/company/CompanyPage";
import { PricingPage } from "@/components/pricing/PricingPage";
import { AuthPage } from "@/components/auth/AuthPage";
import { WatchlistProvider } from "@/lib/watchlist";
import api from "./api";

/* The marketing landing is a standalone static page served at "/" — this app is
   mounted at "/app". Landing CTAs deep-link in via ?p=<page>. */
const PAGES = [
  "dashboard", "deals", "movements", "superinvestors",
  "insights", "post", "watchlist", "company", "pricing", "login",
];

function initialPage() {
  const p = new URLSearchParams(window.location.search).get("p");
  return PAGES.includes(p) ? p : "dashboard";
}

export default function App() {
  const [page, setPage] = useState(initialPage);
  const [ticker, setTicker] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // "landing" is no longer a React page — send those links to the static one.
  const go = (p) => {
    if (p === "landing") {
      window.location.href = "/";
      return;
    }
    setPage(p);
  };

  useEffect(() => {
    if (api.getToken()) {
      api.me()
        .then((u) => setUser(u))
        .catch(() => { api.logout(); setUser(null); })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      if (api.getToken()) {
        api.me().then((u) => setUser(u)).catch(() => {});
      }
      window.history.replaceState({}, "", "/app");
      setPage("dashboard");
    }
  }, []);

  const isPro = user && user.subscription_status === "active";
  const handleLogout = () => {
    api.logout();
    setUser(null);
    go("landing");
  };

  return (
    <WatchlistProvider user={user} go={go}>
      <div className="min-h-screen bg-white">
        <Nav page={page} go={go} user={user} onLogout={handleLogout} />
        {/* The deals workbench IS the dashboard — "dashboard" and "deals" both
            land here so every existing link and the landing CTA keep working. */}
        {(page === "dashboard" || page === "deals") && (
          <Dashboard go={go} setTicker={setTicker} user={user} isPro={isPro} />
        )}
        {page === "movements" && <MovementsDashboard go={go} />}
        {page === "superinvestors" && <SuperinvestorsDashboard go={go} />}
        {page === "insights" && <Insights go={go} />}
        {page === "post" && <Post go={go} />}
        {page === "watchlist" && <WatchlistPage go={go} user={user} setTicker={setTicker} />}
        {page === "company" && ticker && (
          <CompanyPage ticker={ticker} go={go} user={user} isPro={isPro} />
        )}
        {page === "pricing" && <PricingPage go={go} user={user} />}
        {page === "login" && <AuthPage go={go} setUser={setUser} />}
      </div>
    </WatchlistProvider>
  );
}
