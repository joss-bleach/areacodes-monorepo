import { TRPCReactProvider } from "@/trpc/client";
import { ClerkProvider } from "@clerk/nextjs";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </ClerkProvider>
  );
};
