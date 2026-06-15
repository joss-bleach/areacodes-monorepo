import { authClient } from "~/lib/auth-client";

export const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

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
