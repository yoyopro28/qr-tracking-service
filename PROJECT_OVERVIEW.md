# PROJECT_OVERVIEW.md

## Project Name

QR Tracking and PDF Print Service

## Purpose

This project is a web-based service that allows users to upload finished advertising PDFs, place unique QR codes at defined positions, generate print-ready flyer batches, activate printed flyers after physical placement, and track public scans by flyer and location.

The first version is intended for personal use and real-world testing, but the architecture must be prepared from the beginning for multiple users, multiple workspaces, and future paid customer accounts.

## Core Problem

Local businesses, solo self-employed professionals, tutors, coaches, and small service providers often use offline marketing such as flyers or blackboard postings, but they typically do not know:

- which flyer is hanging at which location
- which locations perform well
- how often a specific flyer was scanned
- whether a physical placement was worth the effort

The system makes offline marketing measurable without requiring technical knowledge from the user.

## Product Vision

A simple service that turns normal flyers into trackable offline marketing assets.

## Main User Groups

### Initial Phase
- personal use
- tutoring business
- local services
- solo self-employed professionals

### Later Target Groups
- yoga courses
- coaches
- personal trainers
- small studios
- local events
- local service businesses with offline advertising

## Main Modules

### 1. Authentication and Workspace Layer
The system must support separated data ownership from the beginning.

Core concepts:
- User
- Workspace
- Workspace membership
- Campaign ownership through workspace

### 2. Campaign Management
A campaign bundles:
- name
- destination URL
- uploaded PDF template
- generated flyers
- assigned locations
- tracking results

### 3. PDF Template Module
The user uploads an existing PDF and defines:
- page format
- flyer layout mode
- QR code position(s)
- optional short ID text placement

### 4. QR Code Generation
Each flyer instance receives:
- a unique flyer ID
- a shortcode
- a tracking URL
- a QR code image or embedded QR representation

### 5. Print Generation
The service combines the uploaded template with generated QR codes and exports:
- individual flyer PDFs
- or batch print PDFs

### 6. Activation Module
After physically placing a flyer, the admin activates it by:
- scanning the QR code in a protected admin flow
- selecting or creating a location
- optionally storing metadata such as GPS or notes later

### 7. Tracking and Redirect Module
Public scans go through a redirect endpoint:
- resolve flyer by shortcode
- store scan event
- redirect to campaign target URL

### 8. Analytics Dashboard
The dashboard provides:
- total scans
- unique scans
- scans per flyer
- scans per location
- top-performing location
- time-based scan overview

## Core Product Principles

### Multi-user ready, MVP simple
Even if the first version mainly serves one user, the data model must support future multi-user expansion.

### Event-based data model
Activations and public scans should be stored as explicit events, not only as overwritten current state.

### Clear module boundaries
The architecture should keep these domains separate:
- auth
- workspaces
- campaigns
- templates
- flyers
- activations
- tracking
- analytics

### Workspace-based ownership
Nearly all business objects belong to a workspace, not globally to the application.

## High-Level User Journey

1. User signs up or logs in.
2. User creates a campaign.
3. User uploads a PDF template.
4. User defines QR placement.
5. User chooses how many flyer instances should be generated.
6. The system creates unique flyers and print-ready PDFs.
7. User prints the flyers.
8. User places flyers in the real world.
9. User activates each placed flyer through the protected admin workflow.
10. Public users scan the flyer QR codes.
11. The system stores scan events and redirects the visitor.
12. The user reviews results in the dashboard.

## High-Level Architecture

### Frontend
Used for:
- login
- campaign management
- PDF upload
- QR placement
- activation flow
- dashboard

### Backend/API
Responsible for:
- authentication
- authorization
- campaign data management
- flyer generation
- template processing
- scan logging
- redirect logic
- analytics queries

### Database
Stores:
- users
- workspaces
- memberships
- campaigns
- templates
- flyers
- locations
- activations
- scan events

### File Storage
Stores:
- uploaded source PDFs
- generated print PDFs
- QR assets if needed
- future activation photos if added

## Suggested Technical Direction

Recommended MVP stack:
- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Auth provider such as NextAuth or Clerk
- S3-compatible storage
- QR generation library
- PDF manipulation library such as pdf-lib

## Success Criteria for Version 1

Version 1 is successful if:
- the creator can run a real campaign end to end
- flyers can be generated and printed
- flyers can be activated after placement
- public scans are tracked correctly
- results can be analyzed by flyer and location
