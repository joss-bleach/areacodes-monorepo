import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@repo/convex";
import { BusinessNavbar } from "~/components/business-navbar";
import { CreateBusinessForm } from "~/components/create-business-form";
import { authClient } from "~/lib/auth-client";
import * as z from "zod";

export const Route = createFileRoute("/_authenticated/b/create")({
  validateSearch: z.object({ _nb: z.literal(1).optional() }),
  beforeLoad: async ({ search }) => {
    if (search._nb) {
      await authClient.updateUser({ role: "business" });
      throw redirect({ to: "/b/create", search: {}, replace: true });
    }
  },
  component: CreatePage,
});

function CreatePage() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  const business = useQuery(
    api.functions.businesses.getBusinessByUser,
    isAuthenticated ? {} : "skip",
  );

  // User already has a business — redirect to dashboard
  useEffect(() => {
    if (business !== undefined && business !== null) {
      navigate({ to: "/b/$slug", params: { slug: business.slug } });
    }
  }, [business, navigate]);

  // Still waiting for Convex auth or query result, or redirecting
  if (business === undefined || business !== null) {
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
