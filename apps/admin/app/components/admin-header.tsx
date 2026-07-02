import { useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  Separator,
  SidebarTrigger,
} from "@repo/ui";
import { NAV_LINKS } from "~/components/admin-sidebar";

export const AdminHeader = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = NAV_LINKS.find((link) =>
    link.exact ? pathname === link.to : pathname.startsWith(link.to)
  );

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4!" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{active?.label ?? "Dashboard"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
};
