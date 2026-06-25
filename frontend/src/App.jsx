import { useState, useEffect } from "react";
import { Nav } from "@/components/layout/Nav";
import { Landing } from "@/components/landing/Landing";
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

export default function App() {
  const [page, setPage] = useState("landing");
  const [ticker, setTicker] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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
      window.history.replaceState({}, "", "/");
      setPage("dashboard");
    }
  }, []);

  const isPro = user && user.subscription_status === "active";
  const handleLogout = () => {
    api.logout();
    setUser(null);
    setPage("landing");
  };

  return (
    <WatchlistProvider user={user} go={setPage}>
      <div className="min-h-screen bg-white">
        <Nav page={page} go={setPage} user={user} onLogout={handleLogout} />
        {page === "landing" && <Landing go={setPage} />}
        {page === "dashboard" && (
          <Dashboard go={setPage} setTicker={setTicker} user={user} isPro={isPro} />
        )}
        {page === "movements" && <MovementsDashboard go={setPage} />}
        {page === "superinvestors" && <SuperinvestorsDashboard go={setPage} />}
        {page === "insights" && <Insights go={setPage} />}
        {page === "post" && <Post go={setPage} />}
        {page === "watchlist" && <WatchlistPage go={setPage} user={user} setTicker={setTicker} />}
        {page === "company" && ticker && (
          <CompanyPage ticker={ticker} go={setPage} user={user} isPro={isPro} />
        )}
        {page === "pricing" && <PricingPage go={setPage} user={user} />}
        {page === "login" && <AuthPage go={setPage} setUser={setUser} />}
      </div>
    </WatchlistProvider>
  );
}
