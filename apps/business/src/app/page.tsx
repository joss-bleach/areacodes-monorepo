import { caller } from "@/trpc/server";

const Page = async () => {
  const industries = await caller.getIndustries();
  return (
    <div>
      This is the businesses site <p>{JSON.stringify(industries)}</p>
    </div>
  );
};
export default Page;
