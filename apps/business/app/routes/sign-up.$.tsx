import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthenticateWithRedirectCallback } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-up/$")({
  component: SSOCallback,
});

function SSOCallback() {
  const { _splat } = Route.useParams();

  if (_splat === "sso-callback") {
    return <AuthenticateWithRedirectCallback />;
  }

  return <Navigate to="/sign-up" />;
}
