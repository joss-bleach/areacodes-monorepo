import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignUp, useSignIn } from "@clerk/tanstack-react-start";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
} from "@repo/ui";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 bg-foreground animate-pulse" />
      </div>
    );
  }

  async function handleGoogleSignUp() {
    if (!signIn) return;
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          "Failed to sign up with Google.",
      );
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    setLoading(true);

    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("code");
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && setActive) {
        await setActive({ session: result.createdSessionId });
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!signUp) return;
    setError("");

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch {
      setError("Failed to resend code. Please try again.");
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

        <Card className="w-full rounded-none border-border/50">
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="text-lg">Create an account</CardTitle>
                <CardDescription>
                  Get started with your business dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-none"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <GoogleIcon className="size-4" />
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

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
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full rounded-none"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Continue with email"
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link
                    to="/sign-in"
                    className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                  >
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="text-lg">Verify your email</CardTitle>
                <CardDescription>
                  We sent a 6-digit code to{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">Verification code</Label>
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="rounded-none" />
                      <InputOTPSlot index={1} className="rounded-none" />
                      <InputOTPSlot index={2} className="rounded-none" />
                      <InputOTPSlot index={3} className="rounded-none" />
                      <InputOTPSlot index={4} className="rounded-none" />
                      <InputOTPSlot index={5} className="rounded-none" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full rounded-none"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
                <div className="flex items-center justify-between w-full text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError("");
                    }}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="size-3" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Resend code
                  </button>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
