import { useAddVoucher } from "~/hooks/use-add-voucher";
import { Button } from "@repo/ui";
import { PlusIcon } from "lucide-react";

export const NewVoucherButton = () => {
  const { isOpen, setIsOpen } = useAddVoucher();

  return (
    <Button
      variant="default"
      className="w-full md:w-[150px]"
      onClick={() => setIsOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      <PlusIcon className="w-4 h-4" aria-hidden="true" />
      Add Voucher
    </Button>
  );
};
