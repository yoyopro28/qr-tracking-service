# Redirect Tracking Notes

## Current MVP behavior

- Public QR scans go through `/r/[shortcode]`.
- The route resolves the flyer by shortcode.
- If the flyer exists, the app:
  - logs a `ScanEvent`
  - derives the current location from the latest activation when available
  - redirects to the campaign target URL
- If the shortcode is unknown, the route returns a simple `404` response.

## Stored scan metadata

For the MVP, the route stores a lightweight set of fields:

- `workspaceId`
- `flyerId`
- `campaignId`
- `locationId` when the flyer has been activated
- `ipHash`
- `userAgent`
- `referer`
- `isUniqueEstimate = false`

## Privacy note

- Raw client IP addresses are not stored.
- The route hashes the forwarded IP value when one is available.

## Reliability note

- Redirect success is prioritized over scan logging.
- If scan-event creation fails, the route still redirects to the campaign destination URL.

## Deliberate limits

- no unique-scan strategy yet
- no geolocation enrichment yet
- no bot detection yet
- no public-facing fallback page beyond a simple not-found response
