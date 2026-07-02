import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Flag, RotateCcw, Plus, CheckCircle, Clock, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/businesses/")({
  component: BusinessesPage,
});

function BusinessesPage() {
  return (
    <main className="px-6 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">Businesses</h1>
          <p className="text-muted-foreground mt-3">
            View and manage all registered businesses
          </p>
        </div>
        <Button asChild className="flex items-center gap-2">
          <Link to="/dashboard/businesses/new">
            <Plus className="h-4 w-4" />
            Add Business
          </Link>
        </Button>
      </div>
      <BusinessesList />
    </main>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy sign-in link"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

const BUSINESS_PORTAL_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(":3002", ":3000").replace("admin.", "business.")
    : "https://business.acbrighton.com";

function BusinessesList() {
  const { isAuthenticated } = useConvexAuth();
  const businesses = useQuery(api.functions.admin.getAllBusinesses, isAuthenticated ? {} : "skip");
  const flagBusiness = useMutation(api.functions.admin.flagBusiness);
  const reinstateBusiness = useMutation(api.functions.admin.reinstateBusiness);
  const resendInvitation = useMutation(api.functions.admin.resendBusinessInvitation);
  const [flagTarget, setFlagTarget] = useState<{ id: Id<"businesses">; name: string } | null>(null);
  const [reinstateTarget, setReinstateTarget] = useState<{ id: Id<"businesses">; name: string } | null>(null);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

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

  const handleResend = async (id: Id<"businesses">, name: string) => {
    setResendingId(id);
    try {
      await resendInvitation({ businessId: id });
      toast.success(`Invitation resent to ${name}`);
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  if (businesses === undefined) {
    return <BusinessesListLoading />;
  }

  return (
    <>
      <Card className="rounded-none border-none">
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none">All Businesses</h2>
          <CardDescription>{businesses.length} businesses registered</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Industry</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Address</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Invitation</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-muted-foreground">
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  businesses.map(business => (
                    <tr key={business._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {business.logoUrl && (
                            <img src={business.logoUrl} alt={business.name} className="h-8 w-8 object-cover" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{business.name}</div>
                            <div className="text-xs text-muted-foreground">/{business.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {business.industry?.name ?? "—"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground max-w-[180px] truncate">
                        {business.address}
                      </td>
                      <td className="py-4 px-4">
                        {business.hasLoggedIn ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Logged in
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              Awaiting login
                            </span>
                            {business.invitationSentAt != null && (
                              <span className="text-xs text-muted-foreground">
                                Sent {new Date(business.invitationSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <button
                                onClick={() => handleResend(business._id as Id<"businesses">, business.name)}
                                disabled={resendingId === business._id}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              >
                                <Send className="h-3 w-3" />
                                {resendingId === business._id ? "Sending…" : "Resend"}
                              </button>
                              <span className="text-muted-foreground/40">·</span>
                              <CopyButton text={`${BUSINESS_PORTAL_URL}/sign-in`} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold ${
                          business.flaggedAt !== undefined
                            ? "border-destructive/50 text-destructive"
                            : "border-foreground/30 text-foreground"
                        }`}>
                          {business.flaggedAt !== undefined ? "Flagged" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {business.flaggedAt !== undefined ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => setReinstateTarget({ id: business._id as Id<"businesses">, name: business.name })}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reinstate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setFlagTarget({ id: business._id as Id<"businesses">, name: business.name })}
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

      <Dialog open={!!flagTarget} onOpenChange={open => !open && setFlagTarget(null)}>
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Flag Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to flag "{flagTarget?.name}"? This will suspend the business and all its vouchers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setFlagTarget(null)} disabled={isFlagging} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleFlag} disabled={isFlagging} className="w-full sm:w-auto">
              {isFlagging ? "Flagging..." : "Flag Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reinstateTarget} onOpenChange={open => !open && setReinstateTarget(null)}>
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reinstate Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to reinstate "{reinstateTarget?.name}"? This will restore the business and its vouchers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReinstateTarget(null)} disabled={isReinstating} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" onClick={handleReinstate} disabled={isReinstating} className="w-full sm:w-auto">
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
