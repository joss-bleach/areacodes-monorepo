import { useState, useEffect } from "react";
import {
  ClipboardIcon,
  Upload,
  X,
  ChevronDownIcon,
  Loader2,
  Check,
} from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useAddVoucher } from "~/hooks/use-add-voucher";
import { useEditVoucher } from "~/hooks/use-edit-voucher";
import { useFileUpload } from "~/hooks/use-file-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  RadioGroup,
  RadioGroupItem,
  Input,
  Textarea,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@repo/ui";
import { cn } from "@repo/ui";
import { generateVoucherCode } from "~/lib/generate-voucher-code";
import { toast } from "sonner";
import {
  voucherFormSchema,
  type VoucherFormValues,
} from "~/schemas/voucher-form-schema";

export const NewVoucherModal = () => {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const { isOpen, setIsOpen } = useAddVoucher();
  const { editVoucherId, setEditVoucherId } = useEditVoucher();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
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

  const generateUploadUrl = useMutation(
    api.functions.businesses.generateUploadUrl
  );
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

  const [
    { files: qrFiles, errors: qrErrors },
    {
      removeFile: removeQrFile,
      clearFiles: clearQrFiles,
      openFileDialog: openQrDialog,
      getInputProps: getQrInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const [
    { files: barcodeFiles, errors: barcodeErrors },
    {
      removeFile: removeBarcodeFile,
      clearFiles: clearBarcodeFiles,
      openFileDialog: openBarcodeDialog,
      getInputProps: getBarcodeInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const qrPreviewUrl =
    qrFiles[0]?.preview ||
    (voucherFormat === "qr-code" && existingImageUrl ? existingImageUrl : null);
  const barcodePreviewUrl =
    barcodeFiles[0]?.preview ||
    (voucherFormat === "barcode" && existingImageUrl ? existingImageUrl : null);

  const handleGenerateCode = () => {
    const newCode = generateVoucherCode();
    setGeneratedCode(newCode);
    form.setValue("voucherGenCode", newCode);
    setIsCopied(false);
  };

  const handleCopyCode = async () => {
    if (!generatedCode) {
      toast.error("No code to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success("Code copied to clipboard");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 5000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const uploadVoucherImage = async (file: File): Promise<Id<"_storage"> | null> => {
    const uploadUrl = await generateUploadUrl();
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) return null;
    const { storageId } = await uploadResponse.json();
    return storageId as Id<"_storage">;
  };

  const onSubmit = async (data: VoucherFormValues) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const qrFile = qrFiles[0]?.file instanceof File ? qrFiles[0].file : null;
    const barcodeFile =
      barcodeFiles[0]?.file instanceof File ? barcodeFiles[0].file : null;

    // Validate file requirements
    if (!isEditMode) {
      if (data.voucherFormat === "qr-code" && !qrFile) {
        setIsSubmitting(false);
        toast.error("Please upload a QR code image");
        return;
      }
      if (data.voucherFormat === "barcode" && !barcodeFile) {
        setIsSubmitting(false);
        toast.error("Please upload a barcode image");
        return;
      }
    } else {
      if (data.voucherFormat === "qr-code" && !qrFile && !existingImageUrl) {
        setIsSubmitting(false);
        toast.error("Please upload a QR code image");
        return;
      }
      if (data.voucherFormat === "barcode" && !barcodeFile && !existingImageUrl) {
        setIsSubmitting(false);
        toast.error("Please upload a barcode image");
        return;
      }
    }

    if (data.voucherFormat === "generated-text" && !data.voucherGenCode) {
      setIsSubmitting(false);
      toast.error("Please generate a voucher code");
      return;
    }

    try {
      let voucherStorageId: Id<"_storage"> | undefined;

      // Upload image if a new file is provided
      if (data.voucherFormat === "qr-code" && qrFile) {
        const sid = await uploadVoucherImage(qrFile);
        if (!sid) {
          setIsSubmitting(false);
          toast.error("Failed to upload QR code image");
          return;
        }
        voucherStorageId = sid;
      } else if (data.voucherFormat === "barcode" && barcodeFile) {
        const sid = await uploadVoucherImage(barcodeFile);
        if (!sid) {
          setIsSubmitting(false);
          toast.error("Failed to upload barcode image");
          return;
        }
        voucherStorageId = sid;
      }

      // Map form format to Convex format
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
      setIsCopied(false);
      setExistingImageUrl(null);
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
      clearQrFiles();
      clearBarcodeFiles();
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
            <FieldGroup>
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="voucher-title">Title</FieldLabel>
                    <Input
                      {...field}
                      id="voucher-title"
                      placeholder="Enter voucher title…"

                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="voucher-description">
                      Description
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="voucher-description"
                      placeholder="Enter voucher description…"

                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="voucherTerms"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="voucher-terms">
                      Terms & Conditions
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="voucher-terms"
                      placeholder="Enter voucher terms and conditions (optional)…"

                      aria-invalid={fieldState.invalid}
                      rows={4}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-4">
                <Controller
                  name="voucherValidFrom"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field className="flex-1" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="start-date">Start date</FieldLabel>
                      <Popover
                        open={startDateOpen}
                        onOpenChange={setStartDateOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="start-date"
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            aria-invalid={fieldState.invalid}
                          >
                            <span className="truncate">
                              {field.value
                                ? field.value.toLocaleDateString()
                                : "Select date"}
                            </span>
                            <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="start"
                          sideOffset={4}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              field.onChange(date);
                              setStartDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="voucherValidTo"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field className="flex-1" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="end-date">End date</FieldLabel>
                      <Popover
                        open={endDateOpen}
                        onOpenChange={setEndDateOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="end-date"
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            aria-invalid={fieldState.invalid}
                          >
                            <span className="truncate">
                              {field.value
                                ? field.value.toLocaleDateString()
                                : "Select date"}
                            </span>
                            <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="start"
                          sideOffset={4}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
                            fromDate={new Date()}
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 10}
                            onSelect={(date) => {
                              field.onChange(date);
                              setEndDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            <Controller
              name="voucherFormat"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Voucher type</FieldLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col sm:flex-row gap-0 border border-border"
                  >
                    <label
                      htmlFor="qr-code"
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                        field.value === "qr-code"
                          ? "bg-muted"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value="qr-code" id="qr-code" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        QR Code
                      </span>
                    </label>
                    <label
                      htmlFor="barcode"
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                        field.value === "barcode"
                          ? "bg-muted"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value="barcode" id="barcode" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        Barcode
                      </span>
                    </label>
                    <label
                      htmlFor="generated-text"
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                        field.value === "generated-text"
                          ? "bg-muted"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem
                        value="generated-text"
                        id="generated-text"
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        Text
                      </span>
                    </label>
                  </RadioGroup>
                </Field>
              )}
            />

            {voucherFormat === "qr-code" && (
              <div className="space-y-4">
                <div
                  onClick={openQrDialog}
                  className="relative w-full min-h-[160px] cursor-pointer border-2 border-dashed border-border bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openQrDialog();
                    }
                  }}
                  aria-label="Upload QR code image"
                >
                  {qrPreviewUrl ? (
                    <div className="relative w-full flex flex-col items-center justify-center p-2">
                      <div className="w-24 h-24 bg-muted relative flex items-center justify-center">
                        <img
                          src={qrPreviewUrl}
                          alt="QR code preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (qrFiles[0]?.id) {
                            removeQrFile(qrFiles[0].id);
                          } else {
                            setExistingImageUrl(null);
                          }
                        }}
                        aria-label="Remove QR code"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center p-2">
                      <Upload className="h-4 w-4 mt-2 opacity-50" aria-hidden="true" />
                      <p className="mt-1.5 text-xs text-muted-foreground text-center">
                        Click to upload QR code
                      </p>
                    </div>
                  )}
                  <input
                    {...getQrInputProps()}
                    className="sr-only"
                    aria-label="Upload QR code file"
                    tabIndex={-1}
                  />
                </div>
                {qrErrors.length > 0 && (
                  <div className="text-xs text-red-600 text-center">
                    {qrErrors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                )}
                {qrFiles[0] && (
                  <p className="text-xs text-muted-foreground text-center">
                    {qrFiles[0].file.name}
                  </p>
                )}
              </div>
            )}

            {voucherFormat === "barcode" && (
              <div className="space-y-4">
                <div
                  onClick={openBarcodeDialog}
                  className="relative w-full min-h-[80px] cursor-pointer border-2 border-dashed border-border bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBarcodeDialog();
                    }
                  }}
                  aria-label="Upload barcode image"
                >
                  {barcodePreviewUrl ? (
                    <div className="relative flex flex-col items-center justify-center p-2">
                      <div className="w-full max-w-xs h-12 bg-muted relative flex items-center justify-center mx-auto">
                        <img
                          src={barcodePreviewUrl}
                          alt="Barcode preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (barcodeFiles[0]?.id) {
                            removeBarcodeFile(barcodeFiles[0].id);
                          } else {
                            setExistingImageUrl(null);
                          }
                        }}
                        aria-label="Remove barcode"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2">
                      <Upload className="h-5 w-5 mt-3 opacity-50" aria-hidden="true" />
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        Click to upload barcode
                      </p>
                    </div>
                  )}
                  <input
                    {...getBarcodeInputProps()}
                    className="sr-only"
                    aria-label="Upload barcode file"
                    tabIndex={-1}
                  />
                </div>
                {barcodeErrors.length > 0 && (
                  <div className="text-xs text-red-600 text-center">
                    {barcodeErrors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                )}
                {barcodeFiles[0] && (
                  <p className="text-xs text-muted-foreground text-center">
                    {barcodeFiles[0].file.name}
                  </p>
                )}
              </div>
            )}

            {voucherFormat === "generated-text" && (
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="generated-code" className="sr-only">
                    Generated voucher code
                  </label>
                  <Input
                    id="generated-code"
                    readOnly
                    type="text"
                    placeholder="Generate your voucher…"
                    className="font-mono pr-10 text-xs sm:text-sm"
                    value={generatedCode || ""}
                    aria-label="Generated voucher code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={handleCopyCode}
                    aria-label="Copy code to clipboard"
                    disabled={!generatedCode || isCopied}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ClipboardIcon aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-xs text-muted-foreground px-0"
                  onClick={handleGenerateCode}
                >
                  Generate code
                </Button>
              </div>
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
