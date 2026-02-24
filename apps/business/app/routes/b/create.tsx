import { createFileRoute, redirect } from "@tanstack/react-router";
import { BusinessNavbar } from "~/components/business-navbar";
import { CreateBusinessForm } from "~/components/create-business-form";

export const Route = createFileRoute("/b/create")({
  beforeLoad: ({ context }) => {
    if (!context.auth.userId) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: CreatePage,
});

function CreatePage() {
  return (
    <>
      <BusinessNavbar />
      <main className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px] py-8">
        <h1 className="text-2xl font-semibold mb-2">
          Create your business profile
        </h1>
        <p className="text-muted-foreground mb-6">
          Set up your business to start creating vouchers
        </p>
        <CreateBusinessForm />
      </main>
    </>
  );
}
