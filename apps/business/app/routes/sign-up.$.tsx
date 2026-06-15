import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
  component: () => <Navigate to="/sign-up" />,
});
