# Lab 2 Test Plan and Results

## 1. Test Strategy
The test strategy for TokTickIT Lab 2 applies Spec-Driven Development (Spec DD) and Test-Driven Development (TDD). Every acceptance criterion (AC-01 through AC-23) maps directly to concrete automated tests across unit, API/integration, UI component, visual/style, responsive, and End-to-End (E2E) levels.

### Specification & Test-Planning Pre-Implementation Traceability
As required by the Lab 2 handout, the initial Sprint Specification and Test-Planning contract files (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`) are committed on branch `feature/5-requester-context` and merged into `lab2-staging` via PR #5 before implementation feature branches are completed.

### Feature Branch Test Execution
Feature implementation and automated tests are grouped sequentially across Issues #5 through #9:
- **Issue #5 (`feature/5-requester-context`)**: Active requesters, inactive requester exclusion, selection UI.
- **Issue #6 (`feature/6-create-ticket`)**: Unit test for Ticket Number generator, ticket creation API, ticket validation, Create Ticket form.
- **Issue #7 (`feature/7-my-tickets`)**: Paginated ticket listing, search, filter, sort, empty state, no-results state.
- **Issue #8 (`feature/8-ticket-detail-attachments`)**: Ticket detail read-only layout, positive ticket detail API test, attachment upload/download/soft-removal, cross-requester attachment security.
- **Issue #9 (`feature/9-visual-responsive`)**: Desktop/tablet/mobile layout checks, visual accessibility, E2E flow.

All feature branches branch from `lab2-staging` and target `lab2-staging` via Pull Requests.

---

## 2. Planned Tests

| Test ID | Type | Acceptance Criterion | What It Tests | Expected Result | Actual Test-File Path | Final Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | FR-05, BR-01 | Ticket Number generator function | Generator returns `TKT-YYYY-XXXXXX` format with current year and zero-padded 6-digit sequence | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned/TBD |
| **API-01** | API / Integration | AC-01 | Ticket creation endpoint with valid payload | HTTP 201 Created; returns ticket record with `TKT-YYYY-XXXXXX` number, `NEW` status, `UNASSIGNED` IT priority | `server/tests/lab-02/create-ticket.api.test.ts` | Planned/TBD |
| **API-02** | API / Integration | AC-23 | Ticket creation with invalid input (short summary, missing category/system) | HTTP 400 Bad Request with field validation errors; no ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Planned/TBD |
| **API-03** | API / Integration | AC-09 | Paginated ticket listing for active requester | HTTP 200 OK; returns 10 tickets, correct page metadata (`totalItems`, `totalPages`) | `server/tests/lab-02/my-tickets.api.test.ts` | Planned/TBD |
| **API-04** | API / Integration | AC-10 | Ticket listing search query matching summary/description | HTTP 200 OK; returns only matching tickets owned by requester via case-insensitive partial match | `server/tests/lab-02/my-tickets.api.test.ts` | Planned/TBD |
| **API-05** | API / Integration | AC-03 | Ticket detail retrieval for ticket owned by another requester | HTTP 403 Forbidden; cross-requester ticket detail blocked | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned/TBD |
| **API-05A** | API / Integration | AC-22 | Positive owned ticket detail retrieval | HTTP 200 OK; returns full ticket details (ticketNumber, summary, description, category, system, requester) | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned/TBD |
| **API-06** | API / Integration | AC-04 | Valid attachment upload (PDF, JPG, PNG, WEBP under 5 MB) | HTTP 201 Created; attachment metadata saved with generated safe filename | `server/tests/lab-02/attachments.api.test.ts` | Planned/TBD |
| **API-07** | API / Integration | AC-05 | Invalid attachment upload (unsupported file type .exe/.zip or >5MB) | HTTP 400 Bad Request; file upload rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned/TBD |
| **API-08** | API / Integration | AC-06 | Attachment upload exceeding 5 active files limit per ticket | HTTP 400 Bad Request; attachment limit error message | `server/tests/lab-02/attachments.api.test.ts` | Planned/TBD |
| **API-09** | API / Integration | AC-07 | Soft-removal of active attachment with valid removal reason | HTTP 200 OK; `isRemoved = true`, timestamp & reason saved | `server/tests/lab-02/attachments.api.test.ts` | Planned/TBD |
| **API-10** | API / Integration | AC-08 | Download request for soft-removed attachment | HTTP 410 Gone; file content blocked | `server/tests/lab-02/attachments.api.test.ts` | Planned/TBD |
| **API-11** | API / Integration | AC-13 | Inactive Development Requester exclusion endpoint test | Inactive requesters (`isActive: false`) are excluded from `GET /api/requesters` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned/TBD |
| **API-12** | API / Integration | AC-21 | Cross-requester attachment upload/download/removal security | HTTP 403 Forbidden; attachment mutation or download blocked for non-owner | `server/tests/lab-02/attachments.api.test.ts` | Planned/TBD |
| **API-13** | API / Integration | AC-19 | Ticket filtering by Category, Requested Priority, or Current Status | HTTP 200 OK; returns only tickets matching specified filter criteria | `server/tests/lab-02/my-tickets.api.test.ts` | Planned/TBD |
| **API-14** | API / Integration | AC-20 | Ticket sorting by all permitted fields (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`) | HTTP 200 OK; returns tickets ordered by specified sort column and direction (`asc`, `desc`) | `server/tests/lab-02/my-tickets.api.test.ts` | Planned/TBD |
| **UI-01** | UI Component | AC-02 | Unselected requester context redirect | Renders Development Requester Selection modal/screen | `client/tests/lab-02/CreateTicket.test.tsx` | Planned/TBD |
| **UI-02** | UI Component | AC-11, AC-23 | Create Ticket form client-side validation & API failure | Displays field-level errors; retains user inputs upon 500 error | `client/tests/lab-02/CreateTicket.test.tsx` | Planned/TBD |
| **UI-03** | UI Component | AC-12 | Requester identity switching | Selection change triggers complete reload of ticket list for new context | `client/tests/lab-02/MyTickets.test.tsx` | Planned/TBD |
| **UI-04** | UI Component | AC-09, AC-10, AC-19, AC-20 | Search, filter, sort, and pagination interaction in My Tickets | Filters list, updates table/cards, sorts columns, updates pagination controls | `client/tests/lab-02/MyTickets.test.tsx` | Planned/TBD |
| **UI-05** | UI Component | AC-03, AC-22 | Ticket Detail screen read-only presentation | Displays header fields in read-only style; hides edit actions & IT tabs | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned/TBD |
| **UI-06** | UI Component | AC-04, AC-07 | Attachment section file upload and soft-removal modal | File selection, progress state, soft-removal modal with mandatory reason | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned/TBD |
| **UI-07** | UI Component | AC-13 | Selector dropdown excludes inactive requesters | Inactive requester (`isActive: false`) is not rendered in select options | `client/tests/lab-02/CreateTicket.test.tsx` | Planned/TBD |
| **UI-08** | UI Component | AC-14 | Submit button busy state & duplicate submission lock | Disables Submit button during request processing; ignores repeated clicks | `client/tests/lab-02/CreateTicket.test.tsx` | Planned/TBD |
| **UI-09** | UI Component | AC-15 | Empty state when selected requester has no tickets | Displays clear empty state message with "Create Ticket" action | `client/tests/lab-02/MyTickets.test.tsx` | Planned/TBD |
| **UI-10** | UI Component | AC-16 | No-results state when search/filter produces no match | Displays no-results message with "Clear Filters" button | `client/tests/lab-02/MyTickets.test.tsx` | Planned/TBD |
| **UI-11** | UI Component / Responsive | AC-17 | Responsive screen rendering across viewports | Content & controls remain operable on Desktop, Tablet, and Mobile without clipping or horizontal page scrolling | `client/tests/lab-02/MyTickets.test.tsx` | Planned/TBD |
| **UI-12** | UI Component / Accessibility | AC-18 | Keyboard navigation & focus ring visibility | All form controls focusable via Tab key; focus indicators visible; accessible aria-labels | `client/tests/lab-02/CreateTicket.test.tsx` | Planned/TBD |
| **UI-STYLE-01**| UI Style | AC-01, AC-11 | Zen Green Theme token compliance | Primary green `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF` verified | `client/tests/lab-02/CreateTicket.test.tsx` | Planned/TBD |
| **E2E-01** | E2E | AC-01, AC-09, AC-14 | Full requester workflow & duplicate submission check | Ticket created, official number displayed, no duplicate tickets generated | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned/TBD |
| **E2E-02** | E2E | AC-04, AC-07 | Attachment lifecycle E2E (Upload -> Inspect -> Soft-remove with reason) | File uploaded, visible as active, soft-removed, download disabled | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned/TBD |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Mapped Planned Tests | Test Levels Covered |
|---|---|---|
| **AC-01** (Valid Ticket Creation) | API-01, UI-STYLE-01, E2E-01 | API, UI Style, E2E |
| **AC-02** (Unselected Requester Redirect) | UI-01 | UI Component |
| **AC-03** (Cross-Requester Ticket Isolation) | API-05, UI-05 | API, UI Component |
| **AC-04** (Valid Attachment Upload) | API-06, UI-06, E2E-02 | API, UI Component, E2E |
| **AC-05** (Invalid Attachment Rejection) | API-07 | API Integration |
| **AC-06** (Attachment Limit 5 Per Ticket) | API-08 | API Integration |
| **AC-07** (Attachment Soft-Removal) | API-09, UI-06, E2E-02 | API, UI Component, E2E |
| **AC-08** (Blocked Removed Download) | API-10 | API Integration |
| **AC-09** (Paginated Ticket Listing) | API-03, UI-04, E2E-01 | API, UI Component, E2E |
| **AC-10** (Ticket Search Matching) | API-04, UI-04 | API, UI Component |
| **AC-11** (API Failure Form Data Retention)| UI-02 | UI Component |
| **AC-12** (Requester Switching Reload) | UI-03 | UI Component |
| **AC-13** (Inactive Requester Exclusion) | API-11, UI-07 | API, UI Component |
| **AC-14** (Duplicate Submission Prevention)| UI-08, E2E-01 | UI Component, E2E |
| **AC-15** (Empty Ticket List State) | UI-09 | UI Component |
| **AC-16** (No-Results Search/Filter State) | UI-10 | UI Component |
| **AC-17** (Responsive Layout Usability) | UI-11 | UI Responsive |
| **AC-18** (Keyboard Focus & Accessibility)| UI-12 | UI Accessibility |
| **AC-19** (Explicit Ticket Filtering) | API-13, UI-04 | API, UI Component |
| **AC-20** (Explicit Ticket Sorting) | API-14, UI-04 | API, UI Component |
| **AC-21** (Explicit Cross-Requester Attachment Security)| API-12 | API Integration |
| **AC-22** (Owned Ticket Detail Retrieval) | API-05A, UI-05 | API, UI Component |
| **AC-23** (Ticket Input Validation) | API-02, UI-02 | API, UI Component |

---

## 4. Responsive and Visual Checklist

### Viewport Targets
- **Desktop (≥ 992 px)**: Standard multi-column grid, table display for My Tickets with sort headers, persistent filter panel.
- **Tablet (768 px – 991 px)**: Reduced-column responsive table or card layout without overall page horizontal scrolling.
- **Mobile (< 768 px)**: Single-column vertical layout, table converted to card list format, full-width touch-friendly buttons (minimum 44px touch target).

### Visual Inspection Items
- [ ] No text clipping, overlapping labels, or missing asterisks (`*`) on required fields.
- [ ] Read-only fields visually distinguished using quiet shading (`#F1F5F3`).
- [ ] Priority and Status badges use correct Zen Green theme color tokens.
- [ ] Busy spinner rendered on primary submission button during pending request.
- [ ] Error messages positioned immediately below associated input controls.
- [ ] Screenshot evidence stored under `artifacts/lab-02/screenshots/` for Desktop, Tablet, and Mobile viewports across Create Ticket, My Tickets, and Ticket Detail screens.

---

## 5. Test Commands

```bash
# Unit Tests
cd server && npm test server/tests/lab-02/ticket-number.unit.test.ts

# Server API & Integration Tests
cd server && npm test

# Client UI Component Tests
cd client && npm test

# End-to-End Playwright Tests (once implemented)
npx playwright test e2e/lab-02/
```

---

## 6. Final Results
*Implementation has NOT started. All tests are currently PLANNED.*

| Test Suite | Total Planned | Passed | Failed | Status |
|---|---|---|---|---|
| Server Unit Tests (`server/tests/lab-02/`) | 1 | 0 | 0 | PLANNED / TBD |
| Server API Tests (`server/tests/lab-02/`) | 15 | 0 | 0 | PLANNED / TBD |
| Client UI Tests (`client/tests/lab-02/`) | 13 | 0 | 0 | PLANNED / TBD |
| E2E Tests (`e2e/lab-02/`) | 2 | 0 | 0 | PLANNED / TBD |

---

## 7. Known Limitations or Deferred Tests
- **Real Authentication & JWT**: Auth flow tests deferred to Lab 3.
- **IT Staff Action Workflows**: Ticket assignment, resolution, and comment thread testing deferred to future labs.
