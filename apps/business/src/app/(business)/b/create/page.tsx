export const dynamic = "force-dynamic";

import { hasAuthentication, hasBusiness } from "@/lib/access";
import { trpc, prefetch, HydrateClient } from "@/trpc/server";
import { CreateBusinessView } from "@/modules/business/ui/views/create-business-view";

const Page = async () => {
  await hasAuthentication();
  await hasBusiness();

  prefetch(trpc.business.getAllIndustries.queryOptions());
  return (
    <HydrateClient>
      <CreateBusinessView />
    </HydrateClient>
  );
};
export default Page;
