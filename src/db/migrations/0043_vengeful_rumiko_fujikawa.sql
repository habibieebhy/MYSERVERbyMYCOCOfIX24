ALTER TABLE "daily_visit_reports" ADD COLUMN "current_dealer_outstanding_amt" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "verified_dealers" ADD COLUMN "dealer_uuid" varchar(255);--> statement-breakpoint
ALTER TABLE "verified_dealers" ADD CONSTRAINT "verified_dealers_dealer_uuid_dealers_id_fk" FOREIGN KEY ("dealer_uuid") REFERENCES "public"."dealers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dealer_uuid" ON "verified_dealers" USING btree ("dealer_uuid");