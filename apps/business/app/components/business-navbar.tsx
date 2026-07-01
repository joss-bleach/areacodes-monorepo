import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Settings, KeyRound } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { authClient } from "~/lib/auth-client";

export const BusinessNavbar = () => {
  const { slug } = useParams({ strict: false }) as { slug?: string };
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
    <header className="border-b border-border bg-background">
      <nav className="container-app flex flex-row items-center justify-between py-4">
        {slug ? (
          <Link
            to="/b/$slug"
            params={{ slug }}
            aria-label="Go to business profile"
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <img src="/areacodes-white.svg" alt="Areacodes logo" width={140} height={140} />
          </Link>
        ) : (
          <Link
            to="/"
            aria-label="Go to home"
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <img src="/areacodes-white.svg" alt="Areacodes logo" width={140} height={140} />
          </Link>
        )}
        {isMounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                {initial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {slug && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: `/b/$slug/edit`, params: { slug } })}
                  >
                    <Settings className="w-4 h-4" />
                    Edit business profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: `/b/$slug/settings`, params: { slug } })}
                  >
                    <KeyRound className="w-4 h-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="w-8 h-8 bg-muted animate-pulse" />
        )}
      </nav>
    </header>
  );
};
