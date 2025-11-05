"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditBusinessInformationStep } from "./form-steps/edit-business-information-step";
import { EditBusinessLocationStep } from "./form-steps/edit-business-location-step";
import { EditBusinessImageStep } from "./form-steps/edit-business-image-step";
import { useRouter, useParams } from "next/navigation";
import { updateBusinessProfileFormSchema } from "@/modules/business/schemas/update-business-profile-schema";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import { parseAddress } from "@/lib/parse-address";

type FormValues = z.infer<typeof updateBusinessProfileFormSchema>;

export const EditBusinessForm = () => {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const trpc = useTRPC();
  const logoFileRef = useRef<File | null>(null);
  const isSubmittingRef = useRef(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Load business data
  const { data: business } = useSuspenseQuery(
    trpc.business.getBusinessBySlug.queryOptions({ slug })
  );

  // Parse address from business data
  const parsedAddress = business ? parseAddress(business.address) : null;

  // Initialize form with business data if available, otherwise empty values
  const defaultValues =
    business && parsedAddress
      ? {
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
        }
      : {
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
        };

  const form = useForm<FormValues>({
    resolver: zodResolver(updateBusinessProfileFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const updateBusinessMutation = useMutation({
    ...trpc.business.update.mutationOptions({}),
    onSuccess: (updatedBusiness) => {
      setIsUploadingLogo(false);
      isSubmittingRef.current = false;
      toast.success("Business updated successfully");
      // Redirect to new slug if it changed
      if (updatedBusiness.slug !== slug) {
        router.push(`/b/${updatedBusiness.slug}`);
      } else {
        router.push(`/b/${slug}`);
      }
    },
    onError: () => {
      setIsUploadingLogo(false);
      isSubmittingRef.current = false;
      toast.error("Failed to update business");
    },
  });

  const onSubmit = async (data: FormValues) => {
    // Prevent double submission
    if (
      isSubmittingRef.current ||
      updateBusinessMutation.isPending ||
      isUploadingLogo
    ) {
      return;
    }

    if (!business) {
      toast.error("Business data not loaded");
      return;
    }

    isSubmittingRef.current = true;

    try {
      let logoUrl = business.logoUrl;

      // Only upload logo if a new file is selected
      if (logoFileRef.current) {
        setIsUploadingLogo(true);
        const uploadResult = await uploadFile(logoFileRef.current, {
          bucket: "company-logos",
          folder: "logos",
          fileName: logoFileRef.current.name,
          upsert: true,
        });

        setIsUploadingLogo(false);

        if (uploadResult.error || !uploadResult.url) {
          toast.error("Failed to upload logo");
          isSubmittingRef.current = false;
          return;
        }

        logoUrl = uploadResult.url;
      }

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

      // Ensure we have coordinates
      if (data.latitude == null || data.longitude == null) {
        toast.error("Please set a location on the map");
        isSubmittingRef.current = false;
        return;
      }

      // Prepare mutation input
      const mutationInput = {
        slug: slug,
        name: data.name,
        description: data.description,
        websiteUrl: data.websiteUrl || "",
        industryId: data.industryId,
        address: address,
        latitude: data.latitude,
        longitude: data.longitude,
        logoUrl: logoUrl,
      };

      // Call tRPC mutation
      updateBusinessMutation.mutate(mutationInput);
    } catch (error) {
      setIsUploadingLogo(false);
      isSubmittingRef.current = false;
      toast.error("Failed to update business");
    }
  };

  return (
    <form
      id="edit-business-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="contents"
    >
      <div className="flex flex-col gap-6">
        <Card className="rounded-none border-none">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none">Business Information</h2>
            <CardDescription>Update your business details</CardDescription>
            <CardContent className="p-4">
              <EditBusinessInformationStep form={form} />
            </CardContent>
          </CardHeader>
        </Card>

        <Card className="rounded-none border-none">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none">Business Location</h2>
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
            <h2 className="text-lg font-semibold leading-none">Business Image</h2>
            <CardDescription>Update your business logo</CardDescription>
            <CardContent className="p-4">
              <EditBusinessImageStep
                form={form}
                logoFileRef={logoFileRef}
                existingLogoUrl={business?.logoUrl}
              />
            </CardContent>
          </CardHeader>
        </Card>

        <div className="flex flex-row justify-end items-center gap-4 pt-4">
          <Button
            size="sm"
            type="submit"
            form="edit-business-form"
            disabled={
              isSubmittingRef.current ||
              updateBusinessMutation.isPending ||
              isUploadingLogo
            }
            className="relative"
          >
            <div className="flex items-center gap-2 justify-center min-w-[80px]">
              {(updateBusinessMutation.isPending || isUploadingLogo) && (
                <Loader2 className="size-4 animate-spin shrink-0" />
              )}
              <span className="inline-block">
                {updateBusinessMutation.isPending || isUploadingLogo
                  ? "Updating..."
                  : "Update Business"}
              </span>
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
};
