import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-start";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();

  const business = useQuery(
    api.functions.businesses.getBusinessByClerkUser,
    isLoaded && userId ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      navigate({ to: "/sign-in" });
      return;
    }

    if (business === undefined) return; // still loading

    if (business === null) {
      navigate({ to: "/b/create" });
    } else {
      navigate({ to: "/b/$slug", params: { slug: business.slug } });
    }
  }, [isLoaded, userId, business, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  );
}
