import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { type BottomSheetModal } from "@gorhom/bottom-sheet";

type AuthSheetContextType = {
  openAuthSheet: () => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

const AuthSheetContext = createContext<AuthSheetContextType | null>(null);

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);

  function openAuthSheet() {
    sheetRef.current?.present();
  }

  return (
    <AuthSheetContext.Provider value={{ openAuthSheet, sheetRef }}>
      {children}
    </AuthSheetContext.Provider>
  );
}

export function useAuthSheet() {
  const ctx = useContext(AuthSheetContext);
  if (!ctx) throw new Error("useAuthSheet must be inside AuthSheetProvider");
  return ctx;
}
