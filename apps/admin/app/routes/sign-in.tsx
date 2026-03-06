import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSignIn } from "@clerk/tanstack-react-start";
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

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 bg-foreground animate-pulse" />
      </div>
    );
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({ identifier: email });

      const emailCodeFactor = result.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code",
      );

      if (!emailCodeFactor || !("emailAddressId" in emailCodeFactor)) {
        setError("Email code sign-in is not available for this account.");
        setLoading(false);
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailCodeFactor.emailAddressId,
      });

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
    if (!signIn) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

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
    if (!signIn) return;
    setError("");

    try {
      const emailCodeFactor = signIn.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code",
      );

      if (emailCodeFactor && "emailAddressId" in emailCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId,
        });
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-10 w-full max-w-sm">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </span>

        <Card className="w-full rounded-none border-border/50">
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="text-lg">Sign in</CardTitle>
                <CardDescription>
                  Enter your email to receive a verification code
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
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full rounded-none"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle className="text-lg">Check your email</CardTitle>
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
