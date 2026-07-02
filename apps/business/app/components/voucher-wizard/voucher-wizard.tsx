import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { cn } from "@repo/ui";
import { toast } from "sonner";
import {
  voucherFormSchema,
  type VoucherFormValues,
} from "~/schemas/voucher-form-schema";
import { VoucherProviderStep } from "~/components/form-steps/voucher-provider-step";
import { VoucherDiscountKindStep } from "~/components/form-steps/voucher-discount-kind-step";
import { VoucherDetailsStep } from "~/components/form-steps/voucher-details-step";
import { VoucherReviewStep } from "~/components/form-steps/voucher-review-step";
import { toMinorUnits } from "~/lib/discount-units";

// ── Steps ─────────────────────────────────────────────────────────────────────
// Provider step is capability-gated: shown only when Square is connected.
// Manual-only businesses skip it (provider is auto-selected).

const STEPS_WITH_PROVIDER = ["provider", "discount", "details", "review"] as const;
const STEPS_MANUAL_ONLY = ["discount", "details", "review"] as const;

type WizardStep = (typeof STEPS_WITH_PROVIDER)[number];

const STEP_LABELS: Record<WizardStep, string> = {
  provider: "Provider",
  discount: "Discount",
  details: "Details",
  review: "Review",
};

// All steps share the stepper's width so the body and progress bar align.
const STEP_WIDTH: Record<WizardStep, number> = {
  provider: 720,
  discount: 720,
  details: 720,
  review: 720,
};

interface VoucherWizardProps {
  businessId: Id<"businesses">;
  slug: string;
  hasSquareConnection: boolean;
}

export const VoucherWizard = ({
  businessId,
  slug,
  hasSquareConnection,
}: VoucherWizardProps) => {
  const navigate = useNavigate();
  const createVoucher = useMutation(api.functions.vouchers.createVoucher);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps: readonly WizardStep[] = hasSquareConnection
    ? STEPS_WITH_PROVIDER
    : STEPS_MANUAL_ONLY;
  const [currentStep, setCurrentStep] = useState<WizardStep>(steps[0]!);

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      provider: hasSquareConnection ? "square" : "manual",
      discount: { kind: "percentage" },
      title: "",
      description: "",
      voucherTerms: "",
      voucherValidFrom: undefined as unknown as Date,
      voucherValidTo: undefined as unknown as Date,
    },
    mode: "onBlur",
  });

  const provider = useWatch({ control: form.control, name: "provider" });
  const currentIndex = steps.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const subtitle = getSubtitle(currentStep, provider);

  const exit = () => navigate({ to: "/b/$slug", params: { slug } });

  const validateStep = (step: WizardStep): Promise<boolean> => {
    if (step === "provider") return form.trigger("provider");
    // Discount step only picks the kind; the value is captured on the details
    // step, so validate just the kind here (the full discount, incl. value, is
    // validated when leaving details).
    if (step === "discount") return form.trigger("discount.kind");
    if (step === "details")
      return form.trigger([
        "discount",
        "title",
        "description",
        "voucherValidFrom",
        "voucherValidTo",
      ]);
    return Promise.resolve(true);
  };

  const goNext = async () => {
    if (!(await validateStep(currentStep))) return;
    const next = steps[currentIndex + 1];
    if (next) setCurrentStep(next);
  };

  const goPrev = () => {
    if (isFirst) {
      exit();
      return;
    }
    const prev = steps[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const onSubmit = async (data: VoucherFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createVoucher({
        businessId,
        provider: data.provider,
        title: data.title,
        description: data.description,
        discount: toMinorUnits(data.discount),
        voucherTerms: data.voucherTerms || undefined,
        voucherValidFrom: data.voucherValidFrom!.getTime(),
        voucherValidTo: data.voucherValidTo!.getTime(),
      });
      toast.success(
        data.provider === "square"
          ? "Voucher created — publishing to Square…"
          : "Voucher created",
      );
      exit();
    } catch {
      toast.error("Failed to create voucher");
      setIsSubmitting(false);
    }
  };

  const bodyWidth = STEP_WIDTH[currentStep];

  return (
    <main className="py-12">
      <div className="mx-auto flex w-full max-w-[980px] flex-col items-center px-4">
        {/* Heading */}
        <span className="self-start bg-foreground px-2 py-1 text-2xl font-bold uppercase leading-none tracking-[-0.025em] text-background">
          Create Voucher
        </span>
        <p className="mt-2 self-start text-[13px] leading-4 text-muted-foreground">
          {subtitle}
        </p>

        {/* Stepper */}
        <ol className="mb-8 mt-7 flex w-full max-w-[720px] items-center">
          {steps.map((step, idx) => {
            const state =
              idx < currentIndex ? "completed" : idx === currentIndex ? "current" : "upcoming";
            const clickable = state === "completed";
            return (
              <li key={step} className="contents">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setCurrentStep(step)}
                  className={cn(
                    "flex items-center gap-2 outline-none",
                    clickable ? "cursor-pointer" : "cursor-default",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center font-mono text-[11px] font-bold leading-[14px]",
                      state === "upcoming"
                        ? "border border-border text-muted-foreground"
                        : "bg-foreground text-background",
                    )}
                  >
                    {state === "completed" ? (
                      <Check className="size-3" strokeWidth={3.5} />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase leading-[14px] tracking-[-0.025em]",
                      // On mobile only the current step is labelled so the rail
                      // fits; every label shows from sm upward.
                      state === "current"
                        ? "text-foreground"
                        : "hidden text-muted-foreground sm:inline",
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <span className="mx-2 h-px flex-1 bg-border sm:mx-4" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>

        {/* Step body */}
        <form
          id="voucher-wizard-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-col items-center"
        >
          <div className="flex w-full justify-center" style={{ maxWidth: bodyWidth }}>
            {currentStep === "provider" && <VoucherProviderStep form={form} />}
            {currentStep === "discount" && <VoucherDiscountKindStep form={form} />}
            {currentStep === "details" && <VoucherDetailsStep form={form} />}
            {currentStep === "review" && <VoucherReviewStep form={form} />}
          </div>
        </form>

        {/* Actions */}
        <div
          className="mt-6 flex w-full justify-between"
          style={{ maxWidth: bodyWidth }}
        >
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 items-center border border-border px-[18px] text-xs font-bold uppercase leading-4 tracking-[-0.025em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back
          </button>

          {isLast ? (
            <button
              key="create"
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex h-9 items-center gap-2 bg-foreground px-[22px] text-xs font-bold uppercase leading-4 tracking-[-0.025em] text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" strokeWidth={2.5} />
              )}
              {isSubmitting ? "Creating…" : "Create voucher"}
            </button>
          ) : (
            <button
              key="continue"
              type="button"
              onClick={goNext}
              className="flex h-9 items-center bg-foreground px-[18px] text-xs font-bold uppercase leading-4 tracking-[-0.025em] text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

function getSubtitle(step: WizardStep, provider: VoucherFormValues["provider"]): string {
  switch (step) {
    case "provider":
      return "Choose where this voucher runs. We tailor the rest to it.";
    case "discount":
      return provider === "square"
        ? "Pick the offer. Square runs percentage and fixed-amount discounts."
        : "Pick the offer. Manual vouchers support every discount type.";
    case "details":
      return "Set the value and when it runs. We fill the wording in for you.";
    case "review":
      return provider === "square"
        ? "Check it over. We publish it to Square in the background."
        : "Check it over. It goes live for customers right away.";
  }
}
