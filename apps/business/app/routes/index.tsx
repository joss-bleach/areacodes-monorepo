import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-start";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { userId, isLoaded } = useAuth();
  const { isLoading: isConvexLoading } = useConvexAuth();
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

    if (business === undefined) return; // query still loading

    // null while Convex auth still loading = token hasn't synced yet, wait
    if (business === null && isConvexLoading) return;

    if (business === null) {
      navigate({ to: "/b/create" });
    } else {
      navigate({ to: "/b/$slug", params: { slug: business.slug } });
    }
  }, [isLoaded, userId, isConvexLoading, business, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  );
}
