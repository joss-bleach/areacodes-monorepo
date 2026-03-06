import { createFileRoute } from "@tanstack/react-router";
import { BusinessNavbar } from "~/components/business-navbar";
import { DashboardTop } from "~/sections/dashboard-top";
import { StatsSection } from "~/sections/stats-section";
import { VoucherTable } from "~/sections/voucher-table";
import { NewVoucherModal } from "~/components/new-voucher-modal";

export const Route = createFileRoute("/_authenticated/b/$slug/")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <>
      <BusinessNavbar />
      <main className="w-screen py-6">
        <div className="container-app">
          <DashboardTop />
          <StatsSection />
          <VoucherTable />
          <NewVoucherModal />
        </div>
      </main>
    </>
  );
}
