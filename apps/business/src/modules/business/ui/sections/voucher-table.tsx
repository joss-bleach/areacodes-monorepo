"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewVoucherButton } from "../components/new-voucher-button";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { BoundaryAlert } from "@/components/boundary-alert";
import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Voucher } from "db";
import { useEditVoucher } from "../../hooks/use-edit-voucher";
import { useAddVoucher } from "../../hooks/use-add-voucher";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

const getStatusColor = (status: "active" | "inactive") => {
  switch (status) {
    case "active":
      return "border-green-500/50 text-green-700 dark:text-green-400";
    case "inactive":
      return "border-gray-500/50 text-gray-700 dark:text-gray-400";
    default:
      return "";
  }
};

/**
 * Derives voucher status from start and end dates
 * Returns "active" if current date is between validFrom and validTo
 * Returns "inactive" if current date is before validFrom or after validTo
 */
const getVoucherStatus = (
  validFrom: Date | string,
  validTo: Date | string
): "active" | "inactive" => {
  const now = new Date();
  const from = new Date(validFrom);
  const to = new Date(validTo);

  // Normalize dates to start of day for comparison
  now.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  if (now < from || now > to) {
    return "inactive";
  }

  return "active";
};

const getStatusDisplay = (
  validFrom: Date | string,
  validTo: Date | string
): string => {
  const now = new Date();
  const from = new Date(validFrom);
  const to = new Date(validTo);

  // Normalize dates to start of day for comparison
  now.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  if (now < from) {
    return `Active from ${from.toLocaleDateString()}`;
  }

  if (now > to) {
    return "Expired";
  }

  return "Active";
};

const getFormatLabel = (format: string) => {
  switch (format) {
    case "barcode":
      return "Barcode";
    case "qr_code":
      return "QR Code";
    case "generated_text":
      return "Text";
    default:
      return format;
  }
};

type VoucherActionsDropdownProps = {
  voucher: Voucher;
};

const VoucherActionsDropdown = ({ voucher }: VoucherActionsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { slug } = useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setEditVoucherId } = useEditVoucher();
  const { setIsOpen: setIsModalOpen } = useAddVoucher();

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      // Check position before opening
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const menuHeight = 140; // Approximate height of menu
      setPositionAbove(spaceBelow < menuHeight);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const deleteVoucherMutation = useMutation({
    ...trpc.business.deleteVoucher.mutationOptions({}),
    onSuccess: () => {
      toast.success("Voucher deleted successfully");
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
      setIsOpen(false);
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast.error("Failed to delete voucher");
    },
  });

  const handleEdit = () => {
    setEditVoucherId(voucher.id);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const handleDeleteClick = () => {
    setIsOpen(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    deleteVoucherMutation.mutate({ id: voucher.id });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
        className="h-8 w-8"
      >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </Button>
      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            "absolute right-0 z-50 w-48 origin-top-right rounded-none border-none bg-background shadow-lg focus:outline-none",
            positionAbove ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          <div className="py-1">
            <button
              onClick={handleEdit}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent cursor-pointer"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deleteVoucherMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Voucher"
        description={`Are you sure you want to delete "${voucher.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteVoucherMutation.isPending}
      />
    </div>
  );
};

export const VoucherTable = () => {
  return (
    <Suspense fallback={<VoucherTableLoading />}>
      <ErrorBoundary fallback={<VoucherTableError />}>
        <VoucherTableSuspense />
      </ErrorBoundary>
    </Suspense>
  );
};

const VoucherTableSuspense = () => {
  const { slug } = useParams();
  const trpc = useTRPC();
  const { data: vouchers } = useSuspenseQuery(
    trpc.business.getVouchersByBusinessSlug.queryOptions({
      slug: slug as string,
    })
  );

  return (
    <Card className="rounded-none border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <CardTitle>All Vouchers</CardTitle>
            <CardDescription>
              View and manage your voucher codes
            </CardDescription>
          </div>
          <NewVoucherButton />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Title
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Format
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Valid Until
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vouchers?.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 px-4 text-center text-sm text-muted-foreground"
                  >
                    No vouchers found. Create your first voucher to get started.
                  </td>
                </tr>
              ) : (
                vouchers?.map((voucher) => (
                  <tr
                    key={voucher.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4 text-sm font-medium text-foreground">
                      {voucher.title}
                    </td>
                    <td className="py-4 px-4 text-sm text-foreground">
                      {voucher.description}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {getFormatLabel(voucher.voucherFormat)}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {new Date(voucher.voucherValidTo).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${getStatusColor(
                          getVoucherStatus(
                            voucher.voucherValidFrom,
                            voucher.voucherValidTo
                          )
                        )}`}
                      >
                        {getStatusDisplay(
                          voucher.voucherValidFrom,
                          voucher.voucherValidTo
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <VoucherActionsDropdown voucher={voucher} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const VoucherTableError = () => {
  return <BoundaryAlert title="Error" description="Error loading vouchers." />;
};

const VoucherTableLoading = () => {
  return (
    <Card className="rounded-none border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Title
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Format
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Valid Until
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
