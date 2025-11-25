import { LayoutWrapper } from "./layout-wrapper";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <LayoutWrapper>{children}</LayoutWrapper>;
};

export default Layout;
