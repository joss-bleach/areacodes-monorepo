import { requiresNoAuthentication } from "@/lib/access";
import { SignIn } from "@clerk/nextjs";

const Page = async () => {
  await requiresNoAuthentication();
  return <SignIn />;
};

export default Page;
