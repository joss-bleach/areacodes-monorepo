export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { caller, trpc, prefetch, HydrateClient } from "@/trpc/server";
import { CreateBusinessView } from "@/modules/business/ui/views/create-business-view";

const Page = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const businesses = await caller.business.getBusinessByClerkUserId(userId);
  if (businesses && businesses.length > 0) {
    redirect("/b/${businesses[0].slug}");
  } else {
    prefetch(trpc.business.getAllIndustries.queryOptions());
    return (
      <HydrateClient>
        <CreateBusinessView />
      </HydrateClient>
    );
  }
};
export default Page;
