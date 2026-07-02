import { cn } from "@repo/ui";

type ChipTone = "success" | "neutral" | "warning";

const TONE_CLASSES: Record<ChipTone, string> = {
  success: "bg-success-bg border-success-border text-success-foreground",
  neutral: "bg-neutral-bg border-border text-neutral-foreground",
  warning: "bg-warning-bg border-warning-border text-warning-foreground",
};

interface MetaChipProps {
  tone: ChipTone;
  size?: "sm" | "default";
  className?: string;
  children: React.ReactNode;
}

/**
 * Monospace metadata tag — the "stamp" motif at its smallest scale.
 * Used for status ("Connected"), constraint ("Manual only") and origin ("Auto")
 * markers throughout the voucher wizard.
 */
export const MetaChip = ({
  tone,
  size = "default",
  className,
  children,
}: MetaChipProps) => (
  <span
    className={cn(
      "inline-block border font-mono font-bold uppercase leading-none tracking-[0.02em]",
      size === "sm"
        ? "px-[5px] py-[3px] text-[8px]"
        : "px-1.5 py-[3px] text-[9px]",
      TONE_CLASSES[tone],
      className,
    )}
  >
    {children}
  </span>
);
