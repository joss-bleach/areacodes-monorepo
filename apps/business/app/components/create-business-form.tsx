import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useConvexUpload } from "~/hooks/use-convex-upload";
import { Button } from "@repo/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import {
  Stepper,
  StepperList,
  StepperItem,
  StepperTrigger,
  StepperContent,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
} from "@repo/ui";
import { BusinessInformationStep } from "~/components/form-steps/business-information-step";
import { BusinessLocationStep } from "~/components/form-steps/business-location-step";
import { BusinessImageStep } from "~/components/form-steps/business-image-step";
import {
  businessProfileFormSchema,
  type BusinessProfileFormValues,
} from "~/schemas/business-profile-schema";

type FormValues = BusinessProfileFormValues;

const STEP_VALUES = [
  "business-information",
  "business-location",
  "business-image",
] as const;

type StepValue = (typeof STEP_VALUES)[number];

export const CreateBusinessForm = () => {
  const navigate = useNavigate();
  const logoFileRef = useRef<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepValue>(STEP_VALUES[0]);
  const shouldReduceMotion = useReducedMotion();

  const { upload } = useConvexUpload();
  const createBusiness = useMutation(api.functions.businesses.createBusiness);

  const form = useForm<FormValues>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: {
      name: "",
      description: "",
      websiteUrl: "",
      industryId: "",
      addressSearch: "",
      addressLine1: "",
      addressLine2: "",
      townOrCity: "",
      county: "",
      postcode: "",
      logoUrl: "",
      latitude: undefined,
      longitude: undefined,
    },
    mode: "onBlur",
  });

  const validateStep = async (
    value: string,
    direction: "next" | "prev"
  ): Promise<boolean> => {
    const fieldsToValidate: (keyof FormValues)[][] = [
      ["name", "description", "websiteUrl", "industryId"],
      ["addressLine1", "townOrCity", "county", "postcode"],
      [],
    ];

    const stepIndex = STEP_VALUES.indexOf(value as StepValue);
    if (stepIndex === -1) return true;

    if (direction === "next") {
      const fields = fieldsToValidate[stepIndex];
      const result = await form.trigger(fields as any);

      if (value === "business-image" && !logoFileRef.current) {
        toast.error("Please select a logo image");
        return false;
      }

      return result;
    }

    return true;
  };

  const renderStep = () => {
    switch (currentStep) {
      case "business-information":
        return <BusinessInformationStep form={form} idPrefix="create-business-form" />;
      case "business-location":
        return <BusinessLocationStep form={form} idPrefix="create-business-form" />;
      case "business-image":
        return <BusinessImageStep form={form} logoFileRef={logoFileRef} />;
      default:
        return <BusinessInformationStep form={form} idPrefix="create-business-form" />;
    }
  };

  const isFirstStep = currentStep === STEP_VALUES[0];
  const isLastStep = currentStep === STEP_VALUES[STEP_VALUES.length - 1];

  const geocodeAddress = async (
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "geocode", q: address }),
      });
      if (!response.ok) return null;
      const results = await response.json();
      if (results?.length > 0 && results[0].lat != null && results[0].lon != null) {
        return {
          latitude: Number(results[0].lat),
          longitude: Number(results[0].lon),
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (isSubmitting || isUploadingLogo) return;
    if (!logoFileRef.current) {
      toast.error("Please select a logo image");
      return;
    }

    setIsSubmitting(true);

    try {
      setIsUploadingLogo(true);
      const storageId = await upload(logoFileRef.current);
      setIsUploadingLogo(false);

      // Format address
      const address = [
        data.addressLine1,
        data.addressLine2,
        data.townOrCity,
        data.county,
        data.postcode,
      ]
        .filter(Boolean)
        .join(", ");

      // Geocode if coordinates missing
      let latitude = data.latitude;
      let longitude = data.longitude;

      if (latitude == null || longitude == null) {
        const coordinates = await geocodeAddress(address);
        if (!coordinates) {
          toast.error("Failed to determine business location");
          return;
        }
        latitude = coordinates.latitude;
        longitude = coordinates.longitude;
      }

      const business = await createBusiness({
        name: data.name,
        description: data.description,
        websiteUrl: data.websiteUrl || "",
        industryId: data.industryId as Id<"industries">,
        address,
        latitude,
        longitude,
        logoStorageId: storageId,
      });

      if (!business) {
        toast.error("Failed to create business");
        return;
      }

      toast.success("Business created successfully");
      navigate({ to: "/b/$slug", params: { slug: business.slug! } });
    } catch {
      toast.error("Failed to create business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || isUploadingLogo;

  return (
    <div className="py-6">
      <Stepper
        value={currentStep}
        onValueChange={(value) => setCurrentStep(value as StepValue)}
        onValidate={validateStep}
        activationMode="manual"
        className="px-4 md:px-0"
      >
        <StepperList>
          <StepperItem value="business-information">
            <StepperTrigger>
              <StepperIndicator>
                {(state) => (state === "completed" ? <Check className="size-4" /> : 1)}
              </StepperIndicator>
              <div className="flex flex-col items-start hidden md:flex">
                <StepperTitle>Information</StepperTitle>
              </div>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="business-location">
            <StepperTrigger>
              <StepperIndicator>
                {(state) => (state === "completed" ? <Check className="size-4" /> : 2)}
              </StepperIndicator>
              <div className="flex flex-col items-start hidden md:flex">
                <StepperTitle>Location</StepperTitle>
              </div>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="business-image">
            <StepperTrigger>
              <StepperIndicator>
                {(state) => (state === "completed" ? <Check className="size-4" /> : 3)}
              </StepperIndicator>
              <div className="flex flex-col items-start hidden md:flex">
                <StepperTitle>Logo</StepperTitle>
              </div>
            </StepperTrigger>
          </StepperItem>
        </StepperList>

        <div className="flex flex-col">
          <form
            id="create-business-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="contents"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -24 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.2, ease: "easeOut" }
                }
              >
                <StepperContent value={currentStep}>
                  {renderStep()}
                </StepperContent>
              </motion.div>
            </AnimatePresence>
          </form>
          <div className="flex flex-row justify-end items-center gap-4 mt-4 w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => {
                const currentIndex = STEP_VALUES.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(STEP_VALUES[currentIndex - 1]!);
                }
              }}
              disabled={isFirstStep}
            >
              Previous
            </Button>
            {isLastStep ? (
              <Button
                size="sm"
                type="submit"
                form="create-business-form"
                disabled={isPending}
                className="relative flex-1 md:flex-none"
              >
                <div className="flex items-center gap-2 justify-center min-w-[80px]">
                  {isPending && (
                    <Loader2 className="size-4 animate-spin shrink-0" />
                  )}
                  <motion.span
                    animate={
                      shouldReduceMotion ? {} : { x: isPending ? -4 : 0 }
                    }
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { duration: 0.2, ease: "easeOut" }
                    }
                    className="inline-block"
                  >
                    {isPending ? "Creating..." : "Create"}
                  </motion.span>
                </div>
              </Button>
            ) : (
              <Button
                size="sm"
                type="button"
                className="flex-1 md:flex-none"
                onClick={async () => {
                  const ok = await validateStep(currentStep, "next");
                  if (!ok) return;
                  const currentIndex = STEP_VALUES.indexOf(currentStep);
                  if (currentIndex < STEP_VALUES.length - 1) {
                    setCurrentStep(STEP_VALUES[currentIndex + 1]!);
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </Stepper>
    </div>
  );
};
