import { caller } from "@/trpc/server";

const Page = async () => {
  const industries = await caller.getIndustries();
  return (
    <div>
      This is the maps site <p>{JSON.stringify(industries)}</p>
    </div>
  );
};
export default Page;
