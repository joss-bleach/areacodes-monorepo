export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { hasAuthentication, hasBusiness } from "@/lib/access";
import { trpc, prefetch, HydrateClient } from "@/trpc/server";
import { CreateBusinessView } from "@/modules/business/ui/views/create-business-view";

export const metadata: Metadata = {
  title: "Create Business Profile",
};

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
