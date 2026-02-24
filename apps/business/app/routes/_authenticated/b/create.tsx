import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { BusinessNavbar } from "~/components/business-navbar";
import { CreateBusinessForm } from "~/components/create-business-form";

export const Route = createFileRoute("/_authenticated/b/create")({
  component: CreatePage,
});

function CreatePage() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  const business = useQuery(
    api.functions.businesses.getBusinessByClerkUser,
    isAuthenticated ? {} : "skip",
  );

  // Still waiting for Convex auth or query result
  if (business === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 bg-foreground animate-pulse" />
      </div>
    );
  }

  // User already has a business — redirect to dashboard
  if (business !== null) {
    navigate({ to: "/b/$slug", params: { slug: business.slug } });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 bg-foreground animate-pulse" />
      </div>
    );
  }

  // business === null — show create form
  return (
    <>
      <BusinessNavbar />
      <main className="container-app py-8">
        <h1 className="text-2xl mb-2">
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
