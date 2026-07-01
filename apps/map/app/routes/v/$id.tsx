import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { VoucherNavbar } from "~/components/voucher-navbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Skeleton,
} from "@repo/ui";
import { BoundaryAlert } from "~/components/boundary-alert";
import type { Id } from "@repo/convex";
import { authClient } from "~/lib/auth-client";
import { useState } from "react";

export const Route = createFileRoute("/v/$id")({
  component: VoucherView,
});

function VoucherView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const voucher = useQuery(api.functions.vouchers.getVoucherByIdWithBusiness, {
    voucherId: id as Id<"vouchers">,
  });
  const existingClaim = useQuery(
    api.functions.claims.getClaimForVoucher,
    session ? { voucherId: id as Id<"vouchers"> } : "skip",
  );
  const claimVoucher = useMutation(api.functions.claims.claimVoucher);

  const handleClaim = async () => {
    if (!session) {
      navigate({ to: `/sign-in?redirect=/v/${id}` as "/" });
      return;
    }
    setClaiming(true);
    setClaimError("");
    try {
      await claimVoucher({ voucherId: id as Id<"vouchers"> });
      navigate({ to: "/wallet" });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Failed to claim voucher.");
    } finally {
      setClaiming(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (voucher === undefined) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="w-[87.5%] md:w-[692px] lg:w-[980px] mx-auto mb-6">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="mx-auto max-w-[380px] w-full px-4 min-w-0">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />
            <Skeleton className="h-24 w-24 mb-6" />
          </div>
        </main>
      </div>
    );
  }

  if (voucher === null) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="mx-auto max-w-[380px] w-full px-4 min-w-0">
            <BoundaryAlert
              title="Voucher not found"
              description="The voucher you're looking for doesn't exist or has been removed."
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      <VoucherNavbar />
      <main id="main-content" className="w-screen py-6 pt-20">
        <div className="w-[87.5%] md:w-[692px] lg:w-[980px] mx-auto mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Explore</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Voucher</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-auto max-w-[380px] w-full px-4 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            {voucher.title}
          </h1>

          <p className="text-sm text-muted-foreground mb-6">
            {voucher.description}
          </p>

          {/* Voucher discount display — POS integration coming soon */}

          {/* Voucher Terms */}
          {voucher.voucherTerms && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Terms & Conditions
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {voucher.voucherTerms}
              </p>
            </div>
          )}

          {/* Validity Dates */}
          <div className="text-sm text-muted-foreground mb-6">
            <p>Valid from: {formatDate(voucher.voucherValidFrom)}</p>
            <p>Valid until: {formatDate(voucher.voucherValidTo)}</p>
          </div>

          {/* Claim Button */}
          <div className="mb-6">
            {existingClaim ? (
              <Link
                to="/wallet"
                className="block w-full text-center rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/90"
              >
                View in Wallet
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
                >
                  {claiming ? "Claiming..." : "Claim Voucher"}
                </button>
                {claimError && (
                  <p className="mt-2 text-sm text-red-500">{claimError}</p>
                )}
              </>
            )}
          </div>

          {/* Business Card */}
          <div className="bg-muted/50 border border-border p-4">
            <div className="flex items-start gap-3">
              {voucher.business.logoUrl && (
                <img
                  src={voucher.business.logoUrl}
                  alt={voucher.business.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 shrink-0 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {voucher.business.name}
                </h2>
                {voucher.business.industry && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {voucher.business.industry.name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {voucher.business.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
