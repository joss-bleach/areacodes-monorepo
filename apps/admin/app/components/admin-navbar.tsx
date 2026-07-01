import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { authClient } from "~/lib/auth-client";

const NAV_LINKS = [
  { to: "/dashboard/", label: "Overview", exact: true },
  { to: "/dashboard/businesses", label: "Businesses", exact: false },
  { to: "/dashboard/vouchers", label: "Vouchers", exact: false },
  { to: "/dashboard/audit-log", label: "Audit Log", exact: false },
  { to: "/dashboard/pilot-features", label: "Pilot Features", exact: false },
  { to: "/dashboard/analytics", label: "Analytics", exact: false },
] as const;

export const AdminNavbar = () => {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const initial = (session?.user.name?.[0] ?? session?.user.email?.[0] ?? "?").toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/sign-in" });
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="mx-auto max-w-6xl px-6">
        {/* Top row: logo + avatar */}
        <div className="flex items-center justify-between py-3">
          <Link to="/dashboard/" className="text-sm font-bold uppercase tracking-wide text-foreground">
            Areacodes <span className="text-muted-foreground font-normal">Admin</span>
          </Link>
          {isMounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          )}
        </div>

        {/* Nav links row - scrollable on small screens */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-px scrollbar-none -mx-6 px-6">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              className="shrink-0 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent whitespace-nowrap"
              activeProps={{ className: "shrink-0 px-3 py-2 text-sm text-foreground font-medium border-b-2 border-foreground whitespace-nowrap transition-colors" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
