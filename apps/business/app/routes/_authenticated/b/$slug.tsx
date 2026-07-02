import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@repo/ui";
import { BusinessSidebar } from "~/components/business-sidebar";

export const Route = createFileRoute("/_authenticated/b/$slug")({
  component: BusinessShell,
});

function BusinessShell() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  return (
    <SidebarProvider>
      <BusinessSidebar slug={slug} />
      <SidebarInset>
        <div className="flex h-10 shrink-0 items-center px-2 border-b border-border">
          <SidebarTrigger />
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
