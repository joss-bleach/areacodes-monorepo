import type { Metadata } from "next";
import { hasBusiness } from "@/lib/access";
import { BusinessDashboardView } from "@/modules/business/ui/views/business-dashboard-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  await hasBusiness(slug);
  prefetch(trpc.business.getBusinessBySlug.queryOptions({ slug }));
  prefetch(trpc.business.getVouchersByBusinessSlug.queryOptions({ slug }));
  prefetch(
    trpc.business.getActiveVouchersByBusinessSlug.queryOptions({ slug })
  );
  prefetch(
    trpc.business.getExpiringVouchersByBusinessSlug.queryOptions({ slug })
  );
  return (
    <HydrateClient>
      <BusinessDashboardView />
    </HydrateClient>
  );
};

export default Page;
