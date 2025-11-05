import { ExploreView } from "@/modules/explore/ui/views/explore-view";
import { prefetch, trpc } from "@/trpc/server";
import { HydrateClient } from "@/trpc/server";

const Page = async () => {
  await prefetch(trpc.explore.getBusinessesWithVouchers.queryOptions());

  return (
    <HydrateClient>
      <ExploreView />
    </HydrateClient>
  );
};

export default Page;
