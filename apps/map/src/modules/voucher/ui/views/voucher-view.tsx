"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { BoundaryAlert } from "@/components/boundary-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { VoucherNavbar } from "../components/voucher-navbar";

export const VoucherView = () => {
  const params = useParams();
  const voucherId = params.id as string;
  const trpc = useTRPC();
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  const { data: voucher, isLoading, error } = useQuery({
    ...trpc.voucher.getVoucherById.queryOptions({ id: voucherId }),
  });

  // Vercel guidelines: Minimum loading-state duration
  // Add show-delay (150-300ms) and minimum visible time (300-500ms)
  useEffect(() => {
    if (isLoading && !showLoading) {
      // Show delay: wait 200ms before showing loading state
      const showTimer = setTimeout(() => {
        setShowLoading(true);
        setLoadingStartTime(Date.now());
      }, 200);
      return () => clearTimeout(showTimer);
    } else if (!isLoading && showLoading) {
      // Minimum visible time: keep loading visible for at least 400ms
      const minVisibleTime = loadingStartTime ? Math.max(0, 400 - (Date.now() - loadingStartTime)) : 400;
      const hideTimer = setTimeout(() => {
        setShowLoading(false);
        setLoadingStartTime(null);
      }, minVisibleTime);
      return () => clearTimeout(hideTimer);
    } else if (!isLoading) {
      setShowLoading(false);
      setLoadingStartTime(null);
    }
  }, [isLoading, showLoading, loadingStartTime]);

  if (showLoading) {
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

  if (error || !voucher) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="w-[87.5%] md:w-[692px] lg:w-[980px] mx-auto mb-6">
            <Skeleton className="h-6 w-48" />
          </div>
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="relative min-h-screen w-full">
      <VoucherNavbar />
      <main id="main-content" className="w-screen py-6 pt-20">
        <div className="w-[87.5%] md:w-[692px] lg:w-[980px] mx-auto mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Explore</Link>
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
            {voucher.voucher.title}
          </h1>

          <p className="text-sm text-muted-foreground mb-6">
            {voucher.voucher.description}
          </p>

        {/* Voucher Code Display */}
        <div className="mb-6">
          {voucher.voucher.voucherFormat === "qr_code" && voucher.voucher.voucherImgUrl && (
            <div className="bg-muted border border-border p-4 flex justify-center">
              <div className="w-[200px] h-[200px] bg-background relative flex items-center justify-center">
                <Image
                  src={voucher.voucher.voucherImgUrl}
                  alt="QR code"
                  width={200}
                  height={200}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {voucher.voucher.voucherFormat === "barcode" && voucher.voucher.voucherImgUrl && (
            <div className="bg-muted border border-border p-4 flex justify-center">
              <div className="w-full max-w-xs h-12 bg-background relative flex items-center justify-center">
                <Image
                  src={voucher.voucher.voucherImgUrl}
                  alt="Barcode"
                  width={320}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {voucher.voucher.voucherFormat === "generated_text" && voucher.voucher.voucherGenCode && (
            <div className="bg-muted border border-border p-4">
              <div className="w-full min-w-0 overflow-hidden">
                <Input
                  type="text"
                  value={voucher.voucher.voucherGenCode}
                  readOnly
                  className="w-full font-mono text-xs min-w-0"
                  aria-label="Voucher code"
                  style={{ 
                    textOverflow: 'ellipsis', 
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Voucher Terms */}
        {voucher.voucher.voucherTerms && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Terms & Conditions
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {voucher.voucher.voucherTerms}
            </p>
          </div>
        )}

        {/* Validity Dates */}
        <div className="text-sm text-muted-foreground mb-6">
          <p>
            Valid from: {formatDate(voucher.voucher.voucherValidFrom)}
          </p>
          <p>
            Valid until: {formatDate(voucher.voucher.voucherValidTo)}
          </p>
        </div>

        {/* Business Card */}
        <div className="bg-muted/50 border border-border p-4">
          <div className="flex items-start gap-3">
            {voucher.business.logoUrl && (
              <Image
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
              {voucher.industry && (
                <p className="text-sm text-muted-foreground mb-2">
                  {voucher.industry.name}
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
};

