"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { BusinessInformationStep } from "./form-steps/business-information-step";
import { BusinessLocationStep } from "./form-steps/business-location-step";
import { BusinessImageStep } from "./form-steps/business-image-step";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createBusinessProfileFormSchema } from "@/modules/business/schemas/create-business-profile-schema";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import {
  Stepper,
  StepperList,
  StepperItem,
  StepperTrigger,
  StepperContent,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
} from "@/components/ui/stepper";

type FormValues = z.infer<typeof createBusinessProfileFormSchema>;

const STEP_VALUES = [
  "business-information",
  "business-location",
  "business-image",
] as const;

type StepValue = (typeof STEP_VALUES)[number];

export const CreateBusinessForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const logoFileRef = useRef<File | null>(null);
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepValue>(
    STEP_VALUES[0],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(createBusinessProfileFormSchema),
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
    direction: "next" | "prev",
  ): Promise<boolean> => {
    const fieldsToValidate: (keyof FormValues)[][] = [
      ["name", "description", "websiteUrl", "industryId"], // business-information
      ["addressLine1", "townOrCity", "county", "postcode"], // business-location
      [], // business-image - we validate file selection separately
    ];

    const stepIndex = STEP_VALUES.indexOf(value as StepValue);
    if (stepIndex === -1) return true;

    // Only validate when moving forward
    if (direction === "next") {
      const fields = fieldsToValidate[stepIndex];
      const result = await form.trigger(fields as any);

      // Special validation for image step
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
        return <BusinessInformationStep form={form} />;
      case "business-location":
        return <BusinessLocationStep form={form} />;
      case "business-image":
        return <BusinessImageStep form={form} logoFileRef={logoFileRef} />;
      default:
        return <BusinessInformationStep form={form} />;
    }
  };

  const isFirstStep = currentStep === STEP_VALUES[0];
  const isLastStep = currentStep === STEP_VALUES[STEP_VALUES.length - 1];

  const createBusinessMutation = useMutation({
    ...trpc.business.create.mutationOptions({}),
    onSuccess: (business) => {
      setIsSubmitting(false);
      toast.success("Business created successfully");
      router.push(`/b/${business.slug}`);
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Failed to create business");
    },
  });

  const geocodeAddress = async (
    address: string
  ): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: address }),
      });

      if (!response.ok) {
        return null;
      }

      const results = await response.json();

      // Use the first result if available
      if (
        results &&
        results.length > 0 &&
        results[0].lat != null &&
        results[0].lon != null
      ) {
        return {
          latitude: Number(results[0].lat),
          longitude: Number(results[0].lon),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  const onSubmit = async (data: FormValues) => {
    // Prevent double submission
    if (isSubmittingRef.current || createBusinessMutation.isPending || isUploadingLogo) {
      return;
    }

    // Validate that a logo file is selected
    if (!logoFileRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      // Upload the logo file first
      setIsUploadingLogo(true);
      const uploadResult = await uploadFile(logoFileRef.current, {
        bucket: "company-logos",
        folder: "logos",
        fileName: logoFileRef.current.name,
        upsert: true,
      });

      setIsUploadingLogo(false);

      if (uploadResult.error || !uploadResult.url) {
        toast.error("Failed to create business");
        isSubmittingRef.current = false;
        return;
      }

      const logoUrl = uploadResult.url;

      // Format address into a single string
      const address = [
        data.addressLine1,
        data.addressLine2,
        data.townOrCity,
        data.county,
        data.postcode,
      ]
        .filter(Boolean)
        .join(", ");

      // If latitude and longitude are missing, geocode the address
      let latitude = data.latitude;
      let longitude = data.longitude;

      if (latitude == null || longitude == null) {
        const coordinates = await geocodeAddress(address);

        if (!coordinates) {
          toast.error("Failed to create business");
          isSubmittingRef.current = false;
          return;
        }

        latitude = coordinates.latitude;
        longitude = coordinates.longitude;
      }

      // Prepare mutation input (clerkUserId and slug are set by the procedure)
      const mutationInput = {
        name: data.name,
        description: data.description,
        websiteUrl: data.websiteUrl || "",
        industryId: data.industryId,
        address: address,
        latitude: latitude,
        longitude: longitude,
        logoUrl: logoUrl,
      };

      // Call tRPC mutation - this will handle loading state via isPending
      createBusinessMutation.mutate(mutationInput);
    } catch (error) {
      setIsUploadingLogo(false);
      isSubmittingRef.current = false;
      toast.error("Failed to create business");
    }
  };

  return (
    <div className="py-6">
      <Stepper
        value={currentStep}
        onValueChange={(value) => setCurrentStep(value as StepValue)}
        onValidate={validateStep}
        activationMode="manual"
      >
        <StepperList>
          <StepperItem value="business-information">
            <StepperTrigger>
              <StepperIndicator />
              <div className="flex flex-col items-start">
                <StepperTitle>Information</StepperTitle>
              </div>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="business-location">
            <StepperTrigger>
              <StepperIndicator />
              <div className="flex flex-col items-start">
                <StepperTitle>Location</StepperTitle>
              </div>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem value="business-image">
            <StepperTrigger>
              <StepperIndicator />
              <div className="flex flex-col items-start">
                <StepperTitle>Logo</StepperTitle>
              </div>
            </StepperTrigger>
          </StepperItem>
        </StepperList>

        <form
          id="create-business-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="contents"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <StepperContent value={currentStep}>
                {renderStep()}
              </StepperContent>
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-row justify-end items-center gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const currentIndex = STEP_VALUES.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(STEP_VALUES[currentIndex - 1]);
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
                disabled={isSubmitting || createBusinessMutation.isPending}
                className="relative"
              >
                <div className="flex items-center gap-2 justify-center min-w-[80px]">
                  {createBusinessMutation.isPending && (
                    <Loader2 className="size-4 animate-spin shrink-0" />
                  )}
                  <motion.span
                    animate={{
                      x: createBusinessMutation.isPending ? -4 : 0,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="inline-block"
                  >
                    {createBusinessMutation.isPending
                      ? "Creating..."
                      : "Create"}
                  </motion.span>
                </div>
              </Button>
            ) : (
              <Button
                size="sm"
                type="button"
                onClick={async () => {
                  const ok = await validateStep(currentStep, "next");
                  if (!ok) {
                    return;
                  }
                  const currentIndex = STEP_VALUES.indexOf(currentStep);
                  if (currentIndex < STEP_VALUES.length - 1) {
                    setCurrentStep(STEP_VALUES[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>
        </form>
      </Stepper>
    </div>
  );
};
