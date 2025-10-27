"use client";

import { useCreateBusinessForm } from "@/modules/business/hooks/use-create-business-form";
import { Button } from "@/components/ui/button";
import { BusinessInformationStep } from "./form-steps/business-information-step";
import { BusinessLocationStep } from "./form-steps/business-location-step";
import { BusinessImageStep } from "./form-steps/business-image-step";

export const CreateBusinessForm = () => {
  const {
    step,
    stepName,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
    resetForm,
  } = useCreateBusinessForm();

  const renderStep = () => {
    switch (stepName) {
      case "business-information":
        return <BusinessInformationStep />;
      case "business-location":
        return <BusinessLocationStep />;
      case "business-image":
        return <BusinessImageStep />;
      default:
        return <BusinessInformationStep />;
    }
  };

  return (
    <div className="py-6">
      {renderStep()}
      <div className="flex flex-row justify-end items-center gap-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={prevStep}
          disabled={isFirstStep}
        >
          Previous
        </Button>
        <Button size="sm" onClick={nextStep}>
          {isLastStep ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  );
};
