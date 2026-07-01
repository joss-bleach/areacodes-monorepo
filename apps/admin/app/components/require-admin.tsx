import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";

export const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const isAuthenticated = !!session;
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      navigate({ to: "/sign-in" });
    }
  }, [isPending, isAuthenticated, navigate]);

  if (isPending || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
