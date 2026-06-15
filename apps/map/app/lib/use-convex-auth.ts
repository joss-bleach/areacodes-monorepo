import { authClient } from "./auth-client";

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  return {
    isLoading: isPending,
    isAuthenticated: session !== null && session !== undefined,
    fetchAccessToken: async ({
      forceRefreshToken,
    }: {
      forceRefreshToken: boolean;
    }) => {
      if (!session) return null;
      const apiUrl = import.meta.env.VITE_API_URL as string;
      try {
        const res = await fetch(`${apiUrl}/auth/token`, {
          credentials: "include",
          cache: forceRefreshToken ? "no-store" : "default",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { token?: string };
        return data.token ?? null;
      } catch {
        return null;
      }
    },
  };
}
