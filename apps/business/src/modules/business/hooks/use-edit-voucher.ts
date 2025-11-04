import { useQueryState, parseAsString } from "nuqs";

export const useEditVoucher = () => {
  const [editVoucherId, setEditVoucherId] = useQueryState(
    "edit-voucher",
    parseAsString.withDefault(null)
  );

  return {
    editVoucherId,
    setEditVoucherId: (id: string | null) => setEditVoucherId(id),
  };
};

