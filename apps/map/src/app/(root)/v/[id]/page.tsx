export const dynamic = "force-dynamic";

import { VoucherView } from "@/modules/voucher/ui/views/voucher-view";
import { prefetch, trpc } from "@/trpc/server";
import { HydrateClient } from "@/trpc/server";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await prefetch(trpc.voucher.getVoucherById.queryOptions({ id }));

  return (
    <HydrateClient>
      <VoucherView />
    </HydrateClient>
  );
};

export default Page;

