import { DashboardTop } from "../sections/dashboard-top";
import { StatsSection } from "../sections/stats-section";
import { VoucherTable } from "../sections/voucher-table";
import { NewVoucherModal } from "../components/new-voucher-modal";

export const BusinessDashboardView = () => {
  return (
    <main className="w-screen py-6">
      <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px]">
        <DashboardTop />
        <StatsSection />
        <VoucherTable />
        <NewVoucherModal />
      </div>
    </main>
  );
};
