ALTER TABLE "templates" ADD COLUMN "qr_placements" JSONB;

UPDATE "templates"
SET "qr_placements" = jsonb_build_array(
  jsonb_build_object(
    'id', 'qr-1',
    'order', 0,
    'pageNumber', "qr_page_number",
    'x', "qr_x",
    'y', "qr_y",
    'width', "qr_width",
    'height', "qr_height"
  )
)
WHERE
  "qr_page_number" IS NOT NULL
  AND "qr_x" IS NOT NULL
  AND "qr_y" IS NOT NULL
  AND "qr_width" IS NOT NULL
  AND "qr_height" IS NOT NULL;
