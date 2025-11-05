"use client";
import { useState, useEffect } from "react";
import {
  ClipboardIcon,
  Upload,
  X,
  ChevronDownIcon,
  Loader2,
  Check,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAddVoucher } from "../../hooks/use-add-voucher";
import { useEditVoucher } from "../../hooks/use-edit-voucher";
import { useFileUpload } from "@/modules/business/hooks/use-file-upload";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";

import { generateVoucherCode } from "@/lib/generate-voucher-code";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import {
  voucherFormSchema,
  type VoucherFormValues,
} from "@/modules/business/schemas/voucher-form-schema";

export const NewVoucherModal = () => {
  const { slug } = useParams();
  const { isOpen, setIsOpen } = useAddVoucher();
  const { editVoucherId, setEditVoucherId } = useEditVoucher();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editVoucherId;

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

  const { data: voucherData } = useQuery({
    ...trpc.business.getVoucherById.queryOptions({ id: editVoucherId! }),
    enabled: isEditMode && !!editVoucherId,
  });

  // Populate form when voucher data is loaded in edit mode
  useEffect(() => {
    if (isEditMode && voucherData) {
      const formFormat =
        voucherData.voucherFormat === "qr_code"
          ? "qr-code"
          : voucherData.voucherFormat === "barcode"
            ? "barcode"
            : "generated-text";

      form.reset({
        title: voucherData.title,
        description: voucherData.description,
        voucherFormat: formFormat,
        voucherGenCode: voucherData.voucherGenCode || "",
        voucherTerms: voucherData.voucherTerms || "",
        voucherValidFrom: new Date(voucherData.voucherValidFrom),
        voucherValidTo: new Date(voucherData.voucherValidTo),
      });

      if (voucherData.voucherGenCode) {
        setGeneratedCode(voucherData.voucherGenCode);
      }

      if (voucherData.voucherImgUrl) {
        setExistingImageUrl(voucherData.voucherImgUrl);
      }
    } else if (!isEditMode) {
      // Reset form when switching to create mode
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
  }, [voucherData, isEditMode, form]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditVoucherId(null);
      setIsSubmitting(false);
    }
  }, [isOpen, setEditVoucherId]);

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
    maxSize: 5 * 1024 * 1024, // 5MB
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
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
  });

  const qrPreviewUrl =
    qrFiles[0]?.preview ||
    (voucherFormat === "qr-code" && existingImageUrl ? existingImageUrl : null);
  const barcodePreviewUrl =
    barcodeFiles[0]?.preview ||
    (voucherFormat === "barcode" && existingImageUrl ? existingImageUrl : null);

  const createVoucherMutation = useMutation({
    ...trpc.business.createVoucher.mutationOptions({}),
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Voucher created successfully");
      queryClient.invalidateQueries(
        trpc.business.getVouchersByBusinessSlug.queryOptions({
          slug: slug as string,
        })
      );
      queryClient.invalidateQueries(
        trpc.business.getActiveVouchersByBusinessSlug.queryOptions({
          slug: slug as string,
        })
      );
      queryClient.invalidateQueries(
        trpc.business.getExpiringVouchersByBusinessSlug.queryOptions({
          slug: slug as string,
        })
      );
      form.reset();
      setGeneratedCode("");
      setIsCopied(false);
      setIsOpen(false);
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Failed to create voucher");
    },
  });

  const updateVoucherMutation = useMutation({
    ...trpc.business.updateVoucher.mutationOptions({}),
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Voucher updated successfully");
      queryClient.invalidateQueries(
        trpc.business.getVouchersByBusinessSlug.queryOptions({
          slug: slug as string,
        })
      );
      queryClient.invalidateQueries(
        trpc.business.getActiveVouchersByBusinessSlug.queryOptions({
          slug: slug as string,
        })
      );
      queryClient.invalidateQueries(
        trpc.business.getExpiringVouchersByBusinessSlug.queryOptions({
          slug: slug as string,
        })
      );
      form.reset();
      setGeneratedCode("");
      setIsCopied(false);
      setExistingImageUrl(null);
      setEditVoucherId(null);
      setIsOpen(false);
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Failed to update voucher");
    },
  });

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
      setTimeout(() => {
        setIsCopied(false);
      }, 5000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const onSubmit = async (data: VoucherFormValues) => {
    // Prevent double submission
    if (
      isSubmitting ||
      createVoucherMutation.isPending ||
      updateVoucherMutation.isPending
    ) {
      return;
    }

    setIsSubmitting(true);

    // Validate file uploads based on voucher format
    const qrFile = qrFiles[0]?.file instanceof File ? qrFiles[0].file : null;
    const barcodeFile =
      barcodeFiles[0]?.file instanceof File ? barcodeFiles[0].file : null;

    // In edit mode, allow existing images; in create mode, require upload
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
      // In edit mode, require image if format needs it and no existing image
      if (data.voucherFormat === "qr-code" && !qrFile && !existingImageUrl) {
        setIsSubmitting(false);
        toast.error("Please upload a QR code image");
        return;
      }
      if (
        data.voucherFormat === "barcode" &&
        !barcodeFile &&
        !existingImageUrl
      ) {
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
      let qrCodeUrl: string | undefined;
      let barcodeUrl: string | undefined;

      // Upload files if new files are provided
      if (data.voucherFormat === "qr-code" && qrFile) {
        const formData = new FormData();
        formData.append("file", qrFile);
        formData.append("bucket", "vouchers");
        formData.append("folder", "images");

        const uploadResponse = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          setIsSubmitting(false);
          toast.error(
            `Failed to upload QR code image: ${errorData.error || "Unknown error"}`
          );
          return;
        }

        const uploadData = await uploadResponse.json();
        qrCodeUrl = uploadData.url;
      } else if (
        data.voucherFormat === "qr-code" &&
        isEditMode &&
        existingImageUrl
      ) {
        // Use existing image if no new file uploaded
        qrCodeUrl = existingImageUrl;
      }

      if (data.voucherFormat === "barcode" && barcodeFile) {
        const formData = new FormData();
        formData.append("file", barcodeFile);
        formData.append("bucket", "vouchers");
        formData.append("folder", "images");

        const uploadResponse = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          setIsSubmitting(false);
          toast.error(
            `Failed to upload barcode image: ${errorData.error || "Unknown error"}`
          );
          return;
        }

        const uploadData = await uploadResponse.json();
        barcodeUrl = uploadData.url;
      } else if (
        data.voucherFormat === "barcode" &&
        isEditMode &&
        existingImageUrl
      ) {
        // Use existing image if no new file uploaded
        barcodeUrl = existingImageUrl;
      }

      // Convert voucher format from form to API format
      const apiVoucherFormat =
        data.voucherFormat === "qr-code"
          ? "qr_code"
          : data.voucherFormat === "barcode"
            ? "barcode"
            : "generated_text";

      // Determine voucherImgUrl based on format
      // QR code or barcode should have an image URL, generated text should not
      const voucherImgUrl = qrCodeUrl || barcodeUrl || undefined;

      // Prepare mutation input
      const mutationInput = {
        businessSlug: slug as string,
        title: data.title,
        description: data.description,
        voucherFormat: apiVoucherFormat as
          | "barcode"
          | "qr_code"
          | "generated_text",
        voucherGenCode: data.voucherGenCode || undefined,
        voucherTerms: data.voucherTerms || undefined,
        voucherImgUrl: voucherImgUrl,
        voucherValidFrom: data.voucherValidFrom,
        voucherValidTo: data.voucherValidTo,
      };

      if (isEditMode && editVoucherId) {
        updateVoucherMutation.mutate({
          ...mutationInput,
          id: editVoucherId,
        });
      } else {
        createVoucherMutation.mutate(mutationInput);
      }
    } catch (error) {
      setIsSubmitting(false);
      toast.error(
        isEditMode ? "Failed to update voucher" : "Failed to create voucher"
      );
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
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] rounded-none border-none border-border max-h-[90vh] overflow-y-auto">
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
                      className="rounded-none outline-none"
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
                      className="rounded-none outline-none"
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
                      className="rounded-none outline-none"
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
                              "w-full justify-between font-normal rounded-none outline-none",
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
                          className="w-auto overflow-hidden p-0 rounded-none outline-none"
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
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="end-date"
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-between font-normal rounded-none outline-none",
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
                          className="w-auto overflow-hidden p-0 rounded-none outline-none"
                          align="start"
                          sideOffset={4}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
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
                    className="flex flex-col sm:flex-row gap-0 rounded-none border border-border"
                  >
                    <label
                      htmlFor="qr-code"
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors rounded-none outline-none",
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
                        "flex flex-1 items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors rounded-none outline-none",
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
                        "flex flex-1 items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors rounded-none outline-none",
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
                  className="relative w-full min-h-[160px] cursor-pointer border-2 border-dashed border-border rounded-none bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
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
                    <>
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
                    </>
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center p-2">
                      <div className="w-24 h-24 bg-muted relative flex items-center justify-center">
                        <img
                          src="/qr-code-illustration.svg"
                          alt="QR code illustration"
                          className="w-full h-full object-contain opacity-10"
                          aria-hidden="true"
                        />
                      </div>
                      <Upload
                        className="h-4 w-4 mt-2 opacity-50"
                        aria-hidden="true"
                      />
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
                  className="relative w-full min-h-[80px] cursor-pointer border-2 border-dashed border-border rounded-none bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
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
                    <>
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
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2">
                      <div className="w-full max-w-xs h-12 bg-muted relative flex items-center justify-center mx-auto">
                        <img
                          src="/barcode-illustration.svg"
                          alt="Barcode illustration"
                          className="w-full h-full object-contain opacity-10"
                          aria-hidden="true"
                        />
                      </div>
                      <Upload
                        className="h-5 w-5 mt-3 opacity-50"
                        aria-hidden="true"
                      />
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
                    className="absolute right-0 top-0 h-full rounded-none"
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
              disabled={
                isSubmitting ||
                (isEditMode
                  ? updateVoucherMutation.isPending
                  : createVoucherMutation.isPending)
              }
            >
              <div className="flex items-center gap-2 justify-center">
                {(isEditMode
                  ? updateVoucherMutation.isPending
                  : createVoucherMutation.isPending) && (
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
