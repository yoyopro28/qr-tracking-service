# Implementation Plan

## Product Goal

Build a web-based service that turns offline flyers into measurable marketing assets. The product should let an admin upload an existing PDF flyer, embed a unique QR code per flyer instance, generate print-ready output, activate each flyer after physical placement, track public scans, attribute those scans to flyer and location, and review basic campaign performance without requiring technical expertise.

## MVP Scope

Included in the MVP:
- authenticated admin access with an automatically created personal workspace
- workspace-scoped campaigns with create, list, view, and edit flows
- PDF template upload and template metadata storage
- one QR placement definition per template using numeric coordinates
- generation of multiple unique flyers with shortcode, tracking URL, and persisted flyer records
- print-ready PDF output for generated flyers
- explicit admin activation after physical placement
- location selection or creation during activation
- public redirect route for scans
- scan event logging
- basic dashboard metrics for scans by campaign, flyer, and location

Out of scope for MVP:
- billing and subscriptions
- multi-seat team management UI
- complex role and permission systems
- native mobile apps
- advanced analytics and attribution modeling
- GIS and advanced map views
- automated anti-fraud systems
- complex PDF layout or imposition engines

## Core Entities

- `User`: authenticated account that owns or belongs to a workspace.
- `Workspace`: tenant boundary for all business data.
- `WorkspaceMember`: link between a user and a workspace, with room for future roles.
- `Campaign`: marketing campaign with destination URL and high-level status.
- `Template`: uploaded PDF template plus QR placement configuration.
- `Flyer`: unique printed flyer instance identified by a stable shortcode.
- `Location`: real-world place where a flyer is posted.
- `Activation`: explicit admin event that assigns a flyer to a location.
- `ScanEvent`: public QR scan record used for attribution and analytics.

Important modeling guidance:
- all business data is workspace-owned
- flyer identity is stable through a unique shortcode
- current state lives on `Flyer`, while history is preserved through `Activation` and `ScanEvent`
- scan attribution should resolve to flyer and, when available, the active location

## Recommended Implementation Order

1. **Foundation**
   Set up the project scaffold, admin UI base, database, Prisma, and the core schema for all entities.
2. **Access and Tenancy**
   Add authentication, automatic personal workspace creation, and workspace-scoped access protection.
3. **Campaigns and Templates**
   Implement campaign CRUD, storage abstraction, PDF upload, template metadata, and QR placement persistence plus admin UI.
4. **Flyer Generation**
   Implement shortcode generation, flyer record creation, QR code generation, PDF embedding, export flows, and flyer list/detail views.
5. **Activation and Tracking**
   Implement activation rules, location create/select flows, the admin activation flow, the public redirect endpoint, and scan event logging.
6. **Analytics and Hardening**
   Add dashboard KPIs, scans by location, time-based reporting, error handling, logging and monitoring, seed data, end-to-end manual test documentation, and cleanup.

This sequence follows the repository's existing build order and the task progression defined in `CODEX_TASKS.md`.

## Source Notes

This document is a concise synthesis of the current repository specs:
- `PROJECT_OVERVIEW.md`
- `MVP_SPEC.md`
- `DATA_MODEL.md`
- `USER_FLOWS.md`
- `CODEX_TASKS.md`
