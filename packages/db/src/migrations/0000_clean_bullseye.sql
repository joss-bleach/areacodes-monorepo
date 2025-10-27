CREATE TYPE "public"."voucher_type" AS ENUM('barcode', 'qr_code', 'generated_text');--> statement-breakpoint
CREATE TYPE "public"."voucher_status" AS ENUM('active', 'inactive', 'expired');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"website_url" text NOT NULL,
	"logo_url" text NOT NULL,
	"industry_id" uuid,
	"address" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"clerk_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"voucher_format" "voucher_type" NOT NULL,
	"voucher_gen_code" text,
	"voucher_terms" text,
	"voucher_status" "voucher_status" DEFAULT 'active' NOT NULL,
	"voucher_valid_from" timestamp NOT NULL,
	"voucher_valid_to" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "vouchers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "industries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "industries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "businesses_select_policy" ON "businesses" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "businesses_insert_policy" ON "businesses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);--> statement-breakpoint
CREATE POLICY "businesses_update_policy" ON "businesses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.jwt() ->> 'sub' = clerk_user_id);--> statement-breakpoint
CREATE POLICY "businesses_delete_policy" ON "businesses" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.jwt() ->> 'sub' = clerk_user_id);--> statement-breakpoint
CREATE POLICY "vouchers_select_policy" ON "vouchers" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "vouchers_insert_policy" ON "vouchers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);--> statement-breakpoint
CREATE POLICY "vouchers_update_policy" ON "vouchers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.jwt() ->> 'sub' = clerk_user_id);--> statement-breakpoint
CREATE POLICY "vouchers_delete_policy" ON "vouchers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.jwt() ->> 'sub' = clerk_user_id);--> statement-breakpoint
CREATE POLICY "industries_select_policy" ON "industries" AS PERMISSIVE FOR SELECT TO public USING (true);