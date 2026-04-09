# Prisma Schema Review

## Scope

This review compares the current Prisma schema in `prisma/schema.prisma` against the repository documentation, primarily:

- `DATA_MODEL.md`
- `MVP_SPEC.md`
- `PROJECT_OVERVIEW.md`
- `docs/implementation-plan.md`
- selected supporting notes in `USER_FLOWS.md` and `CODEX_TASKS.md`

The goal here is to assess:

- whether entities, relations, enums, and ownership boundaries match the documented MVP
- where the schema is too complex for the MVP
- where the schema is missing important fields or constraints
- where the implementation is at risk of drifting from the architecture notes

No schema changes are proposed in this document yet.

## Executive Summary

The current schema is directionally aligned with the documented MVP. It includes the nine core entities repeatedly described in the repo docs: `User`, `Workspace`, `WorkspaceMember`, `Campaign`, `Template`, `Flyer`, `Location`, `Activation`, and `ScanEvent` (`prisma/schema.prisma:32-220`, `DATA_MODEL.md:17-207`, `docs/implementation-plan.md:32-48`).

The biggest issue is not missing entities. The biggest issue is integrity across ownership boundaries. The schema duplicates `workspaceId` and other parent references across several models, which matches the docs' workspace-scoped architecture, but the database does not currently enforce that those references stay consistent with one another. That creates a real risk of cross-workspace or cross-campaign mismatches.

The second main issue is that the schema already bakes in a few implementation choices that are only optional or loosely specified in the MVP, such as persisted `trackingUrl`, a dedicated `PRINTED` flyer state, and per-flyer generated PDF storage. None of these are fatal, but some are probably ahead of the MVP's actual needs.

## What Matches Well

### Entity coverage

The schema matches the documented MVP entity set well:

- `User`, `Workspace`, and `WorkspaceMember` support the auth and tenancy layer described in `MVP_SPEC.md:24-39` and `PROJECT_OVERVIEW.md:46-54`.
- `Campaign`, `Template`, `Flyer`, `Location`, `Activation`, and `ScanEvent` match the core product flow in `MVP_SPEC.md:41-168`, `PROJECT_OVERVIEW.md:55-102`, and `DATA_MODEL.md:62-206`.

This is a strong point: the schema is modeling the right nouns.

### Event-based model

The documentation explicitly wants current state plus historical events (`DATA_MODEL.md:253-259`, `docs/implementation-plan.md:44-48`, `PROJECT_OVERVIEW.md:109-110`). The schema follows that:

- current flyer state lives on `Flyer.status`, `Flyer.activatedAt`, and `Flyer.retiredAt` (`prisma/schema.prisma:133-137`)
- historical actions are represented by `Activation` and `ScanEvent` (`prisma/schema.prisma:176-219`)

That is consistent with the architecture notes.

### Workspace ownership as a first-class concern

The docs repeatedly say business objects should belong to a workspace (`DATA_MODEL.md:11-15`, `DATA_MODEL.md:44-46`, `PROJECT_OVERVIEW.md:123-124`, `docs/implementation-plan.md:44-46`). The schema reflects that by putting `workspaceId` on:

- `Campaign`
- `Template`
- `Flyer`
- `Location`
- `Activation`
- `ScanEvent`

This aligns with the intended tenancy model and will make authorization filtering simpler.

### Enum choices mostly match MVP language

The current enums line up with the docs:

- `CampaignStatus`: `DRAFT`, `ACTIVE`, `ARCHIVED` matches `DATA_MODEL.md:75-78`
- `FlyerStatus`: `GENERATED`, `PRINTED`, `ACTIVATED`, `RETIRED` matches `DATA_MODEL.md:133-137` and `MVP_SPEC.md:105-114`
- `ActivationSource`: `ADMIN_SCAN`, `MANUAL_ADMIN_ENTRY` matches `DATA_MODEL.md:178-180`

## Key Modeling Risks

### 1. Ownership consistency is not enforced across related records

This is the most important modeling risk.

The docs want clear workspace-based ownership and campaign organization (`DATA_MODEL.md:11-15`, `DATA_MODEL.md:80-84`, `docs/implementation-plan.md:44-48`). The schema stores the necessary foreign keys, but it does not enforce that they agree with one another:

- `Template` has both `workspaceId` and `campaignId`, but nothing guarantees that the referenced campaign belongs to the same workspace (`prisma/schema.prisma:97-123`)
- `Flyer` has `workspaceId`, `campaignId`, and `templateId`, but nothing guarantees that the template and campaign belong to the same workspace or even to each other (`prisma/schema.prisma:126-149`)
- `Location` can reference a `campaignId`, but nothing guarantees that the campaign belongs to the same workspace (`prisma/schema.prisma:152-173`)
- `Activation` has `workspaceId`, `flyerId`, and `locationId`, but nothing guarantees that the flyer and location belong to the same workspace (`prisma/schema.prisma:176-193`)
- `ScanEvent` has `workspaceId`, `flyerId`, `campaignId`, and optional `locationId`, but nothing guarantees those all describe the same ownership chain (`prisma/schema.prisma:196-219`)

Why this matters:

- a bug in application code could connect a flyer from workspace A to a location from workspace B
- a scan event could point at a flyer and campaign that do not match
- analytics queries could silently return wrong numbers even though foreign keys all technically pass

This is the main place where the schema currently falls short of the architecture notes.

### 2. The flyer-to-activation relationship is underspecified for the MVP's "current activation" rule

The docs say:

- a flyer may have exactly one current activation in MVP (`DATA_MODEL.md:182-184`)
- current state should coexist with event history (`DATA_MODEL.md:253-259`)
- scan attribution should resolve to the active location when available (`docs/implementation-plan.md:47-48`, `USER_FLOWS.md:168-176`)

The schema allows unlimited `Activation` rows per flyer and does not include any field that marks one as current (`prisma/schema.prisma:143`, `prisma/schema.prisma:176-193`).

This is not necessarily wrong, because the docs also suggest deriving current location from the latest activation for MVP (`DATA_MODEL.md:264-268`). But it does leave a gap:

- the model does not express whether re-activation is allowed
- the model does not protect against duplicate or accidental repeated activations
- "latest activation wins" becomes an application convention rather than an explicit rule

For MVP this may be acceptable, but it is a real semantic ambiguity.

### 3. `ScanEvent` denormalization is useful, but also creates drift risk

The docs support denormalizing `location_id` onto scan events for easier analytics (`DATA_MODEL.md:203-206`). The schema goes further and stores all of:

- `workspaceId`
- `flyerId`
- `campaignId`
- `locationId`

on every scan event (`prisma/schema.prisma:196-219`).

This is probably intended for query simplicity and dashboard performance, but it creates multiple truth sources:

- `campaignId` can drift from `flyer.campaignId`
- `workspaceId` can drift from `flyer.workspaceId`
- `locationId` can drift from the flyer's actual active location at event time if application code is inconsistent

This is acceptable only if the write path is very strict. At the schema level, it is currently trust-based.

### 4. Template-to-campaign coupling may be tighter than the docs require

The docs consistently describe templates as belonging to campaigns in the MVP (`DATA_MODEL.md:91-93`, `MVP_SPEC.md:54-67`, `docs/implementation-plan.md:37-39`), so the current `campaignId` on `Template` is aligned.

Still, `PROJECT_OVERVIEW.md` describes a broader "PDF Template Module" in a way that could later support template reuse (`PROJECT_OVERVIEW.md:64-70`). The current model hard-couples every template to exactly one campaign (`prisma/schema.prisma:98-99`, `prisma/schema.prisma:117-118`).

This is fine for MVP, but it is worth noting as an intentional boundary, not a neutral one.

## Overengineering or Premature Complexity

### 1. `trackingUrl` on `Flyer` may be derived rather than stored

The MVP requires each flyer to have a tracking URL (`MVP_SPEC.md:88-92`), and the schema stores it directly on `Flyer` (`prisma/schema.prisma:131-133`).

Risk:

- if the app base URL or routing scheme changes, persisted URLs can become stale
- the real stable identity in the docs is the shortcode, not the full URL (`DATA_MODEL.md:13-15`, `docs/implementation-plan.md:45-47`)

For MVP, the more stable source of truth appears to be `shortcode`. Persisting `trackingUrl` may be convenient, but it is also redundant unless there is a clear requirement to preserve the exact generated URL string.

### 2. `PRINTED` exists even though the docs treat it as optional

The docs include `printed` in the status list, but explicitly say it may be skipped if unnecessary in V1 (`MVP_SPEC.md:112-114`).

The schema includes:

- enum value `PRINTED` (`prisma/schema.prisma:20-25`)
- but no supporting timestamp such as `printedAt`

This is not harmful, but it is a sign of partial modeling:

- if printed truly matters, the schema is missing the state detail to support it well
- if printed does not matter in MVP, the extra state may create avoidable workflow complexity

### 3. `generatedPdfStorageKey` on every flyer may be ahead of the actual export decision

The MVP docs explicitly leave export shape open: one PDF per flyer or one combined export, whichever is easier (`MVP_SPEC.md:101-103`, `PROJECT_OVERVIEW.md:79-81`, `USER_FLOWS.md:112-117`).

The schema stores `generatedPdfStorageKey` on each `Flyer` (`prisma/schema.prisma:134`), which implies a per-flyer artifact model.

That may be correct, but it pre-commits the data model to one export strategy before the docs have. If the MVP ends up producing combined batch PDFs, this field becomes awkward or misleading.

### 4. `WorkspaceRole` with only `OWNER` is acceptable, but intentionally dormant

This is not a problem. It actually matches the docs' recommendation to leave room for future roles while keeping MVP simple (`DATA_MODEL.md:58-60`, `MVP_SPEC.md:36-39`).

Still, it should be recognized as future-proofing, not an active MVP need.

## Missing Fields or Missing Constraints

### 1. Missing relational integrity constraints for ownership chains

This is more important than any missing scalar field.

The schema likely needs a way, eventually, to enforce combinations such as:

- template workspace matches campaign workspace
- flyer workspace matches campaign workspace and template workspace
- activation workspace matches flyer workspace and location workspace
- scan event workspace and campaign match the flyer being scanned

The docs clearly intend these boundaries, but the schema currently expresses them only indirectly.

### 2. Missing explicit representation of current flyer location

The docs say the user needs to know which flyer is hanging at which location (`PROJECT_OVERVIEW.md:15-22`) and that scan attribution should resolve to the active location when available (`docs/implementation-plan.md:47-48`).

The docs also suggest that for MVP the current location can be derived from the latest activation (`DATA_MODEL.md:264-268`), so this is not a hard mismatch.

Still, the current schema leaves current location fully implicit. That means:

- common reads depend on query logic instead of a direct field
- "latest activation wins" must be implemented consistently everywhere

This is a missing field only if the team wants simpler read paths. It is not strictly required by the docs.

### 3. Missing `printedAt` if `PRINTED` is retained as a meaningful state

If `PRINTED` stays in the enum, the absence of a corresponding timestamp is a gap (`prisma/schema.prisma:20-25`, `prisma/schema.prisma:133-137`).

The docs do not explicitly require `printed_at`, so this is not a mismatch with the written spec. It is a modeling completeness issue.

### 4. Missing uniqueness or guardrails around activation semantics

The MVP docs imply a flyer has one meaningful current activation (`DATA_MODEL.md:182-184`). The current schema has:

- no uniqueness constraint on `Activation.flyerId`
- no field marking a current activation
- no end timestamp or superseded flag

That means the data model itself does not help enforce the MVP rule.

### 5. Missing support for the broader template notes in `PROJECT_OVERVIEW.md`

`PROJECT_OVERVIEW.md` mentions:

- page format
- flyer layout mode
- QR code position(s)

(`PROJECT_OVERVIEW.md:64-70`)

The current schema covers page metadata and a single QR placement (`prisma/schema.prisma:104-114`), but it does not have a field for layout mode or any structure for multiple positions.

For MVP, that is mostly fine because other docs intentionally simplify to one placement definition per template (`MVP_SPEC.md:69-83`, `docs/implementation-plan.md:12-20`, `DATA_MODEL.md:111-113`). Still, the review should note the documentation split.

## Documentation-to-Schema Mismatches or Ambiguities

### 1. The docs disagree on QR placement granularity

There is a small but important doc inconsistency:

- `MVP_SPEC.md:14` says "one QR placement per template page"
- `MVP_SPEC.md:69-83`, `DATA_MODEL.md:111-113`, and `docs/implementation-plan.md:13-14` describe one placement definition per template

The schema implements one placement definition per template (`prisma/schema.prisma:107-114`).

Conclusion:

- the schema is aligned with the more repeated and more detailed version of the MVP docs
- but `MVP_SPEC.md:14` should be treated as inconsistent wording until clarified

### 2. Campaign-scoped locations are allowed, but the docs leave this flexible

The schema allows `Location.campaignId` to be nullable (`prisma/schema.prisma:154-167`).

This is consistent with the docs in spirit:

- campaigns organize locations (`DATA_MODEL.md:80-84`)
- but locations are also workspace-owned (`DATA_MODEL.md:147-159`)
- and the activation flow says a user may select an existing location or create a new one (`MVP_SPEC.md:119-124`)

This is a reasonable compromise. It means locations can be reused within a workspace, but optionally tied to a campaign.

### 3. The schema is stricter than the MVP around template reuse and export shape

Two places where implementation is more committed than the docs:

- templates are always campaign-bound
- flyer outputs look modeled as per-flyer files

These are acceptable MVP choices, but they are product decisions, not just neutral schema translation.

## Entity-by-Entity Review

### User

Assessment: aligned.

Good:

- `email`, `name`, auth identifiers, and timestamps match the docs (`prisma/schema.prisma:33-39`, `DATA_MODEL.md:22-32`)

Watch item:

- `passwordHash` and `externalAuthId` are both optional, so application logic must enforce that at least one auth path is valid

### Workspace

Assessment: aligned.

Good:

- minimal and matches the MVP (`prisma/schema.prisma:46-60`, `DATA_MODEL.md:37-46`)

### WorkspaceMember

Assessment: aligned and appropriately simple.

Good:

- supports future multi-user growth without adding current UI complexity (`prisma/schema.prisma:63-75`, `DATA_MODEL.md:48-60`, `MVP_SPEC.md:36-39`)

### Campaign

Assessment: aligned.

Good:

- required business fields are present (`prisma/schema.prisma:77-94`, `MVP_SPEC.md:41-52`)

Minor gap:

- no uniqueness constraint such as workspace-local campaign name, but the docs do not require one

### Template

Assessment: mostly aligned.

Good:

- upload metadata and QR placement fields match the MVP well (`prisma/schema.prisma:96-123`, `MVP_SPEC.md:54-83`)

Risks:

- no validation-friendly grouping around placement completeness; partial null states are possible
- hard-coupled to campaign

### Flyer

Assessment: aligned on purpose, but somewhat overcommitted in detail.

Good:

- identity, attribution, and lifecycle fields match the MVP (`prisma/schema.prisma:126-149`, `DATA_MODEL.md:115-141`)

Risks:

- `trackingUrl` may be redundant
- `generatedPdfStorageKey` presumes a specific export model
- `PRINTED` has no supporting timestamp

### Location

Assessment: aligned.

Good:

- exactly matches the MVP's lightweight location concept (`prisma/schema.prisma:152-173`, `MVP_SPEC.md:131-142`)

Risk:

- optional `campaignId` is flexible, but cross-workspace or cross-campaign inconsistencies are not prevented

### Activation

Assessment: aligned conceptually, underspecified operationally.

Good:

- captures explicit admin action and actor/source metadata (`prisma/schema.prisma:176-193`, `MVP_SPEC.md:116-129`)

Risk:

- current activation semantics are not enforced by the model

### ScanEvent

Assessment: aligned, with deliberate denormalization.

Good:

- supports analytics and redirect logging requirements (`prisma/schema.prisma:196-219`, `MVP_SPEC.md:144-168`, `DATA_MODEL.md:186-206`)

Risks:

- duplicated ownership chain can drift
- `isUniqueEstimate` suggests a uniqueness strategy exists, but the actual rule lives outside the schema

## Bottom Line

The schema is a solid MVP starting point and mostly reflects the repo's documented domain model. The right entities exist, the enum vocabulary is mostly correct, and the architecture direction of workspace ownership plus event history is preserved.

The main weakness is integrity, not coverage. The schema currently relies heavily on application code to keep workspace, campaign, template, flyer, location, activation, and scan references consistent. That is the biggest architectural risk.

The next tier of issues is product-shape drift:

- some fields are more committed than the MVP docs require
- some lifecycle semantics are only partially modeled
- one doc line still conflicts with the implemented QR placement design

## Priority Follow-Up Questions Before Changing the Schema

1. Should the database enforce ownership-chain consistency, or is that intentionally left to the application layer for now?
2. In MVP, is a flyer allowed to be activated more than once, or should one current activation be enforced?
3. Is `trackingUrl` meant to be a persisted historical value, or should it be derived from `shortcode` and app config?
4. Will generated output be stored per flyer, per batch, or both?
5. Should `PRINTED` remain a first-class state in V1, or is it better treated as optional workflow metadata?
6. Should the docs standardize on one placement per template, or is per-page placement still intended?
