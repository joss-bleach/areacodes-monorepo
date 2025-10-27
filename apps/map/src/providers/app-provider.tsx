import { TRPCReactProvider } from "@/trpc/client";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return <TRPCReactProvider>{children}</TRPCReactProvider>;
};
