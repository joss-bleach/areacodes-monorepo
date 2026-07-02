import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Building2,
  Ticket,
  ShieldAlert,
  FlaskConical,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui";
import { authClient } from "~/lib/auth-client";

const NAV_LINKS = [
  { to: "/dashboard/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/businesses", label: "Businesses", icon: Building2, exact: false },
  { to: "/dashboard/vouchers", label: "Vouchers", icon: Ticket, exact: false },
  { to: "/dashboard/audit-log", label: "Audit Log", icon: ShieldAlert, exact: false },
  { to: "/dashboard/pilot-features", label: "Pilot Features", icon: FlaskConical, exact: false },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
] as const;

export { NAV_LINKS };

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  function isActive(to: string, exact: boolean) {
    return exact ? pathname === to : pathname.startsWith(to);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/dashboard/"
          className="flex items-center gap-2 px-2 py-1.5 text-sm font-bold uppercase tracking-wide text-foreground"
        >
          <img
            src="/areacodes-icon.svg"
            alt=""
            className="h-6 w-6 shrink-0"
          />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Areacodes <span className="text-muted-foreground font-normal">Admin</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2">
          {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton asChild isActive={isActive(to, exact)} tooltip={label}>
                <Link to={to}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {isMounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {initial}
                </span>
                <span className="truncate text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {session?.user.name ?? session?.user.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
