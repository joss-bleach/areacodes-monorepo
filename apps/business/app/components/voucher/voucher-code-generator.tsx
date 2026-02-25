import { useState } from "react";
import { ClipboardIcon, Check } from "lucide-react";
import { Button, Input } from "@repo/ui";
import { generateVoucherCode } from "~/lib/generate-voucher-code";
import { toast } from "sonner";

interface VoucherCodeGeneratorProps {
  value: string;
  onChange: (code: string) => void;
}

export const VoucherCodeGenerator = ({
  value,
  onChange,
}: VoucherCodeGeneratorProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerate = () => {
    const newCode = generateVoucherCode();
    onChange(newCode);
    setIsCopied(false);
  };

  const handleCopy = async () => {
    if (!value) {
      toast.error("No code to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Code copied to clipboard");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 5000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="generated-code" className="sr-only">
          Generated voucher code
        </label>
        <Input
          id="generated-code"
          readOnly
          type="text"
          placeholder="Generate your voucher…"
          className="font-mono pr-10 text-xs sm:text-sm"
          value={value || ""}
          aria-label="Generated voucher code"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute right-0 top-0 h-full"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          disabled={!value || isCopied}
        >
          {isCopied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ClipboardIcon aria-hidden="true" />
          )}
        </Button>
      </div>
      <Button
        type="button"
        variant="link"
        className="text-xs text-muted-foreground px-0"
        onClick={handleGenerate}
      >
        Generate code
      </Button>
    </div>
  );
};
