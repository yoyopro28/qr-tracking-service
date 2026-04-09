# Campaign CRUD Notes

## Temporary Assumptions

- Authentication is not implemented yet.
- All campaign data is temporarily scoped to a single auto-created demo workspace.
- The demo workspace is resolved by slug: `demo-workspace`.
- If the demo workspace does not exist, the app creates it automatically on first access.

## Why this approach was chosen

- It keeps campaign CRUD working end to end against PostgreSQL now.
- It preserves the intended workspace-based architecture.
- It is easy to replace later with real auth-based workspace resolution.

## Current MVP feature slice

Implemented in this step:

- campaign list
- campaign creation
- campaign detail view
- campaign editing for name and target URL
- server-side validation for required fields and valid URL format

Deliberately not implemented in this step:

- authentication and authorization
- campaign deletion
- flyer generation
- activation flows
- redirect tracking
- analytics and dashboard

## Data and UI notes

- New campaigns are created with status `DRAFT`.
- The edit flow currently updates only `name` and `destinationUrl`.
- `description` exists in the schema but is not exposed yet because it is outside the requested scope.
- Loading and error states were added for the campaign list and campaign detail routes.

## Replacement path later

When auth is introduced, replace the demo workspace resolver with a real workspace resolver that:

- identifies the authenticated user
- resolves the active workspace from session or membership data
- removes the automatic demo workspace creation behavior
