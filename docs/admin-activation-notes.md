# Admin Activation Notes

## Activation flow in this MVP step

- Activation is handled on a dedicated admin page at `/admin/activation`.
- The admin first scans or manually enters a flyer shortcode.
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
- Public redirect tracking is still not implemented and remains separate from admin activation.
- Camera-based QR scanning is not implemented yet; the page currently supports manual shortcode entry and is ready for a scanner enhancement later.

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
