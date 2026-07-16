import { useState, useEffect, useRef } from "react";
import {
  Search, TrendingUp, Users, Crown, Star, Newspaper, Tag, LogOut, PanelLeft,
} from "lucide-react";
import { OwlyLogo } from "@/components/shared/OwlyLogo";

/* The application shell: a quiet white sidebar, a command bar, and a workspace
   that is exactly one viewport tall. Nothing here scrolls — only the data does,
   inside its own surface. Chrome stays out of the way; the table is the product. */

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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Sidebar ── */}
      <aside
        className={`hidden h-screen shrink-0 flex-col border-r border-grey-200 bg-white transition-all duration-200 md:flex ${
          collapsed ? "w-[60px]" : "w-[208px]"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <button
            onClick={() => go("landing")}
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0"
            title="Back to owly.co"
          >
            <OwlyLogo size={19} />
            {!collapsed && <span className="text-[14px] font-bold tracking-[0.02em] text-grey-900">OWLY</span>}
          </button>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse"
              className="ml-auto cursor-pointer border-none bg-transparent p-1 text-grey-300 hover:text-grey-600"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand"
            className="mx-auto cursor-pointer border-none bg-transparent p-1 text-grey-300 hover:text-grey-600"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </button>
        )}

        <nav className="min-h-0 flex-1 overflow-y-auto pt-2">
          {NAV.map((group) => (
            <div key={group.section} className="mb-6">
              {!collapsed && (
                <div className="px-4 pb-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-grey-400">
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
                    className={`relative flex w-full cursor-pointer items-center gap-2.5 border-none px-4 py-[7px] text-left text-[13px] transition-colors ${
                      active
                        ? "bg-lime-50 font-medium text-grey-900"
                        : "bg-transparent text-grey-600 hover:bg-grey-50 hover:text-grey-900"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-0 h-full w-[2px] bg-lime-400" />}
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.beta && <span className="ml-auto font-mono text-[8px] font-bold text-grey-300">β</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="shrink-0 border-t border-grey-100 p-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[10px] text-grey-400">{user.email}</div>
                  {user.subscription_status === "active" && (
                    <span className="mt-1 inline-block rounded bg-lime-200 px-1.5 py-0.5 font-mono text-[8px] font-bold text-grey-900">
                      PRO
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="cursor-pointer border-none bg-transparent p-1 text-grey-300 hover:text-grey-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => go("login")}
                className="w-full cursor-pointer rounded-lg border-none bg-grey-900 py-1.5 text-[12px] font-semibold text-white hover:bg-grey-800"
              >
                Log in
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-grey-100 px-5">
          <button
            onClick={() => go("dashboard")}
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent md:hidden"
          >
            <OwlyLogo size={18} />
          </button>

          <div className="relative flex max-w-[380px] flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-grey-300" strokeWidth={2} />
            <input
              ref={searchRef}
              value={search ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search a company, ticker or director…"
              className="h-8 w-full rounded-lg border border-grey-200 bg-white pl-9 pr-8 text-[13px] text-grey-900 outline-none transition-colors placeholder:text-grey-400 focus:border-grey-400"
            />
            <kbd className="pointer-events-none absolute right-2.5 rounded border border-grey-200 px-1.5 font-mono text-[10px] text-grey-300">
              /
            </kbd>
          </div>

          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-grey-400">Live</span>
          </span>
        </header>

        {/* One viewport tall. Only the data surface inside scrolls. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
