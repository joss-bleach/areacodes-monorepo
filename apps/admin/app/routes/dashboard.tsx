import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminNavbar } from "~/components/admin-navbar";
import { RequireAdmin } from "~/components/require-admin";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <RequireAdmin>
      <AdminNavbar />
      <Outlet />
    </RequireAdmin>
  );
}
