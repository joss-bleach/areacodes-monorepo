import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@repo/convex";
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="text-xl font-bold tracking-tight">AREACODES</span>
        <p className="text-sm text-muted-foreground animate-pulse">Setting up your workspace…</p>
      </div>
    );
  }

  // business === null — show create form
  return (
    <main className="container-app py-8">
      <div className="mb-6">
        <span className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">
          Create Profile
        </span>
        <p className="text-xs text-muted-foreground mt-2">
          Set up your business to start creating vouchers
        </p>
      </div>
      <CreateBusinessForm />
    </main>
  );
}
