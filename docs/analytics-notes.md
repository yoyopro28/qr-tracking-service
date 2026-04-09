# Analytics Notes

## Current MVP dashboard

The internal analytics page lives at `/analytics` and shows:

- total scans
- campaign count
- generated flyer count
- activated flyer count
- scans per campaign
- top flyers by scan count
- top locations by scan count
- recent scan events

## Attribution model used here

- Scan events are attributed to the flyer directly.
- Location attribution uses the `locationId` captured on the `ScanEvent`.
- That `locationId` comes from the latest flyer activation available at scan time.

## Deliberate limits

- no charts yet
- no time-series breakdown yet
- no unique-scan calculation yet
- no campaign filtering UI yet
- no advanced attribution logic yet

## Why this is enough for MVP

This dashboard is intentionally simple, but it already answers the core product questions:

- Are scans being recorded?
- Which campaign is getting traffic?
- Which flyer is being scanned?
- Which location performs best?
