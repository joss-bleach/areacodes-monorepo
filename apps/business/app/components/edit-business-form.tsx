import { Effect } from "effect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Button, Skeleton } from "@repo/ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState, useEffect } from "react";
import { useConvexUpload } from "~/hooks/use-convex-upload";
import { BusinessInformationStep } from "~/components/form-steps/business-information-step";
import { BusinessLocationStep } from "~/components/form-steps/business-location-step";
import { BusinessImageStep } from "~/components/form-steps/business-image-step";
import {
  businessProfileFormSchema,
  type BusinessProfileFormValues,
} from "~/schemas/business-profile-schema";
import { parseAddress } from "~/lib/parse-address";

type FormValues = BusinessProfileFormValues;

export const EditBusinessForm = () => {
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug: string };
  const logoFileRef = useRef<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const { upload } = useConvexUpload();
  const updateBusiness = useMutation(api.functions.businesses.updateBusiness);

  const form = useForm<FormValues>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: {
      name: "",
      description: "",
      websiteUrl: "",
      industryId: "",
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

  useEffect(() => {
    if (!business) return;
    const parsedAddress = parseAddress(business.address);
    form.reset({
      name: business.name,
      description: business.description,
      websiteUrl: business.websiteUrl || "",
      industryId: business.industryId || "",
      addressLine1: parsedAddress.addressLine1,
      addressLine2: parsedAddress.addressLine2,
      townOrCity: parsedAddress.townOrCity,
      county: parsedAddress.county,
      postcode: parsedAddress.postcode,
      logoUrl: business.logoUrl || "",
      latitude: business.latitude ?? undefined,
      longitude: business.longitude ?? undefined,
    });
  }, [business]);

  if (business === undefined) {
    return <EditBusinessFormLoading />;
  }

  if (business === null) {
    return (
      <div className="text-sm text-muted-foreground">Business not found.</div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    if (isSubmitting || isUploadingLogo) return;

    setIsSubmitting(true);

    await Effect.runPromise(
      Effect.gen(function* () {
        let logoStorageId: Id<"_storage"> | undefined;

        if (logoFileRef.current) {
          yield* Effect.sync(() => setIsUploadingLogo(true));
          logoStorageId = yield* Effect.tryPromise({
            try: () => upload(logoFileRef.current!),
            catch: () => new Error("Logo upload failed"),
          }).pipe(Effect.ensuring(Effect.sync(() => setIsUploadingLogo(false))));
        }

        const address = [
          data.addressLine1,
          data.addressLine2,
          data.townOrCity,
          data.county,
          data.postcode,
        ]
          .filter(Boolean)
          .join(", ");

        if (data.latitude == null || data.longitude == null) {
          return yield* Effect.fail(new Error("Please set a location for the business"));
        }

        const updatedBusiness = yield* Effect.tryPromise({
          try: () =>
            updateBusiness({
              businessId: business._id as Id<"businesses">,
              name: data.name,
              description: data.description,
              websiteUrl: data.websiteUrl || "",
              industryId: data.industryId as Id<"industries">,
              address,
              latitude: data.latitude!,
              longitude: data.longitude!,
              logoStorageId:
                logoStorageId ?? (business.logoStorageId as Id<"_storage"> | undefined),
            }),
          catch: () => new Error("Failed to update business"),
        });

        yield* Effect.sync(() => {
          toast.success("Business updated successfully");
          const newSlug = updatedBusiness?.slug ?? slug;
          navigate({ to: "/b/$slug", params: { slug: newSlug } });
        });
      }).pipe(
        Effect.catchAll((err) =>
          Effect.sync(() => toast.error((err as Error).message || "Failed to update business"))
        ),
        Effect.ensuring(Effect.sync(() => setIsSubmitting(false)))
      )
    );
  };

  const isPending = isSubmitting || isUploadingLogo;

  return (
    <form
      id="edit-business-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="contents"
    >
      <div className="flex flex-col gap-6">
        <div className="bg-surface-raised border border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <span className="inline-block bg-foreground text-background px-2 py-1 text-sm font-bold uppercase tracking-tight leading-none">
              Business Information
            </span>
            <p className="text-xs text-muted-foreground mt-2">Update your business details</p>
          </div>
          <div className="p-5">
            <BusinessInformationStep form={form} idPrefix="edit-business-form" />
          </div>
        </div>

        <div className="bg-surface-raised border border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <span className="inline-block bg-foreground text-background px-2 py-1 text-sm font-bold uppercase tracking-tight leading-none">
              Business Location
            </span>
            <p className="text-xs text-muted-foreground mt-2">Update your address and pin your location</p>
          </div>
          <div className="p-5">
            <BusinessLocationStep
              form={form}
              idPrefix="edit-business-form"
              searchLabel="Search for a new address"
              searchPlaceholder="Search to update your business address…"
            />
          </div>
        </div>

        <div className="bg-surface-raised border border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <span className="inline-block bg-foreground text-background px-2 py-1 text-sm font-bold uppercase tracking-tight leading-none">
              Business Image
            </span>
            <p className="text-xs text-muted-foreground mt-2">Update your business logo</p>
          </div>
          <div className="p-5">
            <BusinessImageStep
              form={form}
              logoFileRef={logoFileRef}
              existingLogoUrl={business.logoUrl}
            />
          </div>
        </div>

        <div className="flex flex-row justify-end items-center gap-4 pt-4">
          <Button
            size="sm"
            type="submit"
            form="edit-business-form"
            disabled={isPending}
            className="relative"
          >
            <div className="flex items-center gap-2 justify-center min-w-[80px]">
              {isPending && (
                <Loader2 className="size-4 animate-spin shrink-0" />
              )}
              <span className="inline-block">
                {isPending ? "Updating..." : "Update Business"}
              </span>
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
};

const EditBusinessFormLoading = () => {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
};
