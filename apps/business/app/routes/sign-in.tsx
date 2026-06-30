import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@repo/ui";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/",
      });

      if (signInError) {
        setError(signInError.message ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3">
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

        {sent ? (
          <Card className="w-full rounded-none border-border/50">
            <CardHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <MailCheck className="size-10 text-foreground" />
                <CardTitle className="text-lg text-center">Check your email</CardTitle>
                <CardDescription className="text-center">
                  We sent a sign-in link to <strong>{email}</strong>. Click the
                  link to access your business dashboard.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <Card className="w-full rounded-none border-border/50">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="text-lg">Sign in</CardTitle>
                <CardDescription>
                  Enter your email address and we&apos;ll send you a sign-in link.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="rounded-none"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full rounded-none"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Send sign-in link"
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
