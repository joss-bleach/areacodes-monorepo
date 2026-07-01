import { createFileRoute } from "@tanstack/react-router";
import { EditBusinessForm } from "~/components/edit-business-form";

export const Route = createFileRoute("/_authenticated/b/$slug/edit")({
  component: EditPage,
});

function EditPage() {
  return (
    <main className="container-app py-8">
      <div className="mb-6">
        <span className="inline-block bg-foreground text-background px-2 py-1 text-xl font-bold uppercase tracking-tight leading-none">
          Edit Profile
        </span>
        <p className="text-xs text-muted-foreground mt-2">
          Update your business details and logo
        </p>
      </div>
      <EditBusinessForm />
    </main>
  );
}
