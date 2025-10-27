import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";

const Page = async () => {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }
  return <SignIn />;
};

export default Page;
