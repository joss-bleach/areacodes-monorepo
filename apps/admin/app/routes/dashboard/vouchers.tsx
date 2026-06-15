import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { voucherFormatLabel } from "@areacodes/domain";
import type { Id } from "@repo/convex";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  Button,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui";
import { AdminNavbar } from "~/components/admin-navbar";
import { RequireAdmin } from "~/components/require-admin";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/vouchers")({
  component: VouchersPage,
});

function VouchersPage() {
  return (
    <RequireAdmin>
      <AdminNavbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Vouchers</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all voucher codes
          </p>
        </div>
        <VouchersList />
      </main>
    </RequireAdmin>
  );
}

function VouchersList() {
  const { isAuthenticated } = useConvexAuth();
  const vouchers = useQuery(api.functions.admin.getAllVouchers, isAuthenticated ? {} : "skip");
  const removeVoucher = useMutation(api.functions.admin.removeVoucher);
  const [removeTarget, setRemoveTarget] = useState<{
    id: Id<"vouchers">;
    title: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await removeVoucher({ voucherId: removeTarget.id });
      toast.success(`Voucher "${removeTarget.title}" has been removed`);
      setRemoveTarget(null);
    } catch {
      toast.error("Failed to remove voucher");
    } finally {
      setIsRemoving(false);
    }
  };

  if (vouchers === undefined) {
    return <VouchersListLoading />;
  }

  return (
    <>
      <Card className="rounded-none border-none">
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none">All Vouchers</h2>
          <CardDescription>
            {vouchers.filter((v) => v.deletedAt === undefined).length} active
            vouchers
          </CardDescription>
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
                    Business
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
                {vouchers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 px-4 text-center text-sm text-muted-foreground"
                    >
                      No vouchers found.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((voucher) => (
                    <tr
                      key={voucher._id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4 text-sm font-medium">
                        {voucher.title}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {voucher.business?.name ?? "—"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {voucherFormatLabel(voucher.voucherFormat)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {new Date(voucher.voucherValidTo).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            voucher.deletedAt !== undefined
                              ? "border-red-500/50 text-red-700 dark:text-red-400"
                              : "border-green-500/50 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {voucher.deletedAt !== undefined ? "Removed" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {voucher.deletedAt === undefined && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setRemoveTarget({
                                id: voucher._id as Id<"vouchers">,
                                title: voucher.title,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Voucher</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{removeTarget?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={isRemoving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={isRemoving}
              className="w-full sm:w-auto"
            >
              {isRemoving ? "Removing..." : "Remove Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const VouchersListLoading = () => (
  <Card className="rounded-none border-none">
    <CardHeader>
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-4 border-b border-border"
        >
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </CardContent>
  </Card>
);
