import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/sign-in/$")({
  component: SSOCallback,
});

function SSOCallback() {
  const { _splat } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (_splat === "callback") {
      // Better Auth handles the OAuth callback via the API server.
      // After the session is created, redirect home.
      authClient.getSession().then(({ data }) => {
        if (data) {
          navigate({ to: "/" });
        } else {
          navigate({ to: "/sign-in" });
        }
      });
    }
  }, [_splat, navigate]);

  if (_splat === "callback") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 bg-foreground animate-pulse" />
      </div>
    );
  }

  return <Navigate to="/sign-in" />;
}
