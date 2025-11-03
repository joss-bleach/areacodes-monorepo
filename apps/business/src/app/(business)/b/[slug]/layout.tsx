import { BusinessDashboardLayout } from "@/modules/business/ui/layouts/business-dashboard-layout";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <BusinessDashboardLayout>{children}</BusinessDashboardLayout>;
};

export default Layout;
