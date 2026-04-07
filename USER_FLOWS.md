# USER_FLOWS.md

## Purpose

This document defines the primary user and system flows for the MVP.

The focus is on the flows that must work end to end for the first real-world campaign.

## Actors

### Admin User
Authenticated user who creates campaigns, uploads templates, generates flyers, activates flyers, and views analytics.

### Public Scanner
Unauthenticated person who scans a flyer QR code in the real world.

### System
Backend services responsible for generation, tracking, and redirect behavior.

---

## Flow 1: Sign Up / Login

### Goal
Allow the user to access a protected workspace.

### Steps
1. User opens the application.
2. User signs up or logs in.
3. System authenticates the user.
4. If this is a new user, the system creates a default workspace.
5. System redirects the user to the dashboard or campaign list.

### Result
The user is authenticated and has access to their workspace.

---

## Flow 2: Create Campaign

### Goal
Create a campaign with a target URL for flyer traffic.

### Steps
1. User opens the campaign area.
2. User clicks "Create Campaign".
3. User enters:
   - campaign name
   - optional description
   - destination URL
4. User submits the form.
5. System validates input.
6. System creates the campaign inside the user's workspace.
7. System redirects to the campaign detail page.

### Result
A new campaign exists and is ready for template upload.

---

## Flow 3: Upload PDF Template

### Goal
Attach a flyer design PDF to a campaign.

### Steps
1. User opens a campaign detail page.
2. User chooses "Upload Template".
3. User selects a PDF file.
4. System validates file type and upload size.
5. System stores the file in file storage.
6. System extracts or stores file metadata.
7. System creates a template record linked to the campaign.

### Result
The campaign now has a stored template.

---

## Flow 4: Define QR Placement

### Goal
Save the QR position that should be used when generating flyers.

### Steps
1. User opens the uploaded template in the admin UI.
2. User enters or adjusts:
   - page number
   - x position
   - y position
   - width
   - height
   - optional short text setting
3. User saves the placement configuration.
4. System validates the coordinates.
5. System stores the QR placement configuration on the template.

### Result
The template is configured for flyer generation.

### MVP Notes
- first version can use numeric inputs only
- visual drag-and-drop placement can come later

---

## Flow 5: Generate Flyers

### Goal
Generate multiple unique flyer instances from one template.

### Steps
1. User opens the campaign or template view.
2. User clicks "Generate Flyers".
3. User enters the number of flyers to generate.
4. System validates the quantity.
5. For each flyer:
   - create a unique shortcode
   - build tracking URL
   - generate QR code
   - embed QR into the PDF template
   - save flyer metadata
   - save generated file output reference if applicable
6. System returns a generation summary.
7. User downloads the generated output.

### Result
A batch of unique flyers exists and is ready for printing.

### System Considerations
- generation can happen synchronously for small batches
- move to jobs later if needed
- shortcode collisions must be prevented

---

## Flow 6: Print Flyers

### Goal
Take generated flyers into the physical world.

### Steps
1. User downloads the generated flyer files.
2. User prints them externally or at home.
3. User physically places the flyers at selected locations.

### Result
Generated flyers are now distributed physically.

### MVP Notes
- the print action itself does not need deep system support
- optionally mark flyers as printed if useful

---

## Flow 7: Activate Flyer After Placement

### Goal
Explicitly connect a physical flyer to a real-world location.

### Why This Matters
A flyer should not count as placed just because it exists or was publicly scanned. Activation is an intentional admin action.

### Steps
1. User logs into the admin interface on mobile or desktop.
2. User opens the activation flow.
3. User scans the flyer QR code or enters the shortcode manually.
4. System resolves the flyer record.
5. User chooses:
   - an existing location
   - or creates a new location
6. User confirms activation.
7. System creates an activation record.
8. System updates flyer status to `activated`.
9. System returns a success view.

### Result
The flyer is now assigned to a known location.

### MVP Notes
- no auto-activation from first public scan
- no GPS requirement
- no photo proof requirement

---

## Flow 8: Public Scan Redirect

### Goal
Track public interest and redirect to the target destination.

### Steps
1. A public person scans a QR code.
2. Their browser opens a URL like `/r/{shortcode}`.
3. System looks up the flyer by shortcode.
4. System resolves:
   - flyer
   - campaign
   - current location if activated
5. System stores a scan event.
6. System redirects the visitor to the campaign destination URL.

### Result
The visit is tracked and the user reaches the intended page.

### Error Handling
If shortcode is invalid:
- show a fallback message or redirect to a safe default page

---

## Flow 9: Dashboard Review

### Goal
Allow the admin to evaluate campaign performance.

### Steps
1. User opens dashboard or campaign analytics.
2. System loads summary metrics:
   - total scans
   - recent scans
   - scans by flyer
   - scans by location
3. User reviews which locations perform best.
4. User uses the information to decide where to place more flyers.

### Result
Offline flyer performance becomes measurable.

---

## Flow 10: Create Location During Activation

### Goal
Allow fast activation even when the location does not yet exist.

### Steps
1. User is in activation flow.
2. User searches for an existing location.
3. No suitable location exists.
4. User chooses "Create New Location".
5. User enters at least a location name.
6. System creates the location.
7. System returns to the activation confirmation step.
8. User completes activation.

### Result
The user can continue without leaving the activation flow.

---

## Flow 11: View Flyer Detail

### Goal
Inspect the state of a specific flyer.

### Steps
1. User opens a flyer detail page from a campaign.
2. System shows:
   - shortcode
   - status
   - campaign
   - template
   - activation status
   - assigned location if any
   - scan count
   - recent scan events
3. User uses this view to verify placement and performance.

### Result
The flyer can be audited individually.

---

## Flow 12: Regenerate or Generate Additional Flyers

### Goal
Allow the admin to create more flyers later for the same campaign.

### Steps
1. User opens the campaign.
2. User clicks "Generate More Flyers".
3. User enters quantity.
4. System creates new flyer records with new shortcodes.
5. System prepares additional output files.

### Result
The campaign can be extended without recreating everything.

---

## Core Business Rules

### Rule 1
A flyer QR code is stable and uniquely identifies one flyer.

### Rule 2
Activation is always an explicit admin action.

### Rule 3
A public scan must never silently act as activation.

### Rule 4
A scan event should be attributed to the flyer and, if possible, to the current location.

### Rule 5
All core records belong to a workspace.

### Rule 6
The system should preserve historical event data instead of only storing current state.

---

## Primary End-to-End MVP Scenario

This is the main scenario that proves the product works:

1. Admin signs up.
2. Admin creates a campaign with a destination URL.
3. Admin uploads a flyer PDF.
4. Admin defines one QR placement.
5. Admin generates 20 flyers.
6. Admin prints the flyers.
7. Admin places flyer A at Location 1 and activates it.
8. A public user scans flyer A.
9. System stores the scan event and redirects correctly.
10. Admin opens the dashboard and sees the scan attributed to flyer A and Location 1.

If this scenario works reliably, the MVP solves the core product problem.
