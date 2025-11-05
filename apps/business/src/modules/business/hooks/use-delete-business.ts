import { useQueryState, parseAsBoolean } from "nuqs";

export const useDeleteBusiness = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "delete-business",
    parseAsBoolean.withDefault(false)
  );

  return {
    isOpen,
    setIsOpen,
  };
};

