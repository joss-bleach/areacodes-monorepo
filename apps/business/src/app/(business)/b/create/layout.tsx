import { CreateBusinessLayout } from "@/modules/business/ui/layouts/create-business-layout";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <CreateBusinessLayout>{children}</CreateBusinessLayout>;
};

export default Layout;
