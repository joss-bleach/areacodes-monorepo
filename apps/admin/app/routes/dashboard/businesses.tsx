import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
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
import { Flag, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/businesses")({
  component: BusinessesPage,
});

function BusinessesPage() {
  return (
    <RequireAdmin>
      <AdminNavbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Businesses</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all registered businesses
          </p>
        </div>
        <BusinessesList />
      </main>
    </RequireAdmin>
  );
}

function BusinessesList() {
  const { isAuthenticated } = useConvexAuth();
  const businesses = useQuery(api.functions.admin.getAllBusinesses, isAuthenticated ? {} : "skip");
  const flagBusiness = useMutation(api.functions.admin.flagBusiness);
  const reinstateBusiness = useMutation(api.functions.admin.reinstateBusiness);
  const [flagTarget, setFlagTarget] = useState<{
    id: Id<"businesses">;
    name: string;
  } | null>(null);
  const [reinstateTarget, setReinstateTarget] = useState<{
    id: Id<"businesses">;
    name: string;
  } | null>(null);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);

  const handleFlag = async () => {
    if (!flagTarget) return;
    setIsFlagging(true);
    try {
      await flagBusiness({ businessId: flagTarget.id });
      toast.success(`Business "${flagTarget.name}" has been flagged`);
      setFlagTarget(null);
    } catch {
      toast.error("Failed to flag business");
    } finally {
      setIsFlagging(false);
    }
  };

  const handleReinstate = async () => {
    if (!reinstateTarget) return;
    setIsReinstating(true);
    try {
      await reinstateBusiness({ businessId: reinstateTarget.id });
      toast.success(`Business "${reinstateTarget.name}" has been reinstated`);
      setReinstateTarget(null);
    } catch {
      toast.error("Failed to reinstate business");
    } finally {
      setIsReinstating(false);
    }
  };

  if (businesses === undefined) {
    return <BusinessesListLoading />;
  }

  return (
    <>
      <Card className="rounded-none border-none">
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none">
            All Businesses
          </h2>
          <CardDescription>
            {businesses.length} businesses registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Industry
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Address
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
                {businesses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 px-4 text-center text-sm text-muted-foreground"
                    >
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  businesses.map((business) => (
                    <tr
                      key={business._id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {business.logoUrl && (
                            <img
                              src={business.logoUrl}
                              alt={business.name}
                              className="h-8 w-8 object-cover"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {business.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              /{business.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {business.industry?.name ?? "—"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                        {business.address}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            business.flaggedAt !== undefined
                              ? "border-red-500/50 text-red-700 dark:text-red-400"
                              : "border-green-500/50 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {business.flaggedAt !== undefined ? "Flagged" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {business.flaggedAt !== undefined ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-700 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20"
                            onClick={() =>
                              setReinstateTarget({
                                id: business._id as Id<"businesses">,
                                name: business.name,
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reinstate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setFlagTarget({
                                id: business._id as Id<"businesses">,
                                name: business.name,
                              })
                            }
                          >
                            <Flag className="h-4 w-4 mr-1" />
                            Flag
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

      <Dialog open={!!flagTarget} onOpenChange={(open) => !open && setFlagTarget(null)}>
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Flag Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to flag "{flagTarget?.name}"? This will suspend the business and all its vouchers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFlagTarget(null)}
              disabled={isFlagging}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleFlag}
              disabled={isFlagging}
              className="w-full sm:w-auto"
            >
              {isFlagging ? "Flagging..." : "Flag Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reinstateTarget} onOpenChange={(open) => !open && setReinstateTarget(null)}>
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reinstate Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to reinstate "{reinstateTarget?.name}"? This will restore the business and its vouchers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReinstateTarget(null)}
              disabled={isReinstating}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReinstate}
              disabled={isReinstating}
              className="w-full sm:w-auto"
            >
              {isReinstating ? "Reinstating..." : "Reinstate Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const BusinessesListLoading = () => (
  <Card className="rounded-none border-none">
    <CardHeader>
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-border">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </CardContent>
  </Card>
);
