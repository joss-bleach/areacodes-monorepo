import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@repo/ui";
import { PlusIcon } from "lucide-react";

export const NewVoucherButton = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };

  return (
    <Button variant="default" className="w-full md:w-[150px]" asChild>
      <Link to="/b/$slug/vouchers/new" params={{ slug }}>
        <PlusIcon className="w-4 h-4" aria-hidden="true" />
        Add Voucher
      </Link>
    </Button>
  );
};
