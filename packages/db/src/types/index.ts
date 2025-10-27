import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { businesses, industries, vouchers } from "../schema";

export type Business = InferSelectModel<typeof businesses>;
export type NewBusiness = InferInsertModel<typeof businesses>;

export type Industry = InferSelectModel<typeof industries>;
export type NewIndustry = InferInsertModel<typeof industries>;

export type Voucher = InferSelectModel<typeof vouchers>;
export type NewVoucher = InferInsertModel<typeof vouchers>;
