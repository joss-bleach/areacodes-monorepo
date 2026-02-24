import { createFileRoute, redirect } from "@tanstack/react-router";
import { BusinessNavbar } from "~/components/business-navbar";
import { DashboardTop } from "~/sections/dashboard-top";
import { StatsSection } from "~/sections/stats-section";
import { VoucherTable } from "~/sections/voucher-table";
import { NewVoucherModal } from "~/components/new-voucher-modal";

export const Route = createFileRoute("/b/$slug")({
  beforeLoad: ({ context }) => {
    if (!context.auth.userId) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <>
      <BusinessNavbar />
      <main className="w-screen py-6">
        <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px]">
          <DashboardTop />
          <StatsSection />
          <VoucherTable />
          <NewVoucherModal />
        </div>
      </main>
    </>
  );
}
