"use client";
import { useState } from "react";
import { ClipboardIcon, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useAddVoucher } from "../../hooks/use-add-voucher";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { generateVoucherCode } from "@/lib/generate-voucher-code";
import { toast } from "sonner";

export const NewVoucherModal = () => {
  const [code, setCode] = useState("");
  const { slug } = useParams();
  const { isOpen, setIsOpen } = useAddVoucher();

  const handleGenerateCode = () => {
    const newCode = generateVoucherCode();
    setCode(newCode);
  };

  const handleCopyCode = async () => {
    if (!code) {
      toast.error("No code to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Voucher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-none border-none border-border">
        <DialogHeader>
          <DialogTitle>Create New Voucher</DialogTitle>
          <DialogDescription>
            Add a new voucher code for your customers to use
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Tabs defaultValue="qr-code">
            <TabsList className="w-full rounded-none">
              <TabsTrigger
                value="qr-code"
                className="rounded-none cursor-pointer"
              >
                QR Code
              </TabsTrigger>
              <TabsTrigger
                value="barcode"
                className="rounded-none cursor-pointer"
              >
                Barcode
              </TabsTrigger>
              <TabsTrigger
                value="generated-text"
                className="rounded-none cursor-pointer"
              >
                Generated Text
              </TabsTrigger>
            </TabsList>
            <TabsContent value="qr-code"></TabsContent>
            <TabsContent value="barcode"></TabsContent>
            <TabsContent value="generated-text">
              <div className="relative">
                <label htmlFor="generated-code" className="sr-only">
                  Generated voucher code
                </label>
                <Input
                  id="generated-code"
                  readOnly
                  type="text"
                  placeholder="Generated Text"
                  className="font-mono"
                  value={code || ""}
                  aria-label="Generated voucher code"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={handleCopyCode}
                  aria-label="Copy code to clipboard"
                  disabled={!code}
                >
                  <ClipboardIcon aria-hidden="true" />
                </Button>
              </div>
              <Button
                variant="link"
                className="text-xs text-muted-foreground px-0"
                onClick={handleGenerateCode}
              >
                Generate code
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button>Create Voucher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
