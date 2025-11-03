"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewVoucherButton } from "../components/new-voucher-button";
import { MoreVertical, Eye, Edit, Trash2, ToggleLeft } from "lucide-react";

// Dummy voucher data matching the vouchers schema structure
const dummyVouchers = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    businessId: "550e8400-e29b-41d4-a716-446655440000",
    clerkUserId: "user_2abc123def456",
    title: "Summer Sale 2024",
    description: "Get 20% off on all summer collections",
    voucherFormat: "generated_text" as const,
    voucherGenCode: "SUMMER2024",
    voucherTerms:
      "Valid on purchases over $50. Cannot be combined with other offers.",
    voucherStatus: "active" as const,
    voucherValidFrom: new Date("2024-06-01T00:00:00Z"),
    voucherValidTo: new Date("2024-08-31T23:59:59Z"),
    createdAt: new Date("2024-05-15T10:00:00Z"),
    updatedAt: new Date("2024-05-15T10:00:00Z"),
    deletedAt: null,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    businessId: "550e8400-e29b-41d4-a716-446655440000",
    clerkUserId: "user_2abc123def456",
    title: "Welcome Discount",
    description: "10% discount for new customers",
    voucherFormat: "qr_code" as const,
    voucherGenCode: "WELCOME10",
    voucherTerms: "First-time customers only. One use per customer.",
    voucherStatus: "active" as const,
    voucherValidFrom: new Date("2024-06-01T00:00:00Z"),
    voucherValidTo: new Date("2024-07-15T23:59:59Z"),
    createdAt: new Date("2024-05-20T14:30:00Z"),
    updatedAt: new Date("2024-05-20T14:30:00Z"),
    deletedAt: null,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    businessId: "550e8400-e29b-41d4-a716-446655440000",
    clerkUserId: "user_2abc123def456",
    title: "Flash Sale",
    description: "Limited time 50% off flash sale",
    voucherFormat: "barcode" as const,
    voucherGenCode: "FLASH50",
    voucherTerms: "Limited quantity. Valid for 24 hours only.",
    voucherStatus: "expired" as const,
    voucherValidFrom: new Date("2024-06-01T00:00:00Z"),
    voucherValidTo: new Date("2024-06-30T23:59:59Z"),
    createdAt: new Date("2024-05-25T09:00:00Z"),
    updatedAt: new Date("2024-06-30T23:59:59Z"),
    deletedAt: null,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    businessId: "550e8400-e29b-41d4-a716-446655440000",
    clerkUserId: "user_2abc123def456",
    title: "Free Shipping",
    description: "Free shipping on orders over $50",
    voucherFormat: "generated_text" as const,
    voucherGenCode: "FREESHIP",
    voucherTerms:
      "Applies to standard shipping only. Valid on orders over $50.",
    voucherStatus: "active" as const,
    voucherValidFrom: new Date("2024-06-01T00:00:00Z"),
    voucherValidTo: new Date("2024-09-30T23:59:59Z"),
    createdAt: new Date("2024-05-30T11:15:00Z"),
    updatedAt: new Date("2024-05-30T11:15:00Z"),
    deletedAt: null,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    businessId: "550e8400-e29b-41d4-a716-446655440000",
    clerkUserId: "user_2abc123def456",
    title: "Weekend Special",
    description: "25% off weekend specials",
    voucherFormat: "qr_code" as const,
    voucherGenCode: "WEEKEND25",
    voucherTerms: "Valid Friday-Sunday only. Excludes sale items.",
    voucherStatus: "inactive" as const,
    voucherValidFrom: new Date("2024-07-01T00:00:00Z"),
    voucherValidTo: new Date("2024-08-15T23:59:59Z"),
    createdAt: new Date("2024-06-05T16:45:00Z"),
    updatedAt: new Date("2024-06-10T10:20:00Z"),
    deletedAt: null,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    businessId: "550e8400-e29b-41d4-a716-446655440000",
    clerkUserId: "user_2abc123def456",
    title: "Birthday Bonus",
    description: "15% birthday discount code",
    voucherFormat: "generated_text" as const,
    voucherGenCode: "BIRTHDAY15",
    voucherTerms:
      "Valid during your birthday month. Requires account verification.",
    voucherStatus: "active" as const,
    voucherValidFrom: new Date("2024-06-01T00:00:00Z"),
    voucherValidTo: new Date("2024-12-31T23:59:59Z"),
    createdAt: new Date("2024-05-10T08:00:00Z"),
    updatedAt: new Date("2024-05-10T08:00:00Z"),
    deletedAt: null,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "border-green-500/50 text-green-700 dark:text-green-400";
    case "inactive":
      return "border-gray-500/50 text-gray-700 dark:text-gray-400";
    case "expired":
      return "border-red-500/50 text-red-700 dark:text-red-400";
    default:
      return "";
  }
};

const getFormatLabel = (format: string) => {
  switch (format) {
    case "barcode":
      return "Barcode";
    case "qr_code":
      return "QR Code";
    case "generated_text":
      return "Text";
    default:
      return format;
  }
};

type VoucherActionsDropdownProps = {
  voucher: (typeof dummyVouchers)[0];
};

const VoucherActionsDropdown = ({ voucher }: VoucherActionsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePreview = () => {
    console.log("Preview voucher:", voucher.id);
    setIsOpen(false);
  };

  const handleEdit = () => {
    console.log("Edit voucher:", voucher.id);
    setIsOpen(false);
  };

  const handleChangeStatus = () => {
    console.log("Change status for voucher:", voucher.id);
    setIsOpen(false);
  };

  const handleDelete = () => {
    console.log("Delete voucher:", voucher.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8"
      >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </Button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-none border-none bg-background shadow-lg focus:outline-none">
          <div className="py-1">
            <button
              onClick={handlePreview}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={handleEdit}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent cursor-pointer"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleChangeStatus}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent cursor-pointer"
            >
              <ToggleLeft className="h-4 w-4" />
              Change Status
            </button>
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const VoucherTable = () => {
  return (
    <Card className="rounded-none border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <CardTitle>All Vouchers</CardTitle>
            <CardDescription>
              View and manage your voucher codes
            </CardDescription>
          </div>
          <NewVoucherButton />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Title
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Format
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Valid Until
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {dummyVouchers.map((voucher) => (
                <tr
                  key={voucher.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-4 text-sm font-medium text-foreground">
                    {voucher.title}
                  </td>
                  <td className="py-4 px-4 text-sm text-foreground">
                    {voucher.description}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {getFormatLabel(voucher.voucherFormat)}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {voucher.voucherValidTo.toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${getStatusColor(
                        voucher.voucherStatus
                      )}`}
                    >
                      {voucher.voucherStatus.charAt(0).toUpperCase() +
                        voucher.voucherStatus.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <VoucherActionsDropdown voucher={voucher} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
