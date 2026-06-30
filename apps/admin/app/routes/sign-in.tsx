import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
} from "@repo/ui";
import { Loader2 } from "lucide-react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (sendError) {
        setError(sendError.message ?? "Something went wrong. Please try again.");
      } else {
        setStep("otp");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setOtp("");
    setResending(true);

    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (sendError) {
        setError(sendError.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyOtp(value: string) {
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email,
        otp: value,
      });

      if (verifyError) {
        setError(verifyError.message ?? "Invalid code. Please try again.");
        setOtp("");
      } else {
        await router.navigate({ to: "/" });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setOtp("");
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
            alt="Areacodes"
            width={160}
            height={22}
          />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Admin
          </span>
        </div>

        <Card className="w-full rounded-none border-border/50">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="inline-block bg-foreground text-background px-2 py-1 text-base font-bold uppercase tracking-tight leading-none">
                  Sign in
                </CardTitle>
                <CardDescription className="mt-3">
                  Enter your email address and we&apos;ll send you a one-time code.
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
                    autoFocus
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
                    "Send code"
                  )}
                </Button>
              </CardContent>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="inline-block bg-foreground text-background px-2 py-1 text-base font-bold uppercase tracking-tight leading-none">
                  Enter your code
                </CardTitle>
                <CardDescription className="mt-3">
                  We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      if (value.length === 6) handleVerifyOtp(value);
                    }}
                    disabled={loading}
                    autoFocus
                    containerClassName="gap-3"
                  >
                    <InputOTPGroup><InputOTPSlot index={0} className="h-12 w-12 text-base" /></InputOTPGroup>
                    <InputOTPGroup><InputOTPSlot index={1} className="h-12 w-12 text-base" /></InputOTPGroup>
                    <InputOTPGroup><InputOTPSlot index={2} className="h-12 w-12 text-base" /></InputOTPGroup>
                    <InputOTPGroup><InputOTPSlot index={3} className="h-12 w-12 text-base" /></InputOTPGroup>
                    <InputOTPGroup><InputOTPSlot index={4} className="h-12 w-12 text-base" /></InputOTPGroup>
                    <InputOTPGroup><InputOTPSlot index={5} className="h-12 w-12 text-base" /></InputOTPGroup>
                  </InputOTP>
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Verifying...
                    </div>
                  )}
                  {error && <p className="text-sm text-destructive text-center">{error}</p>}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
                    disabled={resending}
                    onClick={handleResend}
                  >
                    {resending ? "Sending..." : "Resend code"}
                  </button>
                  <button
                    type="button"
                    className="hover:text-foreground underline-offset-4 hover:underline"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                    }}
                  >
                    Use a different email
                  </button>
                </div>
              </CardContent>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
