import { RavenLogo } from "@/components/shared/RavenLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Nav({ page, go, user, onLogout }) {
  return (
    <nav className="flex justify-between items-center px-10 py-4 max-w-page mx-auto">
      <button
        onClick={() => go("landing")}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer"
      >
        <RavenLogo size={30} />
        <span className="font-extrabold text-xl text-grey-900 tracking-widest uppercase">
          RAVEN
        </span>
      </button>

      <div className="flex gap-1 items-center">
        {["dashboard", "pricing"].map((p) => (
          <Button
            key={p}
            variant="ghost"
            onClick={() => go(p)}
            className={`capitalize ${page === p ? "bg-grey-100 text-grey-900" : "text-grey-500"}`}
          >
            {p}
          </Button>
        ))}

        {user ? (
          <div className="flex items-center gap-2 ml-3">
            {user.subscription_status === "active" && (
              <Badge variant="orange" className="text-[10px] font-bold tracking-wide bg-raven-orange text-white">
                PRO
              </Badge>
            )}
            <span className="text-sm text-grey-500 font-mono">{user.email}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Log out
            </Button>
          </div>
        ) : (
          <Button className="ml-3" onClick={() => go("login")}>
            Log In
          </Button>
        )}
      </div>
    </nav>
  );
}
