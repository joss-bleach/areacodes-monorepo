import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Button,
  Skeleton,
} from "@repo/ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState, useEffect } from "react";
import { EditBusinessInformationStep } from "~/components/form-steps/edit-business-information-step";
import { EditBusinessLocationStep } from "~/components/form-steps/edit-business-location-step";
import { EditBusinessImageStep } from "~/components/form-steps/edit-business-image-step";
import {
  updateBusinessProfileFormSchema,
  type UpdateBusinessProfileFormValues,
} from "~/schemas/update-business-profile-schema";
import { parseAddress } from "~/lib/parse-address";

type FormValues = UpdateBusinessProfileFormValues;

export const EditBusinessForm = () => {
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug: string };
  const logoFileRef = useRef<File | null>(null);
  const isSubmittingRef = useRef(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const generateUploadUrl = useMutation(
    api.functions.businesses.generateUploadUrl
  );
  const updateBusiness = useMutation(api.functions.businesses.updateBusiness);

  const form = useForm<FormValues>({
    resolver: zodResolver(updateBusinessProfileFormSchema),
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

  // Populate form once business data is loaded
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
    if (isSubmittingRef.current || isUploadingLogo || isSubmitting) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      let logoStorageId: Id<"_storage"> | undefined = undefined;

      if (logoFileRef.current) {
        setIsUploadingLogo(true);
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFileRef.current.type },
          body: logoFileRef.current,
        });

        if (!uploadResponse.ok) {
          toast.error("Failed to upload logo");
          return;
        }

        const { storageId } = await uploadResponse.json();
        logoStorageId = storageId as Id<"_storage">;
        setIsUploadingLogo(false);
      }

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

      if (data.latitude == null || data.longitude == null) {
        toast.error("Please set a location for the business");
        return;
      }

      const updatedBusiness = await updateBusiness({
        businessId: business._id as Id<"businesses">,
        name: data.name,
        description: data.description,
        websiteUrl: data.websiteUrl || "",
        industryId: data.industryId as Id<"industries">,
        address,
        latitude: data.latitude,
        longitude: data.longitude,
        logoStorageId: logoStorageId ?? (business.logoStorageId as Id<"_storage"> | undefined),
      });

      toast.success("Business updated successfully");

      const newSlug = updatedBusiness?.slug ?? slug;
      navigate({ to: "/b/$slug", params: { slug: newSlug } });
    } catch {
      toast.error("Failed to update business");
    } finally {
      setIsSubmitting(false);
      setIsUploadingLogo(false);
      isSubmittingRef.current = false;
    }
  };

  const isPending = isSubmitting || isUploadingLogo;

  return (
    <form
      id="edit-business-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="contents"
    >
      <div className="flex flex-col gap-6">
        <Card className="rounded-none border-none">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none">
              Business Information
            </h2>
            <CardDescription>Update your business details</CardDescription>
            <CardContent className="p-4">
              <EditBusinessInformationStep form={form} />
            </CardContent>
          </CardHeader>
        </Card>

        <Card className="rounded-none border-none">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none">
              Business Location
            </h2>
            <CardDescription>
              Update your business address and location
            </CardDescription>
            <CardContent className="p-4">
              <EditBusinessLocationStep form={form} />
            </CardContent>
          </CardHeader>
        </Card>

        <Card className="rounded-none border-none">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none">
              Business Image
            </h2>
            <CardDescription>Update your business logo</CardDescription>
            <CardContent className="p-4">
              <EditBusinessImageStep
                form={form}
                logoFileRef={logoFileRef}
                existingLogoUrl={business.logoUrl}
              />
            </CardContent>
          </CardHeader>
        </Card>

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
