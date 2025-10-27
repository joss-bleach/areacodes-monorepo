import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { caller } from "@/trpc/server";
import { CreateBusinessView } from "@/modules/business/ui/views/create-business-view";

// Force dynamic rendering to avoid build-time authentication checks
export const dynamic = "force-dynamic";

const Page = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const businesses = await caller.business.getBusinessByClerkUserId(userId);
  if (businesses && businesses.length > 0) {
    redirect("/b/${businesses[0].slug}");
  } else {
    return <CreateBusinessView />;
  }
};
export default Page;
