export type WalletState = "claimed" | "revealed" | "expired" | "suspended";

export function getWalletStateLabel(state: WalletState): string {
  switch (state) {
    case "claimed":
      return "Claimed";
    case "revealed":
      return "Active";
    case "expired":
      return "Expired";
    case "suspended":
      return "Suspended";
  }
}

export function formatCodeExpiry(expiresAt: number, now = Date.now()): string {
  const remaining = expiresAt - now;
  if (remaining <= 0) return "Expired";
  const totalMinutes = Math.floor(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}
