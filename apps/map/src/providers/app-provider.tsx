import { TRPCReactProvider } from "@/trpc/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CookieBanner } from "@/components/cookie-banner";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <TRPCReactProvider>
      <NuqsAdapter>
        <CookieBanner />
        {children}
      </NuqsAdapter>
    </TRPCReactProvider>
  );
};
