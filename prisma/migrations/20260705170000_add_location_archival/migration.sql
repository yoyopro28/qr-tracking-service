-- Used locations are archived instead of deleted so scan attribution stays intact.
ALTER TABLE "locations"
ADD COLUMN "archived_at" TIMESTAMP(3);
