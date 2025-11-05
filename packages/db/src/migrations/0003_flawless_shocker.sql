CREATE INDEX "businesses_clerk_user_id_idx" ON "businesses" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "businesses_industry_id_idx" ON "businesses" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "businesses_location_idx" ON "businesses" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "vouchers_business_id_idx" ON "vouchers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "vouchers_clerk_user_id_idx" ON "vouchers" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "vouchers_business_dates_idx" ON "vouchers" USING btree ("business_id","voucher_valid_from","voucher_valid_to");--> statement-breakpoint
CREATE INDEX "vouchers_valid_to_idx" ON "vouchers" USING btree ("voucher_valid_to");