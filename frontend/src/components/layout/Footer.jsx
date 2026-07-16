import { OwlyLogo } from "@/components/shared/OwlyLogo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Insider Trades", to: "dashboard" },
      { label: "Management Movements", to: "movements" },
      { label: "Superinvestors", to: "superinvestors" },
      { label: "Watchlist", to: "watchlist" },
      { label: "Pricing", to: "pricing" },
    ],
  },
  {
    title: "Insights",
    links: [
      { label: "All articles", to: "insights" },
      { label: "How to read director dealings", to: "post" },
      { label: "Methodology" },
      { label: "Changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About" },
      { label: "Careers" },
      { label: "Newsroom" },
      { label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service" },
      { label: "Privacy Policy" },
      { label: "Disclaimer" },
      { label: "Security" },
    ],
  },
];

function Social({ label, href, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      onClick={(e) => e.preventDefault()}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-grey-300 hover:bg-white/20 hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}

export function Footer({ go }) {
  const nav = (to) => to && go(to);

  return (
    <footer className="bg-grey-900 text-white">
      <div className="max-w-page mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid lg:grid-cols-[1.4fr_2.6fr] gap-12 lg:gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <button onClick={() => go("landing")} className="flex items-center gap-2 bg-transparent border-none cursor-pointer">
              <OwlyLogo size={24} color="#D4F000" />
              <span className="font-bold text-[18px] tracking-tight">Owly</span>
            </button>
            <p className="text-grey-400 text-sm leading-relaxed mt-4">
              Insider-dealing intelligence for the JSE and beyond. Follow the smart money before the market moves.
            </p>
            <div className="flex items-center gap-2.5 mt-6">
              <Social label="X" href="#">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </Social>
              <Social label="LinkedIn" href="#">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </Social>
              <Social label="Email" href="#">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
              </Social>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="text-[11px] font-mono uppercase tracking-widest text-grey-500 mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => nav(l.to)}
                        className={`text-[14px] text-grey-300 bg-transparent border-none p-0 text-left transition-colors ${
                          l.to ? "hover:text-white cursor-pointer" : "cursor-default hover:text-grey-300"
                        }`}
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <span className="text-[12px] text-grey-500 font-mono">
            © {new Date().getFullYear()} Owly · Data sourced from exchange regulatory filings. Not financial advice.
          </span>
          <div className="flex items-center gap-2 text-[12px] font-mono text-grey-500">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
