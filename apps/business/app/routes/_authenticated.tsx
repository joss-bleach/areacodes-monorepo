import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "~/lib/auth-client";
import { FeedbackWidget } from "~/components/feedback-widget";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/sign-in" });
    }
  }, [isPending, session, navigate]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 bg-foreground animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <Outlet />
      <FeedbackWidget />
    </>
  );
}
