import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-in/$")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/areacodes-white.svg"
            alt="Areacodes logo"
            width={160}
            height={160}
          />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Business Dashboard
          </span>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
