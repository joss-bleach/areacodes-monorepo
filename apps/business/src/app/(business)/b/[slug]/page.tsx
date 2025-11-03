import { hasAuthentication, hasBusiness } from "@/lib/access";
import { BusinessDashboardView } from "@/modules/business/ui/views/business-dashboard-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const Page = async ({ params }: { params: { slug: string } }) => {
  await hasAuthentication();
  await hasBusiness();
  prefetch(trpc.business.getBusinessBySlug.queryOptions({ slug: params.slug }));
  return (
    <HydrateClient>
      <BusinessDashboardView />
    </HydrateClient>
  );
};

export default Page;
