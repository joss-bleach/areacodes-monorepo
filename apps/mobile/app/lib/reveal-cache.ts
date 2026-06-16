import * as SecureStore from "expo-secure-store";

const CACHE_KEY = "reveal_cache_v1";

export interface CachedReveal {
  claimId: string;
  voucherCode: string;
  expiresAt: number;
  voucherTitle?: string;
  businessName?: string;
}

export function isRevealValid(expiresAt: number, now: number): boolean {
  return expiresAt > now;
}

export function filterValidReveals(
  reveals: CachedReveal[],
  now: number,
): CachedReveal[] {
  return reveals.filter((r) => isRevealValid(r.expiresAt, now));
}

export async function loadRevealCache(now = Date.now()): Promise<CachedReveal[]> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as CachedReveal[];
    return filterValidReveals(all, now);
  } catch {
    return [];
  }
}

export async function upsertRevealCache(entry: CachedReveal): Promise<void> {
  try {
    const now = Date.now();
    const existing = await loadRevealCache(now);
    const without = existing.filter((r) => r.claimId !== entry.claimId);
    await SecureStore.setItemAsync(
      CACHE_KEY,
      JSON.stringify([...without, entry]),
    );
  } catch {
    // Cache writes are best-effort
  }
}
