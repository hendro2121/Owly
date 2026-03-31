import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/api";

export function PricingPage({ go, user }) {
  const [loading, setLoading] = useState(false);
  const isPro = user && user.subscription_status === "active";

  const handleUpgrade = async () => {
    if (!user) { go("login"); return; }
    if (isPro) {
      try {
        setLoading(true);
        const r = await api.createPortal();
        window.location.href = r.portal_url;
      } catch (e) { alert(e.message); }
      finally { setLoading(false); }
      return;
    }
    try {
      setLoading(true);
      const r = await api.createCheckout();
      window.location.href = r.checkout_url;
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const plans = [
    {
      name: "FREE",
      price: "R0",
      per: "forever",
      desc: "See what's happening on the JSE.",
      feats: ["Latest 10 director deals", "Basic search", "24-hour delay"],
      dark: false,
      action: () => go("dashboard"),
      btn: "Get Started",
    },
    {
      name: "PRO",
      price: "R70",
      per: "/month",
      desc: "Full access for serious investors.",
      feats: [
        "All deals in real-time",
        "Cluster buy alerts",
        "Sector flow analysis",
        "Company profiles",
        "Email watchlist alerts",
        "CSV export",
      ],
      dark: true,
      pop: true,
      action: handleUpgrade,
      btn: isPro ? "Manage Subscription" : user ? "Upgrade Now" : "Sign Up to Upgrade",
    },
  ];

  return (
    <div className="max-w-[1060px] mx-auto px-10 pt-14 pb-18">
      <h1 className="text-[52px] font-extrabold tracking-tighter uppercase text-center animate-rise">
        SIMPLE <span className="italic text-raven-orange">PRICING</span>
      </h1>
      <p className="text-center text-grey-500 text-base mt-3 mb-12 animate-rise" style={{ animationDelay: ".05s" }}>
        Start free. Upgrade when Raven proves its value.
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-[700px] mx-auto">
        {plans.map((p, i) => (
          <Card
            key={i}
            className={`p-8 flex flex-col animate-rise relative ${
              p.dark
                ? "bg-grey-900 border-grey-900 text-white"
                : "bg-white"
            }`}
            style={{ animationDelay: `${0.1 + i * 0.06}s` }}
          >
            {p.pop && (
              <Badge className="absolute top-4 right-4 bg-raven-orange text-white text-[11px] font-bold uppercase tracking-wide">
                Popular
              </Badge>
            )}

            <div className="text-sm font-bold tracking-wide mb-2">{p.name}</div>
            <div className="mb-3">
              <span className="text-[44px] font-extrabold tracking-tight">{p.price}</span>
              <span className={`text-sm ml-1 ${p.dark ? "text-grey-500" : "text-grey-400"}`}>
                {p.per}
              </span>
            </div>
            <div className={`text-sm mb-7 leading-relaxed ${p.dark ? "text-grey-500" : "text-grey-500"}`}>
              {p.desc}
            </div>

            <div className="flex-1 space-y-2.5">
              {p.feats.map((ft, j) => (
                <div
                  key={j}
                  className={`flex items-center gap-2.5 text-sm ${
                    p.dark ? "text-grey-300" : "text-grey-600"
                  }`}
                >
                  <Check className="h-4 w-4 text-raven-orange shrink-0" strokeWidth={2.5} />
                  {ft}
                </div>
              ))}
            </div>

            <Button
              onClick={p.action}
              disabled={loading}
              variant={p.dark ? "default" : "outline"}
              className="w-full mt-7 h-11"
            >
              {loading ? "..." : p.btn}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
