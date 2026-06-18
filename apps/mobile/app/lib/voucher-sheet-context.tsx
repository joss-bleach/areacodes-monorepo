import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type BottomSheetModal } from "@gorhom/bottom-sheet";

export type RevealEntry = {
  claimId: string;
  voucherId: string;
  businessName: string | null;
  businessLogoUrl: string | null;
  voucherTitle: string;
  voucherDescription: string;
  voucherValidFrom: number;
  voucherValidTo: number;
  activeCode: string | null;
  codeExpiresAt: number | null;
};

type VoucherSheetMode =
  | { type: "claim"; voucherId: string; distanceMetres?: number }
  | { type: "reveal"; entry: RevealEntry }
  | null;

type VoucherSheetContextType = {
  mode: VoucherSheetMode;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  openClaim: (voucherId: string, distanceMetres?: number) => void;
  openReveal: (entry: RevealEntry) => void;
  close: () => void;
};

const VoucherSheetContext = createContext<VoucherSheetContextType | null>(null);

export function VoucherSheetProvider({ children }: { children: ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [mode, setMode] = useState<VoucherSheetMode>(null);

  function openClaim(voucherId: string, distanceMetres?: number) {
    setMode({ type: "claim", voucherId, distanceMetres });
    sheetRef.current?.present();
  }

  function openReveal(entry: RevealEntry) {
    setMode({ type: "reveal", entry });
    sheetRef.current?.present();
  }

  function close() {
    sheetRef.current?.dismiss();
    setMode(null);
  }

  return (
    <VoucherSheetContext.Provider
      value={{ mode, sheetRef, openClaim, openReveal, close }}
    >
      {children}
    </VoucherSheetContext.Provider>
  );
}

export function useVoucherSheet() {
  const ctx = useContext(VoucherSheetContext);
  if (!ctx)
    throw new Error("useVoucherSheet must be inside VoucherSheetProvider");
  return ctx;
}
