import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { cn } from "@repo/ui";
import { toast } from "sonner";
import {
  addBusinessFormSchema,
  type AddBusinessFormValues,
} from "~/schemas/add-business-form-schema";
import { AddBusinessDetailsStep } from "~/components/form-steps/add-business-details-step";
import { AddBusinessLocationStep } from "~/components/form-steps/add-business-location-step";
import { AddBusinessExtrasStep } from "~/components/form-steps/add-business-extras-step";
import { AddBusinessReviewStep } from "~/components/form-steps/add-business-review-step";

const STEPS = ["details", "location", "extras", "review"] as const;

type WizardStep = (typeof STEPS)[number];

const STEP_LABELS: Record<WizardStep, string> = {
  details: "Details",
  location: "Location",
  extras: "Extras",
  review: "Review",
};

const STEP_WIDTH: Record<WizardStep, number> = {
  details: 560,
  location: 560,
  extras: 560,
  review: 560,
};

export const AddBusinessWizard = () => {
  const navigate = useNavigate();
  const addBusiness = useMutation(api.functions.admin.addBusinessByAdmin);
  const generateUploadUrl = useMutation(api.functions.businesses.generateUploadUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logoFileRef = useRef<File | null>(null);

  const [currentStep, setCurrentStep] = useState<WizardStep>(STEPS[0]);

  const form = useForm<AddBusinessFormValues>({
    resolver: zodResolver(addBusinessFormSchema),
    defaultValues: {
      name: "",
      ownerEmail: "",
      industryId: "",
      address: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      county: "",
      postcode: "",
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      description: "",
      websiteUrl: "",
    },
    mode: "onBlur",
  });

  const currentIndex = STEPS.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEPS.length - 1;

  const exit = () => navigate({ to: "/dashboard/businesses" });

  const validateStep = (step: WizardStep): Promise<boolean> => {
    if (step === "details") return form.trigger(["name", "ownerEmail", "industryId"]);
    if (step === "location")
      return form.trigger([
        "address",
        "addressLine1",
        "city",
        "postcode",
        "latitude",
        "longitude",
      ]);
    if (step === "extras") return form.trigger(["description", "websiteUrl"]);
    return Promise.resolve(true);
  };

  const goNext = async () => {
    if (!(await validateStep(currentStep))) return;
    const next = STEPS[currentIndex + 1];
    if (next) setCurrentStep(next);
  };

  const goPrev = () => {
    if (isFirst) {
      exit();
      return;
    }
    const prev = STEPS[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const onSubmit = async (data: AddBusinessFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let logoStorageId: Id<"_storage"> | undefined;
      const logoFile = logoFileRef.current;
      if (logoFile) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });
        if (!response.ok) throw new Error("Logo upload failed");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        logoStorageId = storageId;
      }

      await addBusiness({
        name: data.name,
        ownerEmail: data.ownerEmail,
        description: data.description ?? "",
        websiteUrl: data.websiteUrl ?? "",
        industryId: data.industryId as Id<"industries">,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        logoStorageId,
      });
      toast.success(`Business "${data.name}" created and invitation email sent`);
      exit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create business");
      setIsSubmitting(false);
    }
  };

  const bodyWidth = STEP_WIDTH[currentStep];

  return (
    <main className="py-12">
      <div className="mx-auto flex w-full max-w-[980px] flex-col items-center px-4">
        <span className="self-start bg-foreground px-2 py-1 text-2xl font-bold uppercase leading-none tracking-[-0.025em] text-background">
          Add Business
        </span>
        <p className="mt-2 self-start text-[13px] leading-4 text-muted-foreground">
          Create a Pilot Business account. The owner will receive a sign-in invitation by email.
        </p>

        <ol className="mb-8 mt-7 flex w-full max-w-[720px] items-center">
          {STEPS.map((step, idx) => {
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
                      state === "current"
                        ? "text-foreground"
                        : "hidden text-muted-foreground sm:inline",
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <span className="mx-2 h-px flex-1 bg-border sm:mx-4" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>

        <form
          id="add-business-wizard-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-col items-center"
        >
          <div className="flex w-full justify-center" style={{ maxWidth: bodyWidth }}>
            {currentStep === "details" && <AddBusinessDetailsStep form={form} />}
            {currentStep === "location" && <AddBusinessLocationStep form={form} />}
            {currentStep === "extras" && (
              <AddBusinessExtrasStep form={form} logoFileRef={logoFileRef} />
            )}
            {currentStep === "review" && <AddBusinessReviewStep form={form} />}
          </div>
        </form>

        <div className="mt-6 flex w-full justify-between" style={{ maxWidth: bodyWidth }}>
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 items-center border border-border px-[18px] text-xs font-bold uppercase leading-4 tracking-[-0.025em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back
          </button>

          {isLast ? (
            <button
              type="submit"
              form="add-business-wizard-form"
              disabled={isSubmitting}
              className="flex h-9 items-center gap-2 bg-foreground px-[22px] text-xs font-bold uppercase leading-4 tracking-[-0.025em] text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" strokeWidth={2.5} />
              )}
              {isSubmitting ? "Creating…" : "Create business"}
            </button>
          ) : (
            <button
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
