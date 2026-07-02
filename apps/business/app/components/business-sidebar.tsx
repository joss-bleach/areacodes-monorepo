import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LayoutDashboard, BarChart2, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@repo/ui";
import { authClient } from "~/lib/auth-client";
import { SidebarProfileCompletion } from "~/components/sidebar-profile-completion";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/b/$slug" as const },
  { icon: BarChart2, label: "Analytics", to: "/b/$slug/analytics" as const },
  { icon: CreditCard, label: "POS", to: "/b/$slug/pos" as const },
];

export function BusinessSidebar({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const { data: session } = authClient.useSession();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const initial = (
    session?.user.name?.[0] ??
    session?.user.email?.[0] ??
    "?"
  ).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/sign-in" });
  }

  function isActive(to: string) {
    const resolved = to.replace("$slug", slug);
    return location === resolved;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/b/$slug"
          params={{ slug }}
          className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold uppercase tracking-tight text-foreground"
          aria-label="Go to dashboard"
        >
          <img src="/areacodes-icon.svg" alt="" className="h-6 w-6 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Areacodes
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2 pt-3">
          {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
            <SidebarMenuItem key={label}>
              <SidebarMenuButton asChild isActive={isActive(to)} tooltip={label}>
                <Link to={to} params={{ slug }}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarProfileCompletion />
        {isMounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                aria-label="User menu"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                  {initial}
                </span>
                <span className="truncate text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {session?.user.name ?? session?.user.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem
                onClick={() =>
                  navigate({ to: "/b/$slug/edit", params: { slug } })
                }
              >
                Edit business profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
