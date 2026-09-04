# Template Upload Notes

> Historical note for the former Next.js/Prisma MVP. Do not use this as an
> operational guide for the current Cloudflare/Supabase application.

## Current MVP assumptions

- Template upload is scoped to the same temporary demo workspace used by campaign CRUD.
- Uploaded PDFs are stored on the local filesystem for now under `uploads/templates/...`.
- Template metadata and QR placement config are stored in PostgreSQL through Prisma.
- Width and height metadata are not parsed from the PDF yet, so those schema fields remain unused for now.
- Page count is estimated from PDF contents with a lightweight heuristic suitable for MVP development.

## What this step implements

- upload a PDF template from the campaign detail page
- persist template metadata:
  - original filename
  - storage key
  - mime type
  - file size
  - estimated page count
- persist one QR placement definition per template:
  - page number
  - x
  - y
  - width
  - height
  - optional short text toggle and offsets
- list uploaded templates on the campaign detail page

## Deliberate limits

- no S3 or external object storage abstraction yet
- no PDF preview UI
- no drag-and-drop QR placement editor
- no multi-template workflow beyond repeated uploads
- no generated flyer output or QR embedding yet

## Easy replacement path later

The storage helper is isolated so local filesystem storage can later be replaced by:

- S3-compatible object storage
- a signed-upload workflow
- richer PDF metadata extraction
