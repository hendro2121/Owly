import { RavenLogo } from "@/components/shared/RavenLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Nav({ page, go, user, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-grey-200 bg-white/80 backdrop-blur-xl">
      <div className="flex justify-between items-center px-10 py-3 max-w-page mx-auto">
        <button
          onClick={() => go("landing")}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer"
        >
          <RavenLogo size={22} color="#0D4F4F" />
          <span className="font-semibold text-[15px] text-grey-900 tracking-tight">
            Raven
          </span>
        </button>

        <div className="flex gap-1 items-center">
          {["dashboard", "pricing"].map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              onClick={() => go(p)}
              className={`capitalize text-[13px] ${
                page === p ? "text-grey-900 bg-grey-100" : "text-grey-400"
              }`}
            >
              {p}
            </Button>
          ))}

          {user ? (
            <div className="flex items-center gap-2 ml-3">
              {user.subscription_status === "active" && (
                <Badge variant="teal" className="text-[10px]">PRO</Badge>
              )}
              <span className="text-[13px] text-grey-400 font-mono">{user.email}</span>
              <Button variant="outline" size="sm" onClick={onLogout} className="text-[13px]">
                Log out
              </Button>
            </div>
          ) : (
            <Button className="ml-3" size="sm" onClick={() => go("login")}>
              Log In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
