import { TRPCReactProvider } from "@/trpc/client";
import { ClerkProvider } from "@clerk/nextjs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster as ToastProvider } from "@/components/ui/sonner";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <TRPCReactProvider>
        <NuqsAdapter>
          <ToastProvider />
          {children}
        </NuqsAdapter>
      </TRPCReactProvider>
    </ClerkProvider>
  );
};
