import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
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
import { toMinorUnits, toMajorUnits } from "~/lib/discount-units";

interface EditFormProps {
  editVoucherId: string;
  onSuccess: () => void;
}

const EditForm = ({ editVoucherId, onSuccess }: EditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateVoucher = useMutation(api.functions.vouchers.updateVoucher);

  const editVoucherData = useQuery(
    api.functions.vouchers.getVoucherByIdWithBusiness,
    { voucherId: editVoucherId as Id<"vouchers"> }
  );

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      provider: "manual",
      discount: { kind: "custom", customText: "" },
      title: "",
      description: "",
      voucherTerms: "",
      voucherValidFrom: undefined as unknown as Date,
      voucherValidTo: undefined as unknown as Date,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (editVoucherData) {
      form.reset({
        provider: editVoucherData.provider,
        title: editVoucherData.title,
        description: editVoucherData.description,
        discount: toMajorUnits(editVoucherData.discount),
        voucherTerms: editVoucherData.voucherTerms || "",
        voucherValidFrom: new Date(editVoucherData.voucherValidFrom),
        voucherValidTo: new Date(editVoucherData.voucherValidTo),
      });
    }
  }, [editVoucherData]);

  const onSubmit = async (data: VoucherFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await updateVoucher({
        voucherId: editVoucherId as Id<"vouchers">,
        title: data.title,
        description: data.description,
        discount: toMinorUnits(data.discount),
        voucherTerms: data.voucherTerms || undefined,
        voucherValidFrom: data.voucherValidFrom!.getTime(),
        voucherValidTo: data.voucherValidTo!.getTime(),
      });
      toast.success("Voucher updated");
      onSuccess();
    } catch {
      toast.error("Failed to update voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="edit-voucher-form" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        <VoucherFormFields control={form.control} />
        <VoucherDateRange control={form.control} />
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
        <Button type="submit" form="edit-voucher-form" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Updating…
            </span>
          ) : (
            "Update voucher"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const EditVoucherModal = () => {
  const { editVoucherId, setEditVoucherId } = useEditVoucher();

  const isOpen = !!editVoucherId;

  const handleOpenChange = (open: boolean) => {
    if (!open) setEditVoucherId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit voucher</DialogTitle>
          <DialogDescription>Update your voucher details.</DialogDescription>
        </DialogHeader>

        {editVoucherId && (
          <EditForm
            editVoucherId={editVoucherId}
            onSuccess={() => setEditVoucherId(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
