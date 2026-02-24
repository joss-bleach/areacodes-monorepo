import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-start";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !userId) {
      navigate({ to: "/sign-in" });
    }
  }, [isLoaded, userId, navigate]);

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  return <Outlet />;
}
