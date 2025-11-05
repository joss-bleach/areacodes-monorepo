export const dynamic = "force-dynamic";

import { ExploreView } from "@/modules/explore/ui/views/explore-view";
import { prefetch, trpc } from "@/trpc/server";
import { HydrateClient } from "@/trpc/server";

const Page = async () => {
  // Prefetch industries (no filters needed)
  // Skip prefetching getBusinessesWithVouchers since filters come from URL params on client
  // and the nested router isn't resolving correctly with createTRPCOptionsProxy
  await prefetch(trpc.getIndustries.queryOptions());

  return (
    <HydrateClient>
      <ExploreView />
    </HydrateClient>
  );
};

export default Page;
