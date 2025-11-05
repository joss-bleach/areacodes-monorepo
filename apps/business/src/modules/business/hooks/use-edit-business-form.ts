"use client";

import { useQueryState } from "nuqs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const useEditBusinessForm = () => {
  const pathname = usePathname();
  const [step, setStep] = useQueryState("step", {
    defaultValue: "1",
    parse: (value) => value,
    serialize: (value) => value,
  });

  // Clear step from URL when not on edit page
  useEffect(() => {
    if (!pathname.includes("/b/") || !pathname.includes("/edit")) {
      setStep(null);
    }
  }, [pathname, setStep]);

  const nextStep = () => {
    const currentStep = parseInt(step || "1");
    setStep((currentStep + 1).toString());
  };

  const prevStep = () => {
    const currentStep = parseInt(step || "1");
    if (currentStep > 1) {
      setStep((currentStep - 1).toString());
    }
  };

  const goToStep = (stepNumber: number) => {
    setStep(stepNumber.toString());
  };

  const resetForm = () => {
    setStep("1");
  };

  const stepNames = [
    "business-information",
    "business-location",
    "business-image",
  ] as const;
  const currentStepName = stepNames[parseInt(step || "1") - 1] || stepNames[0];

  const isFirstStep = step === "1";
  const isLastStep = step === "3";

  return {
    // Current step
    step: parseInt(step || "1"),
    stepName: currentStepName,
    stepNames,

    // Navigation
    nextStep,
    prevStep,
    goToStep,
    resetForm,

    // Step helpers
    isFirstStep,
    isLastStep,
  };
};

