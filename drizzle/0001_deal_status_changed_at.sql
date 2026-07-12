ALTER TABLE "deals" ADD COLUMN "status_changed_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
-- Backfill: existing rows approximate stage-entry with their last update
-- (the closest signal we have) instead of all starting at migration time.
UPDATE "deals" SET "status_changed_at" = "updated_at";