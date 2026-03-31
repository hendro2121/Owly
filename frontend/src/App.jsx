import { useState, useEffect } from "react";
import { Nav } from "@/components/layout/Nav";
import { Landing } from "@/components/landing/Landing";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { CompanyPage } from "@/components/company/CompanyPage";
import { PricingPage } from "@/components/pricing/PricingPage";
import { AuthPage } from "@/components/auth/AuthPage";
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
    <div className="min-h-screen bg-white">
      <Nav page={page} go={setPage} user={user} onLogout={handleLogout} />
      {page === "landing" && <Landing go={setPage} />}
      {page === "dashboard" && (
        <Dashboard go={setPage} setTicker={setTicker} user={user} isPro={isPro} />
      )}
      {page === "company" && ticker && (
        <CompanyPage ticker={ticker} go={setPage} user={user} isPro={isPro} />
      )}
      {page === "pricing" && <PricingPage go={setPage} user={user} />}
      {page === "login" && <AuthPage go={setPage} setUser={setUser} />}
    </div>
  );
}
