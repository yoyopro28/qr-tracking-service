# Admin Activation Notes

## Activation flow in this MVP step

- Activation is handled on a dedicated admin page at `/admin/activation`.
- The mobile scanner lives at `/admin/activation/scan`.
- The admin first scans the same printed flyer QR in that scanner or manually enters a flyer shortcode.
- Scanner scans decode the QR content locally and route to the activation page; they do not call `/r/[shortcode]` and therefore do not create `scan_events`.
- After the flyer is resolved, the app immediately asks for location input.
- The admin can:
  - choose an existing location from the same campaign or shared workspace pool
  - or create a new location by name on the spot
- The system then:
  - creates an `Activation` record
  - updates the flyer status to `ACTIVATED`
  - stores `activatedAt`

## Important scope boundaries

- This is an admin-only workflow conceptually, even though auth is still not implemented.
- Public redirect tracking remains separate from admin activation.
- Native camera scans of the printed `/r/[shortcode]` QR still count as public scans. Use the admin scanner for non-tracking activation.

## MVP rules in this implementation

- A flyer can only be activated once.
- Already activated flyers are shown but cannot be activated again from the current UI.
- Location is chosen right after flyer resolution, not pre-bound to the scanner.

## Temporary assumptions

- Activation is still scoped to the temporary demo workspace.
- Newly created locations are campaign-scoped.
- Existing location choices include:
  - campaign-specific locations
  - shared workspace locations with `campaignId = null`
