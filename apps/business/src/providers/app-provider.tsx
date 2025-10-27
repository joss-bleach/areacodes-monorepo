import { TRPCReactProvider } from "@/trpc/client";
import { ClerkProvider } from "@clerk/nextjs";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <TRPCReactProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </TRPCReactProvider>
    </ClerkProvider>
  );
};
