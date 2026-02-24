import { UserButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const AdminNavbar = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
          <UserButton />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        )}
      </nav>
    </header>
  );
};
