# DATA_MODEL.md

## Purpose

This document defines the initial domain model for the MVP of the QR tracking and PDF print service.

The model is designed to stay simple for version 1 while remaining compatible with future SaaS expansion.

## Design Principles

- all business data belongs to a workspace
- campaigns organize templates, flyers, locations, and results
- activations and scans are stored as explicit records
- flyer identity is stable through a unique shortcode
- current state and event history should coexist where useful

## Core Entities

### 1. User
Represents an authenticated account.

Suggested fields:
- id
- email
- name
- password_hash or external_auth_id
- created_at
- updated_at

Notes:
- auth provider details may vary depending on implementation
- a user will usually receive a default personal workspace

### 2. Workspace
Represents a tenant boundary for all campaign data.

Suggested fields:
- id
- name
- slug
- created_at
- updated_at

Notes:
- all core business objects should reference workspace_id
- a personal workspace can be created automatically at signup

### 3. WorkspaceMember
Links users to workspaces.

Suggested fields:
- id
- workspace_id
- user_id
- role
- created_at

MVP note:
- this table can exist from day one even if only one role is used
- role could initially default to owner

### 4. Campaign
Represents one marketing campaign.

Suggested fields:
- id
- workspace_id
- name
- description
- destination_url
- status
- created_at
- updated_at

Possible status values:
- draft
- active
- archived

Relationships:
- campaign belongs to one workspace
- campaign has many templates
- campaign has many flyers
- campaign has many locations

### 5. Template
Represents an uploaded PDF template and its QR placement config.

Suggested fields:
- id
- workspace_id
- campaign_id
- original_filename
- storage_key
- mime_type
- file_size_bytes
- page_count
- width
- height
- qr_page_number
- qr_x
- qr_y
- qr_width
- qr_height
- short_text_enabled
- short_text_offset_x
- short_text_offset_y
- created_at
- updated_at

Notes:
- if placement becomes more complex later, move QR config into a separate placement table or JSON config
- for MVP, one placement definition per template is enough

### 6. Flyer
Represents one unique printed flyer instance.

Suggested fields:
- id
- workspace_id
- campaign_id
- template_id
- shortcode
- tracking_url
- status
- generated_pdf_storage_key
- generated_at
- activated_at
- retired_at
- created_at
- updated_at

Possible status values:
- generated
- printed
- activated
- retired

Notes:
- shortcode must be unique globally or at least unique enough for redirect resolution
- each flyer is the core unit of attribution

### 7. Location
Represents a real-world placement location.

Suggested fields:
- id
- workspace_id
- campaign_id
- name
- description
- address_line_1
- address_line_2
- postal_code
- city
- country
- notes
- created_at
- updated_at

Notes:
- for MVP, only name may be required
- structured address can remain optional

### 8. Activation
Represents the explicit administrative action that assigns a flyer to a location.

Suggested fields:
- id
- workspace_id
- flyer_id
- location_id
- activated_by_user_id
- source
- notes
- created_at

Possible source values:
- admin_scan
- manual_admin_entry

Notes:
- a flyer may have exactly one current activation in MVP
- later reassignment history can be supported by multiple activation records plus current location tracking

### 9. ScanEvent
Represents a public QR scan.

Suggested fields:
- id
- workspace_id
- flyer_id
- campaign_id
- location_id
- occurred_at
- ip_hash
- user_agent
- referer
- country_code
- is_unique_estimate
- created_at

Notes:
- location_id can be denormalized from the current flyer activation at event time for easier analytics
- store privacy-conscious fields only
- hashing IP is safer than storing raw IP if possible

## Recommended Relationships

- User many-to-many Workspace through WorkspaceMember
- Workspace one-to-many Campaign
- Workspace one-to-many Template
- Workspace one-to-many Flyer
- Workspace one-to-many Location
- Workspace one-to-many Activation
- Workspace one-to-many ScanEvent
- Campaign one-to-many Template
- Campaign one-to-many Flyer
- Campaign one-to-many Location
- Template one-to-many Flyer
- Flyer one-to-many ScanEvent
- Flyer one-to-one or one-to-many Activation depending on history model
- Location one-to-many Activation
- Location one-to-many ScanEvent

## Recommended Constraints

### Uniqueness
- user.email unique
- workspace.slug unique
- flyer.shortcode unique

### Foreign Keys
- every campaign must reference a workspace
- every template must reference workspace and campaign
- every flyer must reference workspace, campaign, and template
- every location must reference workspace and optionally campaign
- every activation must reference workspace, flyer, and location
- every scan event must reference workspace, flyer, campaign, and optionally location

### Important Indexes
- flyer.shortcode
- flyer.campaign_id
- template.campaign_id
- location.campaign_id
- activation.flyer_id
- activation.location_id
- scan_event.flyer_id
- scan_event.campaign_id
- scan_event.location_id
- scan_event.occurred_at

## State vs Event Model

The data model should support both:
- a current flyer state on the Flyer record
- a historical log of important actions through Activation and ScanEvent

This avoids expensive reconstruction for common queries while preserving historical detail.

## Suggested MVP Decisions

### Flyer current location
For MVP, derive a flyer's current location from its latest activation.
Optionally, store `current_location_id` directly on Flyer later if needed for query simplicity.

### One active activation per flyer
In MVP, assume one flyer has at most one meaningful active placement at a time.

### Scan attribution
At scan time, the system should resolve:
- flyer
- campaign
- currently assigned location if available

Then store these references on the scan event.

## Example Prisma-Oriented Shape

This is not final schema code, just a structure guide.

### User
- id: string
- email: string
- name: string?
- createdAt: datetime
- updatedAt: datetime

### Workspace
- id: string
- name: string
- slug: string
- createdAt: datetime
- updatedAt: datetime

### WorkspaceMember
- id: string
- workspaceId: string
- userId: string
- role: enum

### Campaign
- id: string
- workspaceId: string
- name: string
- description: string?
- destinationUrl: string
- status: enum

### Template
- id: string
- workspaceId: string
- campaignId: string
- originalFilename: string
- storageKey: string
- pageCount: int?
- qrPageNumber: int
- qrX: float
- qrY: float
- qrWidth: float
- qrHeight: float

### Flyer
- id: string
- workspaceId: string
- campaignId: string
- templateId: string
- shortcode: string
- trackingUrl: string
- status: enum
- generatedPdfStorageKey: string?

### Location
- id: string
- workspaceId: string
- campaignId: string?
- name: string
- description: string?

### Activation
- id: string
- workspaceId: string
- flyerId: string
- locationId: string
- activatedByUserId: string
- source: enum
- createdAt: datetime

### ScanEvent
- id: string
- workspaceId: string
- flyerId: string
- campaignId: string
- locationId: string?
- occurredAt: datetime
- ipHash: string?
- userAgent: string?

## Future Extensions

The model should later support:
- billing accounts
- API keys
- richer workspace roles
- multiple QR placements per template
- activation photos
- GPS coordinates
- distributor networks
- anti-fraud signals
- experiment variants for A/B testing
