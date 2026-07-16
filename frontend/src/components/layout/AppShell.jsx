import { useState, useEffect, useRef } from "react";
import {
  Search, TrendingUp, Users, Crown, Star, Newspaper, Tag, LogOut, PanelLeft,
} from "lucide-react";
import { OwlyLogo } from "@/components/shared/OwlyLogo";

/* The application shell.

   The app used to wear a marketing layout — a website nav bar over a centred
   1200px column — which is why it read as a site rather than a tool. Investor
   platforms are chrome + surface: a persistent sidebar you navigate by muscle
   memory, a command bar you drive from the keyboard, and a full-bleed dense
   workspace. This is that shell; pages render inside it full width. */

const NAV = [
  {
    section: "Signals",
    items: [
      { id: "dashboard", label: "Insider Trades", icon: TrendingUp, kbd: "IT" },
      { id: "movements", label: "Management", icon: Users, kbd: "MG", beta: true },
      { id: "superinvestors", label: "Superinvestors", icon: Crown, kbd: "SI", beta: true },
    ],
  },
  {
    section: "Research",
    items: [
      { id: "watchlist", label: "Watchlist", icon: Star, kbd: "WL" },
      { id: "insights", label: "Insights", icon: Newspaper, kbd: "IN" },
      { id: "pricing", label: "Pricing", icon: Tag, kbd: "PR" },
    ],
  },
];

const ACTIVE_FOR = {
  dashboard: ["dashboard", "deals", "company"],
  movements: ["movements"],
  superinvestors: ["superinvestors"],
  watchlist: ["watchlist"],
  insights: ["insights", "post"],
  pricing: ["pricing"],
};

export function AppShell({ page, go, user, onLogout, search, onSearchChange, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const searchRef = useRef(null);

  // "/" focuses search, the convention every data platform uses.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") searchRef.current?.blur();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Sidebar ── */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-grey-800 bg-grey-900 transition-all duration-200 md:flex ${
          collapsed ? "w-[64px]" : "w-[216px]"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-grey-800 px-4">
          <button
            onClick={() => go("landing")}
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0"
            title="Back to owly.co"
          >
            <OwlyLogo size={20} />
            {!collapsed && <span className="text-[15px] font-semibold text-white">Owly</span>}
          </button>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="ml-auto cursor-pointer border-none bg-transparent p-1 text-grey-500 hover:text-white"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="mx-auto mt-2 cursor-pointer border-none bg-transparent p-1 text-grey-500 hover:text-white"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((group) => (
            <div key={group.section} className="mb-4">
              {!collapsed && (
                <div className="px-4 pb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-grey-600">
                  {group.section}
                </div>
              )}
              {group.items.map((item) => {
                const active = (ACTIVE_FOR[item.id] || [item.id]).includes(page);
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`flex w-full cursor-pointer items-center gap-2.5 border-none px-4 py-2 text-left text-[13px] transition-colors ${
                      active
                        ? "bg-grey-800 font-medium text-lime-400"
                        : "bg-transparent text-grey-400 hover:bg-grey-800/60 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.beta && (
                          <span className="rounded bg-grey-800 px-1 py-0.5 font-mono text-[8px] font-bold uppercase text-grey-500">
                            β
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[9px] text-grey-600">{item.kbd}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="border-t border-grey-800 p-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[10px] text-grey-500">{user.email}</div>
                  {user.subscription_status === "active" && (
                    <span className="mt-0.5 inline-block rounded bg-lime-400 px-1.5 py-0.5 font-mono text-[8px] font-bold text-grey-900">
                      PRO
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="cursor-pointer border-none bg-transparent p-1 text-grey-500 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => go("login")}
                className="w-full cursor-pointer rounded-lg border-none bg-lime-400 py-1.5 text-[12px] font-semibold text-grey-900 hover:bg-lime-300"
              >
                Log in
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-grey-200 bg-white/90 px-4 backdrop-blur-xl">
          {/* mobile brand */}
          <button
            onClick={() => go("dashboard")}
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent md:hidden"
          >
            <OwlyLogo size={18} />
          </button>

          <div className="relative flex max-w-[420px] flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-grey-400" strokeWidth={2.25} />
            <input
              ref={searchRef}
              value={search ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search a company, ticker or director…"
              className="h-9 w-full rounded-lg border border-grey-200 bg-grey-50 pl-9 pr-9 text-[13px] text-grey-900 outline-none transition-colors placeholder:text-grey-400 focus:border-grey-300 focus:bg-white"
            />
            <kbd className="pointer-events-none absolute right-3 rounded border border-grey-200 bg-white px-1.5 font-mono text-[10px] text-grey-400">
              /
            </kbd>
          </div>

          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-grey-400">Live</span>
          </span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
