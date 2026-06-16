import { authClient } from "./auth-client";

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  return {
    isLoading: isPending,
    isAuthenticated: session !== null,
    fetchAccessToken: async ({
      forceRefreshToken,
    }: {
      forceRefreshToken: boolean;
    }) => {
      if (!session) return null;
      try {
        // @better-auth/expo expoClient plugin includes the stored session token
        // in all authClient requests via SecureStore, so this call is authenticated.
        // The JWT plugin exposes GET /auth/token — path is relative to baseURL+basePath.
        const result = await authClient.$fetch<{ token: string }>("/token", {
          method: "GET",
          cache: forceRefreshToken ? "no-store" : "default",
        });
        return result.data?.token ?? null;
      } catch {
        return null;
      }
    },
  };
}
