import { TRPCReactProvider } from "@/trpc/client";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster as ToastProvider } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/comp-301";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
      }}
    >
      <TRPCReactProvider>
        <NuqsAdapter>
          <ToastProvider />
          <CookieBanner />
          {children}
        </NuqsAdapter>
      </TRPCReactProvider>
    </ClerkProvider>
  );
};
