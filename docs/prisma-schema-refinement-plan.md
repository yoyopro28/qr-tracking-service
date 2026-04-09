# Prisma Schema Refinement Plan

## Purpose

This plan turns the findings from [docs/prisma-schema-review.md](/home/joemartens/code/qr-tracking-service/docs/prisma-schema-review.md) into a minimal schema refinement direction for the MVP.

The plan is intentionally narrow:

- keep the schema simple
- avoid premature flexibility
- preserve the current workspace-based, event-oriented architecture
- reduce the highest-value modeling risks first

This document does not apply schema changes yet. It proposes the smallest next refinement set that improves correctness without turning the MVP into a heavy redesign.

## Guiding Principle

For the MVP, prefer:

- fewer tables
- fewer state variants
- fewer derived values stored as first-class columns
- stronger integrity around workspace and attribution boundaries

In short: simplify where values are redundant, and strengthen where wrong joins would corrupt business meaning.

## Recommended Refinement Order

1. Tighten ownership consistency first.
2. Clarify and minimally enforce activation semantics.
3. Remove or avoid storing values that can be safely derived.
4. Keep optional lifecycle detail out of the MVP unless it has a concrete user-facing use.

This order matches the current risk profile: cross-workspace or cross-campaign mistakes are more dangerous than a slightly incomplete lifecycle model.

## 1. Ownership Consistency Risks

### Current problem

The current schema correctly carries `workspaceId` through business models, but several relations can drift because the database does not enforce that parent-child references belong to the same ownership chain.

High-risk examples from the current schema:

- `Template.workspaceId` may not match `Campaign.workspaceId`
- `Flyer.workspaceId`, `Flyer.campaignId`, and `Flyer.templateId` may not describe the same campaign/workspace chain
- `Activation.workspaceId`, `flyerId`, and `locationId` may point to records from different workspaces
- `ScanEvent.workspaceId`, `flyerId`, `campaignId`, and `locationId` may drift apart

### MVP refinement goal

Reduce the chance of invalid cross-workspace or cross-campaign data without introducing a new abstraction layer.

### Minimal plan

- Keep `workspaceId` on the core business tables.
- Keep `campaignId` on `Flyer` and `ScanEvent` for MVP analytics simplicity.
- Add schema-level ownership consistency only where it protects the highest-risk write paths.
- Do not introduce new ownership tables, polymorphic references, or generic resource models.

### Recommended implementation direction

Use composite uniqueness and composite foreign keys to enforce the main ownership chains already implied by the schema.

Priority enforcement targets:

- `Campaign`: add a composite unique key on `(id, workspaceId)`
- `Template`: reference campaign through `(campaignId, workspaceId)` compatibility
- `Flyer`: enforce compatibility with both its campaign and template ownership chain
- `Activation`: enforce compatibility between activation, flyer, and location within one workspace
- `ScanEvent`: enforce compatibility between scan event, flyer, campaign, and optional location within one workspace

### MVP recommendation

Apply ownership enforcement only to the existing tables and columns. Do not reduce denormalization yet. The goal is safer current modeling, not a new model.

### Why this is minimal

- it preserves the current architecture direction
- it does not change the domain concepts
- it addresses the biggest correctness risk first
- it avoids building complex app-layer validation rules as the only line of defense

## 2. Activation Semantics for MVP

### Current problem

The MVP docs imply one meaningful current activation per flyer, but the schema allows unlimited activation records with no explicit rule for what "current" means.

That ambiguity creates two risks:

- repeated activations may create inconsistent attribution
- application code must invent the current-location rule everywhere it reads data

### MVP refinement goal

Keep event history, but make the MVP rule explicit and simple.

### Minimal plan

- Treat `Activation` as an append-only event table.
- For MVP, define the current activation as the most recent activation for a flyer.
- Keep `Flyer.activatedAt` as a convenience state field.
- Do not add a full reassignment lifecycle model yet.
- Do not add "activation ended", "superseded", or "isCurrent" fields unless later usage proves they are necessary.

### Recommended enforcement level

For V1, prefer an application rule over a more complex schema pattern:

- activation is only allowed when a flyer is not yet activated
- if the team wants re-activation later, that should become an explicit post-MVP design decision

That means the practical MVP behavior should be:

- one flyer is activated once
- one activation record is expected per flyer in normal operation
- latest-activation logic exists only as a fallback, not as a feature

### Schema direction

Two minimal options exist:

- simplest MVP option: enforce one activation per flyer
- slightly more flexible option: allow many activations, but treat additional ones as unsupported in V1

### MVP recommendation

Choose the simplest MVP option: enforce one activation per flyer.

Why:

- it matches the actual product flow
- it reduces ambiguity in attribution
- it keeps queries simple
- it avoids inventing a partial reassignment model

If re-assignment becomes necessary later, that should be introduced as a deliberate versioned change rather than silently supported by an ambiguous event table.

## 3. Whether `trackingUrl` Should Be Stored or Derived

### Current problem

`trackingUrl` is currently stored on `Flyer`, even though the stable identifier is the shortcode and the tracking route format is an application concern.

Stored URLs can become stale if:

- the base URL changes
- the route shape changes
- environments differ between local, staging, and production

### MVP refinement goal

Keep the flyer identity stable, but avoid storing redundant values unless they carry durable business meaning.

### Minimal plan

- Treat `shortcode` as the durable identifier.
- Derive the tracking URL in application code from `shortcode` and environment/app config.
- Do not store `trackingUrl` unless there is a concrete requirement to preserve the exact original generated URL string.

### MVP recommendation

`trackingUrl` should be derived, not stored.

Why:

- the docs make `shortcode` the stable identity
- deriving the URL keeps the schema smaller
- it prevents stale data
- it keeps environment-specific routing concerns out of the database

## 4. Whether `generatedPdfStorageKey` Should Remain

### Current problem

The docs intentionally leave output shape open for MVP:

- one PDF per flyer
- one combined batch PDF
- whichever is easier

A `generatedPdfStorageKey` on every flyer assumes per-flyer output as the main persistence model.

### MVP refinement goal

Avoid locking the schema to an export strategy before the product actually depends on it.

### Minimal plan

- Keep support for generated output references only if the MVP implementation truly needs to retrieve a per-flyer artifact later.
- If the first shipping flow is batch-oriented, do not model per-flyer output storage on `Flyer`.
- Do not add a separate export/batch table yet unless that workflow is already required.

### MVP recommendation

Remove `generatedPdfStorageKey` from the MVP schema unless the implementation is definitely storing one PDF per flyer and needs to retrieve it individually later.

Why:

- the export format is still intentionally open
- this field is not central to attribution, activation, or analytics
- it risks encoding an implementation detail too early

If the team later needs artifact tracking, it can be added with clearer semantics once the actual output workflow is settled.

## 5. Whether `PRINTED` Should Remain in `FlyerStatus` for V1

### Current problem

The docs mention `printed`, but they also say it may be skipped if unnecessary in V1. The current schema includes `PRINTED` without any supporting timestamp or separate print event.

That creates an awkward middle state:

- the status exists
- but it is not strongly modeled
- and it does not seem critical to the MVP's value

### MVP refinement goal

Keep the flyer lifecycle focused on states that materially affect behavior in V1.

### Minimal plan

- keep `GENERATED`
- keep `ACTIVATED`
- keep `RETIRED` if the team expects manual deactivation/end-of-life handling
- remove `PRINTED` from V1 if no concrete workflow depends on it

### MVP recommendation

Remove `PRINTED` from `FlyerStatus` for V1.

Why:

- the docs explicitly allow skipping it
- it has no clear downstream behavior in the current MVP
- it simplifies the state model
- it avoids needing `printedAt` or additional workflow logic

If later the team wants to track export vs physical print vs placement, that should be modeled more intentionally than a lone enum value.

## Consolidated Minimal Schema Direction

If the team wants the smallest useful refinement pass, the schema direction should be:

- strengthen ownership integrity using existing columns and composite constraints
- simplify activation semantics to one activation per flyer in MVP
- derive `trackingUrl` from `shortcode`
- drop `generatedPdfStorageKey` unless per-flyer file retrieval is a confirmed requirement
- drop `PRINTED` from the MVP lifecycle

This keeps the architecture intact:

- workspace ownership remains first-class
- events still exist for activation and scan history
- campaign and scan denormalization can stay for simple analytics

At the same time, it removes schema detail that is currently more speculative than useful.

## Recommended Decision Set for the MVP

- Enforce ownership consistency on the existing schema using composite constraints and foreign keys rather than introducing new models.
- Treat activation as a one-time MVP action and enforce one activation per flyer.
- Derive `trackingUrl` from `shortcode` and app configuration instead of storing it.
- Remove `generatedPdfStorageKey` unless per-flyer stored outputs are a confirmed shipped requirement.
- Remove `PRINTED` from `FlyerStatus` for V1 and keep the lifecycle focused on `GENERATED`, `ACTIVATED`, and `RETIRED`.
