import { useQueryState, parseAsString } from "nuqs";

export const useEditVoucher = () => {
  const [editVoucherId, setEditVoucherId] = useQueryState(
    "edit-voucher",
    parseAsString
  );

  return {
    editVoucherId,
    setEditVoucherId: (id: string | null) => setEditVoucherId(id),
  };
};

