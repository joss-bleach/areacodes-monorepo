import { BusinessNavbar } from "../components/business-navbar";
import FeedbackBanner from "@/components/comp-302";

export const BusinessDashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div>
      <BusinessNavbar />
      <FeedbackBanner />
      {children}
    </div>
  );
};
