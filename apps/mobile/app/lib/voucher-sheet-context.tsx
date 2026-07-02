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
  businessId: string | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  voucherTitle: string;
  voucherDescription: string;
  voucherValidFrom: number;
  voucherValidTo: number;
  activeCode: string | null;
  codeExpiresAt: number | null;
  provider: string | null;
  isRedeemed: boolean;
};

type VoucherSheetMode =
  | { type: "claim"; voucherId: string; distanceMetres?: number }
  | null;

type VoucherSheetContextType = {
  mode: VoucherSheetMode;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  openClaim: (voucherId: string, distanceMetres?: number) => void;
  close: () => void;
  clearMode: () => void;
  revealEntry: RevealEntry | null;
  setRevealEntry: (entry: RevealEntry | null) => void;
};

const VoucherSheetContext = createContext<VoucherSheetContextType | null>(null);

export function VoucherSheetProvider({ children }: { children: ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [mode, setMode] = useState<VoucherSheetMode>(null);
  const [revealEntry, setRevealEntry] = useState<RevealEntry | null>(null);

  function openClaim(voucherId: string, distanceMetres?: number) {
    setMode({ type: "claim", voucherId, distanceMetres });
    sheetRef.current?.present();
  }

  function close() {
    sheetRef.current?.dismiss();
  }

  function clearMode() {
    setMode(null);
  }

  return (
    <VoucherSheetContext.Provider
      value={{
        mode,
        sheetRef,
        openClaim,
        close,
        clearMode,
        revealEntry,
        setRevealEntry,
      }}
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
