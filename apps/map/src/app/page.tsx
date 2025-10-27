import { caller } from "@/trpc/server";

// Force dynamic rendering to avoid build-time database queries
export const dynamic = "force-dynamic";

const Page = async () => {
  const industries = await caller.getIndustries();
  return (
    <div>
      This is the maps site <p>{JSON.stringify(industries)}</p>
    </div>
  );
};
export default Page;
