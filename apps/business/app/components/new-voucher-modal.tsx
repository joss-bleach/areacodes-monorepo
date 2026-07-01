import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
} from "@repo/ui";
import { toast } from "sonner";
import {
  voucherFormSchema,
  type VoucherFormValues,
} from "~/schemas/voucher-form-schema";
import { VoucherFormFields } from "~/components/voucher/voucher-form-fields";
import { VoucherDateRange } from "~/components/voucher/voucher-date-range";

export const NewVoucherModal = () => {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const { isOpen, setIsOpen } = useAddVoucher();
  const { editVoucherId, setEditVoucherId } = useEditVoucher();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createVoucher = useMutation(api.functions.vouchers.createVoucher);
  const updateVoucher = useMutation(api.functions.vouchers.updateVoucher);

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      title: "",
      description: "",
      discount: { kind: "custom", customText: "" },
      voucherTerms: "",
      voucherValidFrom: undefined,
      voucherValidTo: undefined,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (isEditMode && editVoucherData) {
      form.reset({
        title: editVoucherData.title,
        description: editVoucherData.description,
        discount: editVoucherData.discount,
        voucherTerms: editVoucherData.voucherTerms || "",
        voucherValidFrom: new Date(editVoucherData.voucherValidFrom),
        voucherValidTo: new Date(editVoucherData.voucherValidTo),
      });
    } else if (!isEditMode) {
      form.reset({
        title: "",
        description: "",
        discount: { kind: "custom", customText: "" },
        voucherTerms: "",
        voucherValidFrom: undefined,
        voucherValidTo: undefined,
      });
    }
  }, [editVoucherData, isEditMode]);

  useEffect(() => {
    if (!isOpen) {
      setEditVoucherId(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const onSubmit = async (data: VoucherFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (isEditMode && editVoucherId) {
        await updateVoucher({
          voucherId: editVoucherId as Id<"vouchers">,
          title: data.title,
          description: data.description,
          discount: data.discount,
          voucherTerms: data.voucherTerms || undefined,
          voucherValidFrom: data.voucherValidFrom!.getTime(),
          voucherValidTo: data.voucherValidTo!.getTime(),
        });
        toast.success("Voucher updated successfully");
      } else {
        if (!business?._id) {
          toast.error("Business not loaded");
          return;
        }
        await createVoucher({
          businessId: business._id as Id<"businesses">,
          provider: "manual",
          title: data.title,
          description: data.description,
          discount: data.discount,
          voucherTerms: data.voucherTerms || undefined,
          voucherValidFrom: data.voucherValidFrom!.getTime(),
          voucherValidTo: data.voucherValidTo!.getTime(),
        });
        toast.success("Voucher created successfully");
      }
      form.reset();
      setEditVoucherId(null);
      setIsOpen(false);
    } catch {
      toast.error(isEditMode ? "Failed to update voucher" : "Failed to create voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditVoucherId(null);
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
              : "Add a new voucher for your customers to use"}
          </DialogDescription>
        </DialogHeader>

        <form id="create-voucher-form" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <VoucherFormFields control={form.control} />
            <VoucherDateRange control={form.control} />
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
