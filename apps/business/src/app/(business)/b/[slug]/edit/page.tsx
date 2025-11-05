import { hasBusiness } from "@/lib/access";
import { EditBusinessProfileView } from "@/modules/business/ui/views/edit-business-profile-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  await hasBusiness(slug);
  prefetch(trpc.business.getBusinessBySlug.queryOptions({ slug }));
  return (
    <HydrateClient>
      <EditBusinessProfileView />
    </HydrateClient>
  );
};

export default Page;
