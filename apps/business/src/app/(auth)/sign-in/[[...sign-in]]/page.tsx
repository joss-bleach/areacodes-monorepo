import type { Metadata } from "next";
import { requiresNoAuthentication } from "@/lib/access";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign In",
};

const Page = async () => {
  await requiresNoAuthentication();
  return <SignIn />;
};

export default Page;
