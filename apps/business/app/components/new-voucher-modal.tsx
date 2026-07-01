import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useAddVoucher } from "~/hooks/use-add-voucher";
import { useEditVoucher } from "~/hooks/use-edit-voucher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Stepper,
  StepperList,
  StepperItem,
  StepperTrigger,
  StepperContent,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
} from "@repo/ui";
import { toast } from "sonner";
import {
  voucherFormSchema,
  type VoucherFormValues,
} from "~/schemas/voucher-form-schema";
import { VoucherFormFields } from "~/components/voucher/voucher-form-fields";
import { VoucherDateRange } from "~/components/voucher/voucher-date-range";
import { VoucherDiscountKindStep } from "~/components/form-steps/voucher-discount-kind-step";
import { VoucherDetailsStep } from "~/components/form-steps/voucher-details-step";
import { VoucherReviewStep } from "~/components/form-steps/voucher-review-step";
import { toMinorUnits, toMajorUnits } from "~/lib/discount-units";

// ── Wizard steps (Provider is skipped: Manual auto-selected as only option) ───

const WIZARD_STEPS = ["discount", "details", "review"] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const STEP_LABELS: Record<WizardStep, string> = {
  discount: "Discount",
  details: "Details",
  review: "Review",
};

// ── Create wizard ─────────────────────────────────────────────────────────────

interface CreateWizardProps {
  businessId: Id<"businesses">;
  onSuccess: () => void;
}

const CreateWizard = ({ businessId, onSuccess }: CreateWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WIZARD_STEPS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createVoucher = useMutation(api.functions.vouchers.createVoucher);

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      provider: "manual",
      discount: { kind: "percentage" },
      title: "",
      description: "",
      voucherTerms: "",
      voucherValidFrom: undefined as unknown as Date,
      voucherValidTo: undefined as unknown as Date,
    },
    mode: "onBlur",
  });

  const currentIndex = WIZARD_STEPS.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === WIZARD_STEPS.length - 1;

  const validateStep = (step: WizardStep): Promise<boolean> => {
    if (step === "discount") {
      return form.trigger("discount");
    }
    if (step === "details") {
      return form.trigger([
        "title",
        "description",
        "voucherValidFrom",
        "voucherValidTo",
      ]);
    }
    return Promise.resolve(true);
  };

  const goNext = async () => {
    const valid = await validateStep(currentStep);
    if (!valid) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex]!);
    }
  };

  const goPrev = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex]!);
    }
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
      toast.success("Voucher created");
      onSuccess();
    } catch {
      toast.error("Failed to create voucher");
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "discount":
        return <VoucherDiscountKindStep form={form} />;
      case "details":
        return <VoucherDetailsStep form={form} />;
      case "review":
        return <VoucherReviewStep form={form} />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Stepper
        value={currentStep}
        onValueChange={(v) => setCurrentStep(v as WizardStep)}
        activationMode="manual"
      >
        <StepperList>
          {WIZARD_STEPS.map((step, idx) => (
            <StepperItem key={step} value={step}>
              <StepperTrigger disabled>
                <StepperIndicator>
                  {(state) =>
                    state === "completed" ? <Check className="size-3" /> : idx + 1
                  }
                </StepperIndicator>
                <div className="hidden sm:flex flex-col items-start">
                  <StepperTitle>{STEP_LABELS[step]}</StepperTitle>
                </div>
              </StepperTrigger>
              {idx < WIZARD_STEPS.length - 1 && <StepperSeparator />}
            </StepperItem>
          ))}
        </StepperList>

        <form
          id="create-voucher-wizard"
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-4"
        >
          <StepperContent value={currentStep}>
            {renderStep()}
          </StepperContent>
        </form>
      </Stepper>

      <div className="flex justify-between items-center gap-3 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={isFirst}
          className="flex-1 sm:flex-none"
        >
          Back
        </Button>

        {isLast ? (
          <Button
            type="submit"
            form="create-voucher-wizard"
            size="sm"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Creating…
              </span>
            ) : (
              "Create voucher"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={goNext}
            className="flex-1 sm:flex-none"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Edit form (unchanged single-page experience) ──────────────────────────────

interface EditFormProps {
  editVoucherId: string;
  onSuccess: () => void;
}

const EditForm = ({ editVoucherId, onSuccess }: EditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateVoucher = useMutation(api.functions.vouchers.updateVoucher);

  const editVoucherData = useQuery(
    api.functions.vouchers.getVoucherByIdWithBusiness,
    { voucherId: editVoucherId as Id<"vouchers"> }
  );

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      provider: "manual",
      discount: { kind: "custom", customText: "" },
      title: "",
      description: "",
      voucherTerms: "",
      voucherValidFrom: undefined as unknown as Date,
      voucherValidTo: undefined as unknown as Date,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (editVoucherData) {
      form.reset({
        provider: editVoucherData.provider,
        title: editVoucherData.title,
        description: editVoucherData.description,
        discount: toMajorUnits(editVoucherData.discount),
        voucherTerms: editVoucherData.voucherTerms || "",
        voucherValidFrom: new Date(editVoucherData.voucherValidFrom),
        voucherValidTo: new Date(editVoucherData.voucherValidTo),
      });
    }
  }, [editVoucherData]);

  const onSubmit = async (data: VoucherFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await updateVoucher({
        voucherId: editVoucherId as Id<"vouchers">,
        title: data.title,
        description: data.description,
        discount: toMinorUnits(data.discount),
        voucherTerms: data.voucherTerms || undefined,
        voucherValidFrom: data.voucherValidFrom!.getTime(),
        voucherValidTo: data.voucherValidTo!.getTime(),
      });
      toast.success("Voucher updated");
      onSuccess();
    } catch {
      toast.error("Failed to update voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="edit-voucher-form" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        <VoucherFormFields control={form.control} />
        <VoucherDateRange control={form.control} />
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
        <Button type="submit" form="edit-voucher-form" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Updating…
            </span>
          ) : (
            "Update voucher"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

// ── Modal shell ───────────────────────────────────────────────────────────────

export const NewVoucherModal = () => {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const { isOpen, setIsOpen } = useAddVoucher();
  const { editVoucherId, setEditVoucherId } = useEditVoucher();

  const isEditMode = !!editVoucherId;

  const business = useQuery(
    api.functions.businesses.getBusinessBySlug,
    slug ? { slug } : "skip"
  );

  const handleSuccess = () => {
    setIsOpen(false);
    setEditVoucherId(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setEditVoucherId(null);
  };

  return (
    <Dialog open={isOpen || isEditMode} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit voucher" : "Create voucher"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your voucher details."
              : "Set up your offer in a few steps."}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && editVoucherId ? (
          <EditForm editVoucherId={editVoucherId} onSuccess={handleSuccess} />
        ) : business?._id ? (
          <CreateWizard
            key={isOpen ? "open" : "closed"}
            businessId={business._id as Id<"businesses">}
            onSuccess={handleSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
