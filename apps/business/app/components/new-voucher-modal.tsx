import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useAddVoucher } from "~/hooks/use-add-voucher";
import { useEditVoucher } from "~/hooks/use-edit-voucher";
import { useConvexUpload } from "~/hooks/use-convex-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@repo/ui";
import { toast } from "sonner";
import {
  voucherFormSchema,
  type VoucherFormValues,
} from "~/schemas/voucher-form-schema";
import { VoucherFormFields } from "~/components/voucher/voucher-form-fields";
import { VoucherDateRange } from "~/components/voucher/voucher-date-range";
import { VoucherFormatPicker } from "~/components/voucher/voucher-format-picker";
import {
  VoucherImageUpload,
  type VoucherImageUploadHandle,
} from "~/components/voucher/voucher-image-upload";
import { VoucherCodeGenerator } from "~/components/voucher/voucher-code-generator";

export const NewVoucherModal = () => {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const { isOpen, setIsOpen } = useAddVoucher();
  const { editVoucherId, setEditVoucherId } = useEditVoucher();
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const qrRef = useRef<VoucherImageUploadHandle>(null);
  const barcodeRef = useRef<VoucherImageUploadHandle>(null);

  const isEditMode = !!editVoucherId;

  const business = useQuery(
    api.functions.businesses.getBusinessBySlug,
    slug ? { slug } : "skip"
  );

  const editVoucherData = useQuery(
    api.functions.vouchers.getVoucherByIdWithBusiness,
    isEditMode && editVoucherId
      ? { voucherId: editVoucherId as Id<"vouchers"> }
      : "skip"
  );

  const { upload } = useConvexUpload();
  const createVoucher = useMutation(api.functions.vouchers.createVoucher);
  const updateVoucher = useMutation(api.functions.vouchers.updateVoucher);

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      title: "",
      description: "",
      voucherFormat: "qr-code",
      voucherGenCode: "",
      voucherTerms: "",
      voucherValidFrom: undefined,
      voucherValidTo: undefined,
    },
    mode: "onBlur",
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && editVoucherData) {
      const formFormat =
        editVoucherData.voucherFormat === "qr_code"
          ? "qr-code"
          : editVoucherData.voucherFormat === "barcode"
            ? "barcode"
            : "generated-text";

      form.reset({
        title: editVoucherData.title,
        description: editVoucherData.description,
        voucherFormat: formFormat,
        voucherGenCode: editVoucherData.voucherGenCode || "",
        voucherTerms: editVoucherData.voucherTerms || "",
        voucherValidFrom: new Date(editVoucherData.voucherValidFrom),
        voucherValidTo: new Date(editVoucherData.voucherValidTo),
      });

      if (editVoucherData.voucherGenCode) {
        setGeneratedCode(editVoucherData.voucherGenCode);
      }

      if (editVoucherData.voucherUrl) {
        setExistingImageUrl(editVoucherData.voucherUrl);
      }
    } else if (!isEditMode) {
      form.reset({
        title: "",
        description: "",
        voucherFormat: "qr-code",
        voucherGenCode: "",
        voucherTerms: "",
        voucherValidFrom: undefined,
        voucherValidTo: undefined,
      });
      setGeneratedCode("");
      setExistingImageUrl(null);
    }
  }, [editVoucherData, isEditMode]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditVoucherId(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const voucherFormat = form.watch("voucherFormat");

  const onSubmit = async (data: VoucherFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const qrFile = qrRef.current?.getFile() ?? null;
    const barcodeFile = barcodeRef.current?.getFile() ?? null;

    // Validate file requirements
    if (data.voucherFormat === "qr-code" && !qrFile && (!isEditMode || !existingImageUrl)) {
      setIsSubmitting(false);
      toast.error("Please upload a QR code image");
      return;
    }
    if (data.voucherFormat === "barcode" && !barcodeFile && (!isEditMode || !existingImageUrl)) {
      setIsSubmitting(false);
      toast.error("Please upload a barcode image");
      return;
    }
    if (data.voucherFormat === "generated-text" && !data.voucherGenCode) {
      setIsSubmitting(false);
      toast.error("Please generate a voucher code");
      return;
    }

    try {
      let voucherStorageId: Id<"_storage"> | undefined;

      if (data.voucherFormat === "qr-code" && qrFile) {
        voucherStorageId = await upload(qrFile);
      } else if (data.voucherFormat === "barcode" && barcodeFile) {
        voucherStorageId = await upload(barcodeFile);
      }

      const apiVoucherFormat =
        data.voucherFormat === "qr-code"
          ? "qr_code"
          : data.voucherFormat === "barcode"
            ? "barcode"
            : ("generated_text" as const);

      if (isEditMode && editVoucherId) {
        await updateVoucher({
          voucherId: editVoucherId as Id<"vouchers">,
          title: data.title,
          description: data.description,
          voucherFormat: apiVoucherFormat,
          voucherStorageId,
          voucherGenCode: data.voucherGenCode || undefined,
          voucherTerms: data.voucherTerms || undefined,
          voucherValidFrom: data.voucherValidFrom!.getTime(),
          voucherValidTo: data.voucherValidTo!.getTime(),
        });
        toast.success("Voucher updated successfully");
      } else {
        if (!business?._id) {
          toast.error("Business not loaded");
          setIsSubmitting(false);
          return;
        }
        await createVoucher({
          businessId: business._id as Id<"businesses">,
          title: data.title,
          description: data.description,
          voucherFormat: apiVoucherFormat,
          voucherStorageId,
          voucherGenCode: data.voucherGenCode || undefined,
          voucherTerms: data.voucherTerms || undefined,
          voucherValidFrom: data.voucherValidFrom!.getTime(),
          voucherValidTo: data.voucherValidTo!.getTime(),
        });
        toast.success("Voucher created successfully");
      }

      form.reset();
      setGeneratedCode("");
      setExistingImageUrl(null);
      setEditVoucherId(null);
      setIsOpen(false);
    } catch {
      toast.error(
        isEditMode ? "Failed to update voucher" : "Failed to create voucher"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditVoucherId(null);
      setExistingImageUrl(null);
      setGeneratedCode("");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen || isEditMode} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Voucher" : "Create New Voucher"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your voucher details"
              : "Add a new voucher code for your customers to use"}
          </DialogDescription>
        </DialogHeader>

        <form id="create-voucher-form" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <VoucherFormFields control={form.control} />
            <VoucherDateRange control={form.control} />
            <VoucherFormatPicker control={form.control} />

            {voucherFormat === "qr-code" && (
              <VoucherImageUpload
                ref={qrRef}
                type="qr-code"
                existingImageUrl={
                  voucherFormat === "qr-code" ? existingImageUrl : null
                }
                onExistingImageClear={() => setExistingImageUrl(null)}
              />
            )}

            {voucherFormat === "barcode" && (
              <VoucherImageUpload
                ref={barcodeRef}
                type="barcode"
                existingImageUrl={
                  voucherFormat === "barcode" ? existingImageUrl : null
                }
                onExistingImageClear={() => setExistingImageUrl(null)}
              />
            )}

            {voucherFormat === "generated-text" && (
              <VoucherCodeGenerator
                value={generatedCode}
                onChange={(code) => {
                  setGeneratedCode(code);
                  form.setValue("voucherGenCode", code);
                }}
              />
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-voucher-form"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-2 justify-center">
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update" : "Create"} Voucher
              </div>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
