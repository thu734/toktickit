# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a responsive, full-stack Requester-facing MVP for TokTickIT in Sprint 2. This increment enables seeded Development Requesters to select their identity for testing, create IT support tickets with optional attachments, list and search their own owned tickets with filtering and pagination, view detailed ticket status, upload new attachments, and soft-remove permitted attachments under strict business rules and a unified Zen Green design system.

## 2. Stakeholder Request Interpretation
The IT department requires an end-user facing ticketing experience to receive operational support requests. Because authentication and IT Staff queues will be introduced in Lab 3, Lab 2 must provide a temporary Development Requester selection mechanism to simulate multi-user ownership during testing. Requesters must be able to describe their problem, classify it by Category and Related System, specify Requested Priority, upload up to 5 permitted attachments (JPG, JPEG, PNG, WEBP, PDF up to 5 MB each), submit the ticket, receive an official system-generated Ticket Number (`TKT-YYYY-XXXXXX`), and manage their tickets in "My Tickets". Crucially, strict ticket ownership must prevent Requester A from viewing, searching, or modifying Requester B's tickets or attachments.

## 3. Scope

### Included
- Development Requester selection and switching context for Lab 2 testing.
- Active Category and active Related System reference data retrieval.
- Ticket creation with validation, trimming, duplicate submission prevention, and official Ticket Number generation.
- Requester-owned paginated ticket list ("My Tickets") with case-insensitive partial string search, category/priority/status filtering, sorting, page sizing, and loading/empty/no-results states.
- Requester Ticket Detail view presenting read-only header fields, current status, IT priority, and attachment management.
- Attachment lifecycle: file validation (type & size), uploading up to 5 active attachments per ticket, downloading active attachments, and soft-removing attachments with a mandatory removal reason.
- Ownership checks on both API endpoints and frontend views to guarantee strict multi-tenant isolation.
- Full Zen Green design system implementation and responsive layout across desktop (≥992px), tablet (768–991px), and mobile (<768px) viewports.

### Explicitly Excluded
- Real authentication: login, logout, passwords, password hashing, JWT/session tokens, real role-based access control (RBAC).
- IT Staff workflows: IT Staff user dashboard and queue, claiming or reassigning tickets, changing IT Priority, and other ticket-owner functions.
- Ticket collaboration and work tracking: Public Comments, Internal Notes, and Actions Taken.
- Ticket lifecycle after creation: status changes beyond the initial New status, including resolution confirmation, resolving, closing, reopening, or cancelling tickets.
- Administration functionality: Administrator management of users, Requesters, roles, and reference data.

---

## 4. Functional Requirements

- **FR-01 (Requester Selection)**: The system shall allow users to select an active Development Requester identity to set the current testing context.
- **FR-02 (Requester Switching)**: The system shall update all visible tickets, forms, and attachments immediately when a different Development Requester identity is selected.
- **FR-03 (Reference Data Listing)**: The system shall provide endpoints and UI dropdowns for active Ticket Categories and active Related Systems.
- **FR-04 (Ticket Creation)**: The system shall allow the selected Requester to create a ticket by specifying Category, Related System, Requested Priority, Summary, Description, and optional initial attachments.
- **FR-05 (Ticket Number Generation)**: The system shall automatically generate a unique, read-only official Ticket Number in the format `TKT-YYYY-XXXXXX` upon ticket creation (`BR-01`).
- **FR-06 (Ticket Default State)**: The system shall set new tickets to `Current Status = NEW` (`BR-02`) and `IT Priority = UNASSIGNED` (`BR-07`) by default.
- **FR-07 (Owned Ticket Listing)**: The system shall display a paginated list of tickets owned exclusively by the currently selected Development Requester.
- **FR-08 (Ticket Search)**: The system shall allow searching owned tickets by Ticket Number, Summary, or Description via case-insensitive partial string matching (`BR-23`).
- **FR-09 (Ticket Filtering & Sorting)**: The system shall support filtering owned tickets by Category, Requested Priority, and Current Status, and sorting by Creation Date, Last Updated Date, Ticket Number, or Requested Priority (`BR-24`).
- **FR-10 (Ticket Pagination)**: The system shall paginate ticket listings with configurable page sizes (10, 25, 50) and return explicit pagination metadata (`BR-25`).
- **FR-11 (Owned Ticket Detail View)**: The system shall allow a Requester to view full details of a ticket they own, displaying all header fields as read-only.
- **FR-12 (Attachment File Upload)**: The system shall allow uploading attachments during ticket creation (via sequential upload) or on the Ticket Detail screen for owned tickets (`BR-22`).
- **FR-13 (Attachment Validation)**: The system shall restrict attachments to allowed MIME types (JPG, JPEG, PNG, WEBP, PDF) (`BR-15`) and max file size of 5 MB per file (`BR-16`).
- **FR-14 (Attachment Limit Enforcement)**: The system shall enforce a maximum limit of 5 active (non-removed) attachments per ticket (`BR-17`).
- **FR-15 (Attachment Download)**: The system shall allow downloading of active attachments belonging to an owned ticket.
- **FR-16 (Attachment Soft Removal)**: The system shall permit soft-removing an active attachment from an owned ticket by providing a mandatory removal reason (`BR-19`, `BR-20`).
- **FR-17 (Soft-Removed Attachment Inspection)**: The system shall display soft-removed attachments in the metadata list marked as "Removed", showing the removal reason and timestamp, while permanently disabling download access (`BR-21`).
- **FR-18 (Form Data Preservation)**: The system shall preserve entered form data when validation errors or API failures occur during ticket submission (`BR-14`).
- **FR-19 (Ownership Security Enforcement)**: The system shall return `HTTP 403 Forbidden` whenever a Requester attempts to access, query, upload to, download from, or remove attachments on a ticket owned by another Requester (`BR-06`).

---

## 5. Business Rules

### Mandatory Example Business Rules (BR-01 – BR-03)
- **BR-01 (Official Ticket Number)**: The official Ticket Number is generated by the backend and must be unique. Format: `TKT-YYYY-XXXXXX` (e.g., `TKT-2026-000001`), where `YYYY` is the current year and `XXXXXX` is a sequential 6-digit zero-padded number.
- **BR-02 (Initial Ticket Status)**: Every new Ticket begins with `Current Status = NEW` (`NEW`). Status transitions (Open, In Progress, Resolved, Closed) are reserved for IT Staff in future labs.
- **BR-03 (Development Selector Exemption)**: Lab 2 uses a Development Requester selector instead of login. The selected identity is strictly a testing harness for Lab 2 and is not authentication. It does not set secure session cookies, hash passwords, or issue JWT tokens.

### Requester Selection & Ownership Rules (BR-04 – BR-06)
- **BR-04 (Inactive Requester Exclusion)**: Only active Development Requesters (`isActive = true`) may be selected as the current testing context. Inactive Requesters must be excluded from the selector dropdown and API.
- **BR-05 (Requester Identity Header)**: All requester-scoped client API requests in Lab 2 must communicate identity via the `X-Development-Requester-Id` HTTP header. Missing or malformed headers return `HTTP 400 Bad Request`.
- **BR-06 (Ownership Isolation)**: All ticket queries, detail fetches, and attachment operations MUST strictly filter by the active `requesterId`. Attempting to access or mutate resources belonging to another requester returns `HTTP 403 Forbidden`. Attempting to access non-existent IDs returns `HTTP 404 Not Found`.

### Ticket Defaults & Validation Rules (BR-07 – BR-14)
- **BR-07 (Initial IT Priority)**: Every new ticket must be initialized with `IT Priority = UNASSIGNED` (`UNASSIGNED`). Requested Priority (Low, Medium, High, Urgent) is chosen by the Requester.
- **BR-08 (Input Trimming)**: All string inputs (Summary, Description, Removal Reason) must be trimmed of leading and trailing whitespace before validation and persistence.
- **BR-09 (Summary Constraints)**: Ticket Summary is required, must not be empty after trimming, and must be between 5 and 150 characters.
- **BR-10 (Description Constraints)**: Ticket Description is required, must not be empty after trimming, and must be between 10 and 3000 characters.
- **BR-11 (Category & System Validation)**: Category ID and Related System ID are required, must reference records existing in the database, AND must be active (`isActive = true`). Inactive or non-existent IDs are rejected with `HTTP 400 Bad Request`.
- **BR-12 (Requested Priority Validation)**: Requested Priority is required and must be one of: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **BR-13 (Duplicate Submission Prevention)**: While ticket creation or attachment upload is processing, the Submit button is disabled, displays a busy spinner, and additional submissions are blocked.
- **BR-14 (Form Retention on Error)**: If ticket creation or attachment upload fails, the UI must retain all user inputs (Summary, Description, Category, Priority, System) so typed data is not lost.

### Attachment Rules (BR-15 – BR-22)
- **BR-15 (Permitted File Types)**: Attachments are strictly restricted to JPG/JPEG (`image/jpeg`), PNG (`image/png`), WEBP (`image/webp`), and PDF (`application/pdf`). File extensions must match allowed types (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`). All other file types (e.g. `.exe`, `.zip`, `.sh`) are rejected with `HTTP 400 Bad Request`.
- **BR-16 (File Size Limit)**: Individual attachment size must not exceed 5,242,880 bytes (5 MB). Files exceeding this limit are rejected with `HTTP 400 Bad Request`.
- **BR-17 (Active Attachment Count)**: A single ticket cannot have more than 5 active (`isRemoved = false`) attachments at any time. Uploading a 6th active file returns `HTTP 400 Bad Request`.
- **BR-18 (Safe Storage Filenames)**: Uploaded files must be stored on disk/storage in `server/uploads/` using generated UUIDs (e.g., `<uuid>.<ext>`) to prevent path traversal and filename collision risks. Original filenames are preserved in metadata.
- **BR-19 (Soft Removal Only)**: Physical attachment deletion is strictly forbidden. Removal is executed by setting `isRemoved = true`, recording `removedAt = current_timestamp`, `removedByRequesterId`, and storing `removalReason`.
- **BR-20 (Removal Reason Requirement)**: Soft removal requires a non-empty `removalReason` between 5 and 250 characters.
- **BR-21 (Blocked Download for Removed Files)**: Endpoints attempting to download or stream a soft-received attachment must return `HTTP 410 Gone`.
- **BR-22 (Initial Attachment Upload Flow & Failure Handling)**: When a ticket with initial attachments is submitted:
  1. `POST /api/tickets` (`application/json`) is submitted first to create the ticket.
  2. If ticket creation succeeds, each selected attachment file is uploaded sequentially via `POST /api/tickets/:id/attachments`.
  3. If an attachment upload fails: the Ticket remains created, successfully uploaded attachments remain stored, failed files are not stored, the UI reports exactly which files failed, typed form values remain visible, and the user may retry failed attachment uploads from the Ticket Detail screen.

### Search, Filter, Sort & Pagination Rules (BR-23 – BR-25)
- **BR-23 (Search Fields)**: Search query strings perform case-insensitive partial string matching (`ILIKE`/`contains`) against `ticketNumber`, `summary`, and `description`.
- **BR-24 (Default & Secondary Sorting)**: Default ticket list sorting is `createdAt DESC`. Secondary sorting is `id DESC` to guarantee deterministic pagination. Permitted sort fields are `createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`.
- **BR-25 (Pagination Bounds & Invalid Query Parameter Handling)**: Permitted page sizes are `10`, `25`, and `50`. Default page size is `10`. Page numbers are 1-indexed. Invalid query parameters (`page < 1`, invalid `limit`, unknown `sortBy`/`sortOrder`, or invalid enum filters) return `HTTP 400 Bad Request`.

---

## 6. UI Specification Summary
The UI follows the **Zen Green Design System**.
- **Header**: Primary Green (`#006B3C`) application bar displaying "TokTickIT", active page links ("My Tickets", "Create Ticket"), and active Development Requester identity pill with a "Switch Requester" trigger.
- **Requester Selection Screen**: Dedicated modal/page with clear disclaimer banner ("Testing selector for Lab 2 - Authentication coming in Lab 3"), active requester dropdown, and "Continue" button. Inactive requesters are excluded.
- **Create Ticket Screen**: Responsive card layout with required field asterisks (`*`), system-generated read-only fields (`Ticket Number`, `Date`), dropdowns for Category, System, Priority, full-width inputs for Summary and multiline Description, and Attachment dropzone.
- **My Tickets Screen**: Desktop data table and mobile card list with search bar, 3 Category/Requested Priority/Status dropdown filters, "Clear Filters" button, sorting column headers, priority/status visual badges, pagination controls, clear empty state (when no tickets exist), and no-results state (when filters yield no match).
- **Ticket Detail Screen**: Read-only header card displaying ticket status badge, summary, description, and audit metadata (excluding IT Staff internal fields/tabs), accompanied by an Attachment Section showing active attachments (with download and remove actions) and soft-removed attachment audit history.

---

## 7. Data Changes

### Prisma Schema Models & Field Definitions

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RequestedPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum ITPriority {
  UNASSIGNED
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  OPEN
  PENDING
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model DevelopmentRequester {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tickets            Ticket[]
  removedAttachments Attachment[] @relation("RemovedByRequester")

  @@map("development_requesters")
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tickets Ticket[]

  @@map("categories")
}

model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tickets Ticket[]

  @@map("related_systems")
}

model Ticket {
  id                Int                  @id @default(autoincrement())
  ticketNumber      String               @unique
  summary           String
  description       String
  requestedPriority RequestedPriority    @default(MEDIUM)
  itPriority        ITPriority           @default(UNASSIGNED)
  currentStatus     TicketStatus         @default(NEW)
  
  requesterId       Int
  requester         DevelopmentRequester @relation(fields: [requesterId], references: [id])
  
  categoryId        Int
  category          Category             @relation(fields: [categoryId], references: [id])
  
  relatedSystemId   Int
  relatedSystem     RelatedSystem        @relation(fields: [relatedSystemId], references: [id])
  
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  attachments       Attachment[]

  @@index([requesterId])
  @@index([currentStatus])
  @@index([categoryId])
  @@index([createdAt])
  @@map("tickets")
}

model Attachment {
  id                   Int                   @id @default(autoincrement())
  filename             String                // Original uploaded filename
  storedFilename       String                @unique // Generated safe UUID filename
  mimeType             String
  fileSize             Int
  filePath             String
  
  isRemoved            Boolean               @default(false)
  removedAt            DateTime?
  removalReason        String?
  
  ticketId             Int
  ticket               Ticket                @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  removedByRequesterId Int?
  removedByRequester   DevelopmentRequester? @relation("RemovedByRequester", fields: [removedByRequesterId], references: [id])

  createdAt            DateTime              @default(now())

  @@index([ticketId])
  @@index([ticketId, isRemoved])
  @@map("attachments")
}
```

### Required Seed Data Specification
The seed script (`server/prisma/seed.ts`) must run idempotently using `upsert`:
1. **Four Ticket Categories**: `Account and Access`, `Hardware`, `Software`, `Network`.
2. **Seven Related Systems**: `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
3. **Four Active Development Requesters**: `Jennifer Anderson`, `Michael Brown`, `Sarah Johnson`, `David Lee`.
4. **One Inactive Development Requester**: `Robert Smith` (`isActive: false`) — must not appear in the selection dropdown.

---

## 8. API Contract Summary

| HTTP Method | Endpoint Path | Description | Access Control |
|---|---|---|---|
| `GET` | `/api/requesters` | Retrieve active Development Requesters | Public / Testing |
| `GET` | `/api/categories` | Retrieve active Ticket Categories | Public / Testing |
| `GET` | `/api/related-systems` | Retrieve active Related Systems | Public / Testing |
| `POST` | `/api/tickets` | Create a new Ticket for active Requester | Requester Header |
| `GET` | `/api/tickets` | Search, filter, & paginate owned Tickets | Requester Header |
| `GET` | `/api/tickets/:id` | Retrieve Ticket Detail owned by Requester | Requester Header |
| `POST` | `/api/tickets/:id/attachments` | Upload attachment file to owned Ticket | Requester Header |
| `GET` | `/api/tickets/:id/attachments` | Retrieve attachment metadata list for Ticket | Requester Header |
| `GET` | `/api/attachments/:id/download` | Download active attachment file | Requester Header |
| `POST` | `/api/attachments/:id/soft-remove` | Soft-remove attachment with removal reason | Requester Header |

---

## 9. Acceptance Criteria

- **AC-01**: Given an active Development Requester is selected, when a valid ticket creation request (valid active Category, System, Priority, Summary, Description) is submitted, then one Ticket is saved with `Current Status = NEW` (`BR-02`), `IT Priority = UNASSIGNED` (`BR-07`), an official `TKT-YYYY-XXXXXX` number is returned (`BR-01`), and HTTP 201 Created is returned.
- **AC-02**: Given no Development Requester is selected in local state, when the user navigates to "My Tickets" or "Create Ticket", then the Development Requester selection screen is automatically displayed (`BR-03`).
- **AC-03**: Given Requester A is active, when Requester A attempts to fetch details of a ticket belonging to Requester B (`GET /api/tickets/:id`), then the API returns `HTTP 403 Forbidden` (`BR-06`) and no ticket data is exposed.
- **AC-04**: Given a ticket owned by Requester A, when an attachment upload is sent with a valid PDF, JPG, PNG, or WEBP file under 5 MB (`BR-15`, `BR-16`), then the file is stored safely, metadata is recorded, and HTTP 201 Created is returned.
- **AC-05**: Given an attachment file of an unsupported type (such as executable or ZIP file) or size exceeding 5 MB, when upload is attempted, then the API rejects the request with `HTTP 400 Bad Request` (`BR-15`, `BR-16`) and no file is stored.
- **AC-06**: Given a ticket already containing 5 active attachments, when a 6th attachment upload is attempted, then the system rejects the upload with `HTTP 400 Bad Request` citing attachment limit exceeded (`BR-17`).
- **AC-07**: Given an active attachment on an owned ticket, when the Requester submits a soft-removal request with a valid removal reason ("Uploaded wrong file"), then `isRemoved` is set to `true`, `removalReason` and timestamp are saved (`BR-19`, `BR-20`), and HTTP 200 OK is returned.
- **AC-08**: Given a soft-removed attachment, when any user attempts to download the file via `GET /api/attachments/:id/download`, then the API returns `HTTP 410 Gone` (`BR-21`) and blocks file transfer.
- **AC-09**: Given Requester A owns 15 tickets, when querying `GET /api/tickets?page=1&limit=10`, then exactly 10 tickets are returned alongside complete pagination metadata (`totalItems: 15`, `totalPages: 2`, `currentPage: 1`) (`BR-25`).
- **AC-10**: Given a search query `search=wifi` on My Tickets, when submitted, then only tickets owned by the active Requester whose Ticket Number, Summary, or Description contains "wifi" via case-insensitive partial string matching are returned (`BR-23`).
- **AC-11**: Given a server error (HTTP 500) during ticket creation submission, when the API fails, then the UI displays a clear Zen Green error message banner and preserves all typed form inputs in place (`BR-14`).
- **AC-12**: Given the active Requester is switched from Requester A to Requester B, when switching occurs, then the My Tickets list immediately reloads showing only Requester B's tickets (`BR-06`).
- **AC-13**: Given an inactive Development Requester exists in the database (`isActive = false`), when the selector loads, then that Requester is excluded and not displayed in the dropdown (`BR-04`).
- **AC-14**: Given valid ticket data, when the Requester submits the form, then the submit button becomes disabled with a busy state and repeated clicks do not create duplicate tickets (`BR-13`).
- **AC-15**: Given the selected Requester has no tickets created yet, when My Tickets loads, then a clear empty state message with a "Create Ticket" call-to-action is displayed.
- **AC-16**: Given tickets exist for the Requester but the current search or filter query produces no matching records, when the query is applied, then a clear no-results state message with a "Clear Filters" button is displayed.
- **AC-17**: Given the application is viewed at desktop (≥992px), tablet (768–991px), and mobile (<768px) viewport widths, when each required screen is displayed, then content and controls remain clear and operable without label clipping, overlapping elements, or unintended horizontal page scrolling.
- **AC-18**: Given a user navigates the application shell, selector, forms, and ticket list using keyboard navigation, when interactive controls receive focus, then focus rings remain visible, icon-only controls possess accessible labels, and all required controls are operable.
- **AC-19 (Explicit Ticket Filtering)**: Given tickets exist with various categories, requested priorities, and current statuses, when a Requester specifies `categoryId`, `requestedPriority`, or `currentStatus` query parameters, then the API returns only tickets matching all specified filter criteria.
- **AC-20 (Explicit Ticket Sorting)**: Given tickets exist, when a Requester specifies `sortBy` (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`) and `sortOrder` (`asc`, `desc`), then the API returns tickets sorted strictly according to the specified ordering rules.
- **AC-21 (Explicit Cross-Requester Attachment Security)**: Given Requester A owns Ticket X with attachments, when Requester B attempts to upload, download, or soft-remove an attachment associated with Ticket X, then the API returns `HTTP 403 Forbidden` (`BR-06`) and no attachment content or metadata is exposed or modified.
- **AC-22 (Owned Ticket Detail Retrieval)**: Given Requester A owns Ticket X, when Requester A requests `GET /api/tickets/:id`, then the API returns `HTTP 200 OK` with the Ticket, Requester, Category, Related System, priority, status, summary, description, and timestamps.
- **AC-23 (Ticket Validation)**: Given a ticket creation request with invalid data (missing Category/System, invalid Requested Priority, Summary outside 5–150 chars, or Description outside 10–3000 chars), when submitted, then the invalid submission is rejected, field-level validation messages are displayed below affected fields, the API returns `HTTP 400 Bad Request`, no ticket record is created in the database, and typed form values are preserved in place.

---

## 10. Definition of Done

### Part 1: Product Completion
- [ ] All functional requirements (FR-01 to FR-19) and business rules (BR-01 to BR-25) implemented and verified.
- [ ] All required planned tests pass on documented commands in the final `main` branch.
- [ ] No required test is skipped, disabled, or commented out.
- [ ] Every Acceptance Criterion (AC-01 to AC-23) has traceable passing test evidence.
- [ ] Conformance to data, API, UI, validation, and responsive specifications verified.
- [ ] Correct handling of success, failure, and boundary cases verified.
- [ ] Database schema migrated via Prisma and seeded idempotently with Categories, Related Systems, active Requesters, and inactive Requester.
- [ ] Responsive UI verified on Desktop (1280px), Tablet (768px), and Mobile (375px) without horizontal page scrolling or clipping.
- [ ] Zen Green design system tokens applied consistently across header, cards, buttons, badges, and form controls.
- [ ] README setup and test-running instructions are current.
- [ ] Required repository documentation is current.

### Part 2: Course Delivery Requirements
- [ ] **Specification & Test Planning Pre-Implementation Traceability**: Initial Sprint Specification and Test Planning contract files (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`) are explicitly committed and merged on branch `feature/5-requester-context` targeting `lab2-staging` via PR #5 before implementation feature branches are merged.
- [ ] **Sequential Issue Naming**: GitHub Issues continue directly from Lab 1 (#1 through #4) starting at Issue #5 through #9:
  - Issue #5: `[Lab 2] Sprint Specification, Test Plan & Development Requester Context` (`feature/5-requester-context`)
  - Issue #6: `[Lab 2] Ticket Creation & Official Ticket Number Generator` (`feature/6-create-ticket`)
  - Issue #7: `[Lab 2] My Tickets Paginated List, Search, Filter & Sort` (`feature/7-my-tickets`)
  - Issue #8: `[Lab 2] Requester Ticket Detail & Attachment Lifecycle` (`feature/8-ticket-detail-attachments`)
  - Issue #9: `[Lab 2] Responsive Layout, Accessibility & Release Integration` (`feature/9-visual-responsive`)
- [ ] **Strict Branching**: All feature branches are created from `lab2-staging` and open PRs targeting `lab2-staging` (never branch directly from or merge to `main`).
- [ ] **Peer Review & Approvals**: All PRs reviewed, approved, and recorded in `docs/lab-02/reviewer.md` with reviewer identity, PR links, comments, responses, and approvals.
- [ ] **AI Use Record**: `docs/lab-02/ai-use.md` completed with selected key prompts and reflection.
- [ ] **Required Contract Documents**: `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md` present in `docs/lab-02/`.
- [ ] **Final Release PR**: One final release PR merged from `lab2-staging` into `main` after integration testing.
- [ ] **PDF Submission Evidence**: Required Lab 2 submission PDF compiled with Answer Part 1 through Answer Part 9.

---

## 11. Assumptions and Decisions

- **Identity Transmission**: For Lab 2, client requests transmit identity via HTTP Header `X-Development-Requester-Id`. React Context and application state persist the active selection.
- **File Storage Location**: Uploaded attachment files are stored in the local server directory `server/uploads/` with UUID filenames, mapped via database `filePath`.
- **Primary vs Secondary Sorting**: Standard ticket listing orders by `createdAt DESC`, then `id DESC` to ensure static order during rapid creation.
- **Lab 3 Auth Clean Evolution**: In Lab 3, `DevelopmentRequester` model will map directly to or be migrated into `User` with `role = REQUESTER`, leaving `tickets` and `attachments` foreign key relations intact.
