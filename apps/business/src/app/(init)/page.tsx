import { redirect } from "next/navigation";
import { hasAuthentication, getBusiness } from "@/lib/access";

const Page = async () => {
  await hasAuthentication();
  const business = await getBusiness();
  
  if (!business) {
    redirect("/b/create");
  } else {
    redirect(`/b/${business.slug}`);
  }
};

export default Page;
