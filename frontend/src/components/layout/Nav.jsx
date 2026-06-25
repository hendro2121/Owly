import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { RavenLogo } from "@/components/shared/RavenLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Nav({ page, go, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navTo = (to) => { setOpen(false); go(to); };

  // Dynamic header: transparent at the top, solid + blur + shadow once scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_ITEMS = [
    { label: "Dashboards", to: "dashboard", match: ["dashboard", "movements", "superinvestors", "company"] },
    { label: "Insights", to: "insights", match: ["insights", "post"] },
    ...(user ? [{ label: "Watchlist", to: "watchlist", match: ["watchlist"] }] : []),
    { label: "Pricing", to: "pricing", match: ["pricing"] },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl border-b border-grey-200 shadow-subtle"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div
        className={`relative flex items-center justify-between px-6 md:px-10 max-w-page mx-auto transition-all duration-300 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        {/* Logo — left */}
        <button
          onClick={() => navTo("landing")}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer group z-10"
        >
          <RavenLogo size={22} color="#0A0A0A" />
          <span className="font-bold text-[16px] text-grey-900 tracking-tight">Raven</span>
        </button>

        {/* Nav links — centered */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              size="sm"
              onClick={() => go(item.to)}
              className={`text-[13px] font-medium ${
                item.match.includes(page) ? "text-grey-900 bg-grey-100" : "text-grey-500"
              }`}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Actions — right */}
        <div className="hidden md:flex items-center gap-2 z-10">
          {user ? (
            <>
              {user.subscription_status === "active" && (
                <Badge variant="lime" className="text-[10px]">PRO</Badge>
              )}
              <span className="text-[13px] text-grey-400 font-mono hidden lg:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={onLogout} className="text-[13px]">
                Log out
              </Button>
            </>
          ) : (
            <Button variant="lime" size="sm" onClick={() => go("login")}>
              Log In
            </Button>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2 z-10">
          {!user && (
            <Button variant="lime" size="sm" onClick={() => navTo("login")}>
              Log In
            </Button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-grey-700 hover:bg-grey-100 transition-colors bg-transparent border-none cursor-pointer"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="md:hidden border-t border-grey-200 bg-white px-6 py-3 animate-fade-in">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.to}
              onClick={() => navTo(item.to)}
              className={`block w-full text-left py-2.5 text-[15px] font-medium bg-transparent border-none cursor-pointer ${
                item.match.includes(page) ? "text-grey-900" : "text-grey-500"
              }`}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <div className="mt-2 pt-3 border-t border-grey-100 flex items-center justify-between">
              <span className="text-[13px] text-grey-400 font-mono truncate">{user.email}</span>
              <Button variant="outline" size="sm" onClick={() => { setOpen(false); onLogout(); }} className="text-[13px] shrink-0">
                Log out
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
