# MVP_SPEC.md

## Goal of the MVP

Build the smallest useful version of the QR tracking and PDF print service that allows one real campaign to be created, printed, activated, and measured in production-like usage.

The MVP should be technically structured for future SaaS expansion, but the first release should stay intentionally narrow.

## MVP Outcome

A logged-in user can:
- create a campaign
- upload a flyer PDF template
- define one QR placement per template page
- generate multiple unique flyers
- download print-ready output
- activate a flyer after physical placement
- assign a location to the flyer
- let public scans pass through a redirect endpoint
- view basic tracking results in a dashboard

## In Scope

### 1. Authentication
The user can:
- sign up or log in
- access only their own workspace data

MVP simplification:
- one personal workspace is created automatically for each user
- no advanced team UI yet

### 2. Workspace Ownership
All business objects are linked to a workspace.

MVP simplification:
- one workspace per user
- no role management UI
- no workspace switching UI unless easy to add

### 3. Campaign Creation
A campaign includes:
- name
- optional description
- destination URL
- status

Required actions:
- create campaign
- view campaign list
- view campaign details
- edit basic campaign fields

### 4. Template Upload
The user can upload a PDF template to a campaign.

MVP assumptions:
- PDF only
- initial support for simple templates
- first version may limit template complexity if needed

Required fields:
- original file name
- storage key or file path
- page count
- page width/height metadata if available

### 5. QR Placement
The user can define one QR placement configuration for the template.

MVP simplification:
- support one QR code per flyer
- support one placement definition per template
- use absolute coordinates
- optional short text label below QR

Required config:
- page number
- x
- y
- width
- height
- optional text offset

### 6. Flyer Generation
The system can generate a user-defined number of flyer instances for a campaign.

Each generated flyer must have:
- internal ID
- shortcode
- tracking URL
- status

Required behavior:
- generate N flyers
- create QR code for each flyer
- embed QR into PDF template
- produce print-ready PDF output
- persist generated flyer metadata

MVP simplification:
- start with one output PDF per flyer or one combined export, whichever is easier
- no advanced imposition engine required at first

### 7. Flyer Status Handling
A flyer can move through these states:
- generated
- printed
- activated
- retired

MVP simplification:
- printed may be set automatically on export or skipped if unnecessary
- only activated state has product importance in V1

### 8. Activation Flow
A protected admin flow allows the user to activate a flyer after placing it physically.

Required behavior:
- admin scans flyer QR or opens activation route using shortcode
- system resolves flyer
- user selects existing location or creates a new location
- activation event is stored
- flyer status becomes activated

MVP simplification:
- no GPS required
- no photo upload required
- no fraud checks required

### 9. Location Management
A location represents a physical place where a flyer is posted.

Required fields:
- name
- optional description
- optional address fields
- optional notes

MVP simplification:
- location can be simple free-text plus optional structured fields
- no map integration required

### 10. Public Redirect and Tracking
Public QR scans must hit a redirect route such as `/r/[shortcode]`.

Required behavior:
- find flyer by shortcode
- store scan event
- optionally derive basic metadata such as timestamp and user-agent
- redirect to the campaign target URL

MVP simplification:
- simple deduplication logic only if easy
- otherwise store all scans and calculate unique estimates later

### 11. Dashboard
The MVP dashboard should show at least:
- total scans
- scans per campaign
- scans per flyer
- scans per location
- top-performing locations
- recent scan events

MVP simplification:
- no advanced charts required
- basic tables and summary cards are sufficient

## Explicitly Out of Scope

These features are not part of MVP version 1:

- billing and subscriptions
- payment plans
- public customer signup journeys beyond basic auth
- multi-seat team management UI
- complex role/permission matrix
- affiliate or distributor systems
- automated anti-fraud systems
- activation photo verification
- native mobile app
- advanced analytics and attribution modeling
- A/B testing for flyer variants
- GIS or advanced map views
- complex PDF layout engines with many placement templates
- automatic first-scan activation
- background job scaling architecture beyond what is necessary for MVP

## Functional Requirements

### Authentication and Authorization
- users must only access their own workspace data
- protected admin routes must require authentication

### Campaigns
- create, list, view, and edit campaigns
- campaign must store destination URL

### Templates
- upload and store PDFs
- save QR placement config

### Flyers
- generate flyers with unique shortcode
- store flyer records persistently
- associate flyer with campaign and template

### Activations
- admin can activate flyer intentionally
- activation must not happen automatically from public traffic
- activation event must be stored

### Tracking
- public scans must always redirect
- scans must be logged even if analytics are basic

### Dashboard
- show basic metrics with acceptable performance for MVP scale

## Non-Functional Requirements

### Simplicity
The first version must optimize for speed of development and real-world testing, not maximum flexibility.

### Extensibility
The data model must not block future support for:
- multiple workspaces
- teams
- billing
- richer analytics
- verification flows

### Reliability
Redirect and scan logging must be stable enough for real campaigns.

### Auditability
Important domain actions such as activation and scans should be stored as separate events where practical.

## Acceptance Criteria for MVP

The MVP is considered complete when the following full flow works:

1. A user logs in.
2. A campaign is created.
3. A PDF template is uploaded.
4. A QR placement is saved.
5. Ten or more unique flyers can be generated.
6. The system outputs print-ready files.
7. A generated flyer can be activated and linked to a location.
8. A public scan logs a scan event and redirects successfully.
9. The dashboard shows the scan attributed to the correct flyer and location.

## Suggested Build Order

1. project setup and auth
2. workspace and campaign data model
3. template upload
4. QR placement persistence
5. flyer generation pipeline
6. activation flow
7. public redirect endpoint
8. dashboard metrics
