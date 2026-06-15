import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@repo/ui";
import { Loader2 } from "lucide-react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message ?? "Something went wrong. Please try again.");
      } else {
        navigate({ to: "/" });
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
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </span>

        <Card className="w-full rounded-none border-border/50">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <CardHeader>
              <CardTitle className="text-lg">Sign in</CardTitle>
              <CardDescription>Sign in to the admin dashboard</CardDescription>
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
                  autoFocus
                  autoComplete="email"
                  className="rounded-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="rounded-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full rounded-none"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
