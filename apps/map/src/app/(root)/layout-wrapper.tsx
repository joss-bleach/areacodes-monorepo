"use client";

import { usePathname } from "next/navigation";
import { ExploreLayout } from "@/modules/explore/ui/layouts/explore-layout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isVoucherRoute = pathname.startsWith("/v/");
  
  if (isVoucherRoute) {
    return <>{children}</>;
  }
  
  return <ExploreLayout>{children}</ExploreLayout>;
};

