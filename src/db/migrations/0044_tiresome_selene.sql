ALTER TABLE "salesman_attendance" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "journey_ops" ADD COLUMN "app_role" varchar(50);--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "app_role" varchar(50);--> statement-breakpoint
ALTER TABLE "salesman_leave_applications" ADD COLUMN "app_role" varchar(50);--> statement-breakpoint
CREATE INDEX "idx_users_reports_to_id" ON "users" USING btree ("reports_to_id");