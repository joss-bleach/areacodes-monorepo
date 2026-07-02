import { useConvexAuth, useQuery } from "convex/react";
import type { UseFormReturn } from "react-hook-form";
import { api } from "@repo/convex";
import type { AddBusinessFormValues } from "~/schemas/add-business-form-schema";

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
    <span className="text-xs font-bold uppercase tracking-[-0.025em] text-muted-foreground">
      {label}
    </span>
    <span className="text-sm text-foreground text-right">{value || "—"}</span>
  </div>
);

export const AddBusinessReviewStep = ({
  form,
}: {
  form: UseFormReturn<AddBusinessFormValues>;
}) => {
  const { isAuthenticated } = useConvexAuth();
  const industries = useQuery(
    api.functions.industries.getAllIndustries,
    isAuthenticated ? {} : "skip",
  );

  const values = form.getValues();
  const industryName = industries?.find((i) => i._id === values.industryId)?.name ?? "—";

  return (
    <div className="w-full flex flex-col">
      <div className="border border-border">
        <div className="px-4">
          <ReviewRow label="Business name" value={values.name} />
          <ReviewRow label="Owner email" value={values.ownerEmail} />
          <ReviewRow label="Industry" value={industryName} />
          <ReviewRow label="Address" value={values.address} />
          <ReviewRow label="Description" value={values.description ?? ""} />
          <ReviewRow label="Website" value={values.websiteUrl ?? ""} />
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        The owner will receive a sign-in invitation at this email address.
      </p>
    </div>
  );
};
