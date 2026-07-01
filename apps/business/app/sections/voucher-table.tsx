import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  voucherStatus,
  type VoucherStatus,
} from "@areacodes/domain";
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/ui";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { BoundaryAlert } from "~/components/boundary-alert";
import { ConfirmationDialog } from "~/components/confirmation-dialog";
import { NewVoucherButton } from "~/components/new-voucher-button";
import { useEditVoucher } from "~/hooks/use-edit-voucher";
import { useAddVoucher } from "~/hooks/use-add-voucher";
import { toast } from "sonner";

type ProvisioningStatus = "not_required" | "pending" | "provisioned" | "failed";

type ConvexVoucher = {
  _id: Id<"vouchers">;
  _creationTime: number;
  userId: string;
  businessId: Id<"businesses">;
  title: string;
  description: string;
  provider: "square" | "manual";
  provisioning: { status: ProvisioningStatus };
  voucherTerms?: string;
  voucherValidFrom: number;
  voucherValidTo: number;
  deletedAt?: number;
};

const ProvisioningBadge = ({ voucher }: { voucher: ConvexVoucher }) => {
  if (voucher.provider !== "square") return null;

  const { status } = voucher.provisioning;

  if (status === "provisioned") {
    return (
      <Badge variant="outline" className="text-xs border-black text-black">
        Live
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="text-xs">
        Publishing
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="text-xs">
        Needs attention
      </Badge>
    );
  }
  return null;
};


const VoucherActionsDropdown = ({ voucher }: { voucher: ConvexVoucher }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setEditVoucherId } = useEditVoucher();
  const { setIsOpen: setIsModalOpen } = useAddVoucher();
  const deleteVoucher = useMutation(api.functions.vouchers.deleteVoucher);

  const handleEdit = () => {
    setEditVoucherId(voucher._id);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteVoucher({ voucherId: voucher._id as Id<"vouchers"> });
      toast.success("Voucher deleted successfully");
      setShowDeleteDialog(false);
    } catch {
      toast.error("Failed to delete voucher");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleEdit}>
            <Edit className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Voucher"
        description={`Are you sure you want to delete "${voucher.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
};

export const VoucherTable = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const businessId = business?._id as Id<"businesses"> | undefined;

  const vouchers = useQuery(
    api.functions.vouchers.getVouchersByBusiness,
    businessId ? { businessId } : "skip"
  );

  if (business === null) {
    return <BoundaryAlert title="Error" description="Error loading vouchers." />;
  }

  const isLoading = business === undefined || vouchers === undefined;

  if (isLoading) {
    return <VoucherTableLoading />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <CardTitle className="text-lg font-semibold leading-none">
              All Vouchers
            </CardTitle>
            <CardDescription>
              View and manage your voucher codes
            </CardDescription>
          </div>
          <NewVoucherButton />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No vouchers found. Create your first voucher to get started.
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((voucher) => {
                const status = voucherStatus(voucher, Date.now());
                const statusLabel: Record<VoucherStatus, string> = {
                  active: "Active",
                  expiring: "Expiring",
                  expired: "Expired",
                  scheduled: `Active from ${new Date(voucher.voucherValidFrom).toLocaleDateString()}`,
                };
                return (
                  <TableRow key={voucher._id}>
                    <TableCell className="text-sm font-medium">
                      {voucher.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {voucher.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(voucher.voucherValidTo).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === "active" || status === "expiring"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {statusLabel[status]}
                        </Badge>
                        <ProvisioningBadge voucher={voucher as ConvexVoucher} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <VoucherActionsDropdown
                        voucher={voucher as ConvexVoucher}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const VoucherTableLoading = () => {
  return (
    <Card>
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
        <Table>
          <TableHeader>
            <TableRow>
              {["Title", "Description", "Valid Until", "Status", "Actions"].map(
                (h) => (
                  <TableHead key={h}>{h}</TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
