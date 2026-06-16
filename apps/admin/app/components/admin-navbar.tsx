import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { authClient } from "~/lib/auth-client";

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
    <header className="py-4 bg-background border-b border-border">
      <nav className="mx-auto max-w-6xl px-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-sm font-semibold text-foreground">
            Areacodes Admin
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              to="/dashboard"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Overview
            </Link>
            <Link
              to="/dashboard/businesses"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Businesses
            </Link>
            <Link
              to="/dashboard/vouchers"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Vouchers
            </Link>
            <Link
              to="/dashboard/audit-log"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Audit Log
            </Link>
          </div>
        </div>
        {isMounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
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
      </nav>
    </header>
  );
};
