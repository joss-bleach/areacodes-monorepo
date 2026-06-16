import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { authClient } from "~/lib/auth-client";
import { VoucherNavbar } from "~/components/voucher-navbar";
import { Skeleton } from "@repo/ui";
import type { Id } from "@repo/convex";
import QRCode from "react-qr-code";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
});

function useCountdown(expiresAt: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      return;
    }
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return null;

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

type WalletEntry = {
  claimId: string;
  voucherId: string;
  claimedAt: number;
  state: "claimed" | "revealed" | "expired" | "suspended";
  activeCode: string | null;
  codeExpiresAt: number | null;
  voucher: { _id: string; title: string; voucherValidTo: number } | null;
};

function RevealModal({
  entry,
  onClose,
}: {
  entry: WalletEntry;
  onClose: () => void;
}) {
  const revealVoucher = useMutation(api.functions.claims.revealVoucher);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<{
    voucherCode: string;
    expiresAt: number;
  } | null>(
    entry.state === "revealed" && entry.activeCode
      ? { voucherCode: entry.activeCode, expiresAt: entry.codeExpiresAt! }
      : null,
  );

  const countdown = useCountdown(revealed?.expiresAt ?? null);

  const handleReveal = async () => {
    setRevealing(true);
    setError("");
    try {
      const result = await revealVoucher({ claimId: entry.claimId as Id<"claims"> });
      setRevealed({ voucherCode: result.voucherCode, expiresAt: result.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal code.");
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {entry.voucher?.title ?? "Voucher"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Close
          </button>
        </div>

        {revealed ? (
          <>
            <div className="flex justify-center bg-white p-4">
              <QRCode value={revealed.voucherCode} size={180} />
            </div>
            <div className="bg-muted border border-border p-3 text-center font-mono text-lg tracking-widest select-all">
              {revealed.voucherCode}
            </div>
            {countdown !== null && (
              <p className="text-sm text-muted-foreground text-center">
                Expires in: <span className="font-medium text-foreground">{countdown}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Tap "Use Now" to generate a unique code. The code expires after 2
              hours.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              onClick={handleReveal}
              disabled={revealing}
              className="w-full rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
            >
              {revealing ? "Generating..." : "Use Now"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WalletCard({ entry }: { entry: WalletEntry }) {
  const [showModal, setShowModal] = useState(false);
  const countdown = useCountdown(
    entry.state === "revealed" ? entry.codeExpiresAt : null,
  );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const stateBadge = {
    claimed: "bg-blue-100 text-blue-800",
    revealed: "bg-green-100 text-green-800",
    expired: "bg-muted text-muted-foreground",
    suspended: "bg-orange-100 text-orange-800",
  }[entry.state];

  return (
    <>
      <div className="border border-border p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">
              {entry.voucher?.title ?? "Voucher"}
            </p>
            {entry.voucher && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Valid until {formatDate(entry.voucher.voucherValidTo)}
              </p>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${stateBadge}`}
          >
            {entry.state}
          </span>
        </div>

        {entry.state === "revealed" && countdown !== null && (
          <p className="text-xs text-green-700">
            Code expires in <span className="font-medium">{countdown}</span>
          </p>
        )}

        {entry.state === "suspended" && (
          <p className="text-xs text-orange-700">
            This offer is no longer available.
          </p>
        )}

        {entry.state !== "expired" && entry.state !== "suspended" && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {entry.state === "revealed" ? "Show Code" : "Use Now"}
          </button>
        )}
      </div>

      {showModal && (
        <RevealModal entry={entry} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function WalletPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const wallet = useQuery(
    api.functions.claims.getWallet,
    session ? {} : "skip",
  );

  if (isPending) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="mx-auto max-w-[480px] w-full px-4">
            <Skeleton className="h-8 w-40 mb-6" />
            <Skeleton className="h-24 w-full mb-3" />
            <Skeleton className="h-24 w-full mb-3" />
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="mx-auto max-w-[480px] w-full px-4 flex flex-col items-center gap-6 mt-12">
            <h1 className="text-2xl font-semibold">Your Wallet</h1>
            <p className="text-sm text-muted-foreground text-center">
              Sign in to see your saved vouchers.
            </p>
            <a
              href="/sign-in?redirect=/wallet"
              className="rounded-md bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:bg-foreground/90"
            >
              Sign in
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      <VoucherNavbar />
      <main className="w-screen py-6 pt-20">
        <div className="mx-auto max-w-[480px] w-full px-4">
          <h1 className="text-2xl font-semibold mb-6">Your Wallet</h1>

          {wallet === undefined ? (
            <>
              <Skeleton className="h-24 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-3" />
            </>
          ) : wallet.length === 0 ? (
            <div className="flex flex-col items-center gap-4 mt-12">
              <p className="text-muted-foreground text-sm text-center">
                No vouchers yet. Explore the map to find offers near you.
              </p>
              <Link
                to="/"
                className="rounded-md border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Explore
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {wallet.map((entry) => (
                <WalletCard key={entry.claimId} entry={entry as WalletEntry} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
