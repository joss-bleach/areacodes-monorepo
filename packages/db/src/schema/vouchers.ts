import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "./helpers";
import { businesses } from "./businesses";

export const voucherFormatEnum = pgEnum("voucher_type", [
  "barcode",
  "qr_code",
  "generated_text",
]);
export const voucherStatusEnum = pgEnum("voucher_status", [
  "active",
  "inactive",
  "expired",
]);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").references(() => businesses.id),
    clerkUserId: text("clerk_user_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    voucherFormat: voucherFormatEnum("voucher_format").notNull(),
    voucherGenCode: text("voucher_gen_code"),
    voucherTerms: text("voucher_terms"),
    voucherStatus: voucherStatusEnum("voucher_status")
      .notNull()
      .default("active"),
    voucherValidFrom: timestamp("voucher_valid_from").notNull(),
    voucherValidTo: timestamp("voucher_valid_to").notNull(),
    ...timestamps,
  },
  (table) => [
    // Everyone can view vouchers
    pgPolicy("vouchers_select_policy", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    // Only authenticated users can create vouchers
    pgPolicy("vouchers_insert_policy", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.jwt() ->> 'sub' IS NOT NULL`,
    }),
    // Only authenticated users who created the voucher can update
    pgPolicy("vouchers_update_policy", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.jwt() ->> 'sub' = clerk_user_id`,
    }),
    // Only authenticated users who created the voucher can delete
    pgPolicy("vouchers_delete_policy", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.jwt() ->> 'sub' = clerk_user_id`,
    }),
  ]
);
