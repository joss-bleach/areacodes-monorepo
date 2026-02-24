import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (!context.auth?.userId) {
      throw redirect({ to: "/sign-in" });
    }
    throw redirect({ to: "/b/create" });
  },
  component: () => null,
});
