import { createFileRoute } from "@tanstack/react-router";
import { BusinessNavbar } from "~/components/business-navbar";
import { EditBusinessForm } from "~/components/edit-business-form";

export const Route = createFileRoute("/_authenticated/b/$slug/edit")({
  component: EditPage,
});

function EditPage() {
  return (
    <>
      <BusinessNavbar />
      <main className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px] py-8">
        <h1 className="text-2xl font-semibold mb-2">Edit business profile</h1>
        <p className="text-muted-foreground mb-6">
          Update your business details and logo
        </p>
        <EditBusinessForm />
      </main>
    </>
  );
}
