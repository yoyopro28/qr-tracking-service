-- Store provider-independent coordinates for location-based analytics.
ALTER TABLE "locations"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "locations"
ADD CONSTRAINT "locations_coordinates_pair_check"
CHECK (
  ("latitude" IS NULL AND "longitude" IS NULL)
  OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
),
ADD CONSTRAINT "locations_latitude_range_check"
CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
ADD CONSTRAINT "locations_longitude_range_check"
CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
