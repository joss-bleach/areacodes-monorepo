import { useQueryState, parseAsBoolean } from "nuqs";

export const useAddVoucher = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "add-voucher",
    parseAsBoolean.withDefault(false)
  );

  return {
    isOpen,
    setIsOpen,
  };
};
