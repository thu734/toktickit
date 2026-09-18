# Lab 3 Test Plan & Traceability Matrix

## 1. Test Strategy
The test strategy for TokTickIT Lab 3 applies Spec-Driven Development (Spec DD) and Test-Driven Development (TDD). Every Acceptance Criterion (`AC-01` through `AC-26`) maps directly to concrete planned tests across Unit, API/Integration, Authorization/Security, UI Component, UI Style, Responsive, Data Migration/Regression, and Playwright End-to-End (E2E) levels.

---

## 2. Planned Test Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | Unit | BR-14 | Ticket status state-machine transition validator | Valid transitions return true; invalid transitions (e.g. `CANCELLED` → `OPEN`) return false | `server/tests/lab-03/status-transition.unit.test.ts` | PLANNED / TBD |
| **AUTH-API-01** | API | AC-01, BR-01 | Valid user authentication (`POST /api/auth/login`) | HTTP 200 OK; sets session cookie `toktickit_session`; returns user profile and role | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-02** | API | AC-02, BR-01 | Invalid credentials or inactive user login rejection | HTTP 401 Unauthorized; safe error feedback without revealing account active state | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-03** | API | AC-03, BR-02 | Mandatory first-login password change lock (`mustChangePassword = true`) | HTTP 403 Forbidden with `MUST_CHANGE_PASSWORD` code for standard endpoints | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-04** | API | AC-04, BR-02 | Password change execution (`POST /api/auth/change-password`) | HTTP 200 OK; updates password hash; sets `mustChangePassword = false` | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-05** | API | AC-05 | User logout endpoint (`POST /api/auth/logout`) | HTTP 200 OK; invalidates session cookie on server and client | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-06** | API | BR-02 | Password complexity boundary validation | Weak password (<8 chars, no uppercase/symbol) rejected with HTTP 400 Bad Request | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-07** | API | FR-04 | Current user retrieval endpoint (`GET /api/auth/me`) | HTTP 200 OK; returns authenticated user profile, role, and `mustChangePassword` state | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-08** | API | AC-05 | Post-logout access blocking | Request after logout returns HTTP 401 Unauthorized | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **AUTH-API-09** | API | AC-24, BR-08 | Initial password flag on admin password reset | Admin password reset sets target account `mustChangePassword = true` for next login | `server/tests/lab-03/auth.api.test.ts` | PLANNED / TBD |
| **SEC-API-01** | Authorization | AC-06, BR-03 | Authenticated Requester identity enforcement | Session user ID applied; client-supplied identity header ignored | `server/tests/lab-03/authorization.api.test.ts` | PLANNED / TBD |
| **SEC-API-02** | Authorization | AC-25, BR-04 | Requester forbidden access to Admin and Staff endpoints | HTTP 403 Forbidden returned when Requester calls `/api/admin/*` or `/api/staff/*` | `server/tests/lab-03/authorization.api.test.ts` | PLANNED / TBD |
| **SEC-API-03** | Authorization | AC-17, BR-04 | Internal Notes isolation from Requester | HTTP 403 Forbidden when Requester attempts to fetch or post internal notes | `server/tests/lab-03/authorization.api.test.ts` | PLANNED / TBD |
| **SEC-API-04** | Authorization | AC-25 | Matrix GET/PATCH separation for Staff ticket operational endpoints | Admin can GET staff tickets, but calling PATCH `/api/staff/tickets/:id/status` returns HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | PLANNED / TBD |
| **SEC-API-05** | Authorization | BR-16 | Cross-Requester resource existence leak prevention | Requesting unowned ticket (`GET /api/tickets/:unownedId`) returns HTTP 404 Not Found | `server/tests/lab-03/authorization.api.test.ts` | PLANNED / TBD |
| **SEC-API-06** | Authorization | BR-16 | Safe failure handling for server errors | Unhandled exception returns generic HTTP 500 without leaking database stack traces | `server/tests/lab-03/authorization.api.test.ts` | PLANNED / TBD |
| **REG-API-01** | Regression | AC-07 | Lab 2 Requester Ticket & Attachment endpoints regression | Authenticated Requester can create ticket, list owned tickets, upload/remove attachments | `server/tests/lab-03/requester-regression.api.test.ts` | PLANNED / TBD |
| **REG-API-02** | Regression | BR-20 | Soft-removed attachment history and download protection | Attachment list returns `isRemoved: true` metadata; download returns HTTP 410 Gone | `server/tests/lab-03/requester-regression.api.test.ts` | PLANNED / TBD |
| **COMM-API-01** | API | AC-08, BR-15 | Public Comments retrieval and creation | HTTP 201 Created; comment saved with author role badge; HTTP 200 list returned | `server/tests/lab-03/comments-notes.api.test.ts` | PLANNED / TBD |
| **COMM-API-02** | API | AC-09, BR-05 | Requester "Problem Appears Resolved" indication | Appends public resolution comment (3–1000 chars); status remains unchanged (requires Staff action) | `server/tests/lab-03/comments-notes.api.test.ts` | PLANNED / TBD |
| **COMM-API-03** | API | BR-15 | Comment and Internal Note validation boundaries | Whitespace-only or < 3 char content rejected with HTTP 400 Bad Request | `server/tests/lab-03/comments-notes.api.test.ts` | PLANNED / TBD |
| **COMM-API-04** | API | BR-21 | Backend-generated authorship and timestamp enforcement | Client-supplied `authorId` or `createdAt` overridden by backend session user and server timestamp | `server/tests/lab-03/comments-notes.api.test.ts` | PLANNED / TBD |
| **STAFF-API-01** | API | AC-10, AC-11 | IT Staff Ticket Queue listing, search, filter, sort, paginate | HTTP 200 OK; returns all system tickets with pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | PLANNED / TBD |
| **STAFF-API-02** | API | AC-12, AC-13, BR-12 | Ticket ownership claim and staff/admin reassignment | HTTP 200 OK; `assignedStaffId` updated to target active IT Staff or Administrator ID | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | PLANNED / TBD |
| **STAFF-API-03** | API | AC-14, BR-13 | IT Priority update (`itPriority`) | HTTP 200 OK; `itPriority` updated while `requestedPriority` remains intact | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | PLANNED / TBD |
| **STAFF-API-04** | API | AC-15, AC-16, BR-19 | Ticket status state-machine transition & resolution summary handling | Valid transition updates HTTP 200; captures optional `resolutionSummary` when resolving | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | PLANNED / TBD |
| **STAFF-API-05** | API | AC-17, BR-04 | Internal Notes creation and retrieval for IT Staff and Administrator | HTTP 201 Created; note saved with author info; visible and writable by Staff & Admin | `server/tests/lab-03/comments-notes.api.test.ts` | PLANNED / TBD |
| **STAFF-API-06** | API | BR-13, BR-17 | IT Priority initialization on ticket creation | New ticket automatically initializes `itPriority = requestedPriority` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | PLANNED / TBD |
| **STAFF-API-07** | API | FR-12 | Queue query resilience to invalid parameters | Invalid filter/sort query parameters fall back safely to defaults with HTTP 200 OK | `server/tests/lab-03/staff-queue.api.test.ts` | PLANNED / TBD |
| **STAFF-API-08** | API | BR-12 | Invalid assignment target validation | Assigning ticket to a Requester user, inactive user, or invalid ID returns HTTP 400 Bad Request | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-01** | API | AC-18, AC-19 | Admin user listing with name/email search & role filter | HTTP 200 OK; returns matching user accounts list | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-02** | API | AC-20, BR-08 | Admin user creation with initial password | HTTP 201 Created; user saved with `mustChangePassword = true` | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-03** | API | AC-21, BR-07 | Duplicate email user creation rejection | HTTP 409 Conflict returned when creating user with existing email | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-04** | API | AC-22, BR-09 | Admin self-deactivation prevention | HTTP 400 Bad Request when Admin attempts to deactivate own account | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-05** | API | AC-23, BR-10 | Deactivation prevention of last active Administrator | HTTP 400 Bad Request when attempting to deactivate last remaining active Admin | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-06** | API | AC-24, BR-08 | Admin reset initial password for user | HTTP 200 OK; resets user password; flags `mustChangePassword = true` | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **ADMIN-API-07** | API | FR-20, BR-06 | Admin basic user editing, activation toggle & single role enforcement | Admin updates user name, email, role, and toggles `isActive` status | `server/tests/lab-03/users-admin.api.test.ts` | PLANNED / TBD |
| **MIG-01** | Migration | AC-07, BR-18 | Database migration verification (`DevelopmentRequester` → `User`) | Existing Lab 2 tickets & attachments intact; legacy `PENDING` mapped to `WAITING_FOR_REQUESTER` | `server/tests/lab-03/migration.test.ts` | PLANNED / TBD |
| **UI-01** | UI Component | AC-01, AC-02 | Login screen rendering, validation & safe failure error banner | Renders form; validates email format; displays safe error on 401 | `client/tests/lab-03/Login.test.tsx` | PLANNED / TBD |
| **UI-02** | UI Component | AC-03, AC-04 | Mandatory Change Password modal interaction & rule validation | Locks screen; checks complexity rules; updates password; unlocks app | `client/tests/lab-03/ChangePassword.test.tsx` | PLANNED / TBD |
| **UI-03** | UI Component | AC-05, AC-06 | Application Shell role-based navigation & Logout action | Displays user name and role badge; renders permitted links per role | `client/tests/lab-03/AppShell.test.tsx` | PLANNED / TBD |
| **UI-04** | UI Component | AC-10, AC-11 | IT Staff Ticket Queue search, filter, sort, and pagination UI | Interactive search, dropdown filters, sort headers, and page controls | `client/tests/lab-03/StaffTicketQueue.test.tsx` | PLANNED / TBD |
| **UI-05** | UI Component | AC-12, AC-13, AC-14, AC-15, BR-19 | IT Staff Ticket Detail claim, assign, IT priority, status & optional resolution summary | Interactive staff dashboard; state-machine dropdown; optional resolution summary input | `client/tests/lab-03/StaffTicketDetail.test.tsx` | PLANNED / TBD |
| **UI-06** | UI Component | AC-08, AC-17, BR-22 | Public Comments feed and Internal Notes tab UI rendering & safe HTML escaping | Renders distinct green Public Comments vs amber Internal Notes tabs; verifies XSS safe rendering | `client/tests/lab-03/CommentsAndNotes.test.tsx` | PLANNED / TBD |
| **UI-07** | UI Component | AC-18, AC-19, AC-20, AC-21 | Admin User Management list, search, create/edit modals | User table, role filter, create user modal, duplicate email 409 error | `client/tests/lab-03/UserManagement.test.tsx` | PLANNED / TBD |
| **UI-08** | UI Responsive | AC-26 | Multi-viewport responsive layout rendering | Controls operable across Desktop (1280px), Tablet (800px), Mobile (390px) | `client/tests/lab-03/ResponsiveUI.test.tsx` | PLANNED / TBD |
| **UI-STYLE-01** | UI Style | AC-26 | Zen Green design system tokens & WCAG 2.1 AA focus rings | `#006B3C` primary buttons, `#0B7A46` focus rings, `#F1F5F3` read-only fields | `client/tests/lab-03/ZenGreenStyle.test.tsx` | PLANNED / TBD |
| **E2E-01** | E2E | AC-01, AC-02, AC-04, AC-05 | Full Authentication & Password Change E2E workflow | Login with initial password -> Forced password change -> Shell -> Logout | `e2e/lab-03/authentication.spec.ts` | PLANNED / TBD |
| **E2E-02** | E2E | AC-10, AC-12, AC-15, AC-17 | IT Staff Ticket Queue & Ticket Operations E2E workflow | Queue search -> Claim ticket -> Change status -> Write Internal Note | `e2e/lab-03/staff-ticket-flow.spec.ts` | PLANNED / TBD |
| **E2E-03** | E2E | AC-18, AC-20, AC-24, AC-25, BR-08 | Admin User Management, Password Reset & Forced Next-Login Change E2E workflow | Admin resets password -> User logs in -> Forced next-login password change -> Shell access | `e2e/lab-03/user-administration.spec.ts` | PLANNED / TBD |

---

## 3. Acceptance-Criterion Traceability Summary

Every Acceptance Criterion (`AC-01` through `AC-26`) maps to planned tests:

| Acceptance Criterion | Mapped Planned Tests | Test Levels Covered |
| :--- | :--- | :--- |
| **AC-01** (Valid User Login) | `AUTH-API-01`, `UI-01`, `E2E-01` | API, UI Component, E2E |
| **AC-02** (Invalid Login Rejection) | `AUTH-API-02`, `UI-01`, `E2E-01` | API, UI Component, E2E |
| **AC-03** (Mandatory First-Password Lock) | `AUTH-API-03`, `UI-02` | API, UI Component |
| **AC-04** (Password Change Success) | `AUTH-API-04`, `UI-02`, `E2E-01` | API, UI Component, E2E |
| **AC-05** (User Logout Execution) | `AUTH-API-05`, `AUTH-API-08`, `UI-03`, `E2E-01` | API, UI Component, E2E |
| **AC-06** (Authenticated Requester Identity) | `SEC-API-01`, `UI-03` | Authorization, UI Component |
| **AC-07** (Requester Regression & Migration) | `REG-API-01`, `REG-API-02`, `MIG-01` | API Regression, Database Migration |
| **AC-08** (Public Comments Addition/List) | `COMM-API-01`, `COMM-API-04`, `UI-06` | API, UI Component |
| **AC-09** (Problem Appears Resolved Trigger) | `COMM-API-02`, `UI-06` | API, UI Component |
| **AC-10** (IT Staff Queue Retrieval) | `STAFF-API-01`, `UI-04`, `E2E-02` | API, UI Component, E2E |
| **AC-11** (IT Staff Queue Search & Filtering) | `STAFF-API-01`, `STAFF-API-07`, `UI-04` | API, UI Component |
| **AC-12** (IT Staff Ticket Claiming) | `STAFF-API-02`, `UI-05`, `E2E-02` | API, UI Component, E2E |
| **AC-13** (IT Staff Ticket Reassignment) | `STAFF-API-02`, `STAFF-API-08`, `UI-05` | API, UI Component |
| **AC-14** (IT Priority Management) | `STAFF-API-03`, `STAFF-API-06`, `UI-05` | API, UI Component |
| **AC-15** (Valid Status Transition) | `STAFF-API-04`, `UI-05`, `E2E-02` | API, UI Component, E2E |
| **AC-16** (Invalid Status Rejection) | `UNIT-01`, `STAFF-API-04` | Unit, API |
| **AC-17** (Internal Notes Isolation) | `SEC-API-03`, `STAFF-API-05`, `COMM-API-04`, `UI-06`, `E2E-02` | Authorization, API, UI Component, E2E |
| **AC-18** (Admin User List Retrieval) | `ADMIN-API-01`, `UI-07`, `E2E-03` | API, UI Component, E2E |
| **AC-19** (Admin User Search & Filtering) | `ADMIN-API-01`, `UI-07` | API, UI Component |
| **AC-20** (Admin User Creation) | `ADMIN-API-02`, `UI-07`, `E2E-03` | API, UI Component, E2E |
| **AC-21** (Duplicate Email Rejection) | `ADMIN-API-03`, `UI-07` | API, UI Component |
| **AC-22** (Admin Self-Deactivation Rejection) | `ADMIN-API-04`, `UI-07` | API, UI Component |
| **AC-23** (Last Admin Protection) | `ADMIN-API-05`, `UI-07` | API, UI Component |
| **AC-24** (Admin Password Reset) | `ADMIN-API-06`, `AUTH-API-09`, `UI-07`, `E2E-03` | API, UI Component, E2E |
| **AC-25** (Non-Admin Forbidden Access) | `SEC-API-02`, `SEC-API-04`, `E2E-03` | Authorization, E2E |
| **AC-26** (Responsive & Accessibility Usability) | `UI-08`, `UI-STYLE-01` | UI Responsive, UI Style |

---

## 4. Execution Summary Baseline
*Implementation has NOT started. All tests are currently PLANNED.*

| Test Suite | Total Planned | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| Server Unit Tests (`server/tests/lab-03/`) | 1 | 0 | 0 | PLANNED / TBD |
| Server API, Security & Migration Tests (`server/tests/lab-03/`) | 37 | 0 | 0 | PLANNED / TBD |
| Client UI Component & Style Tests (`client/tests/lab-03/`) | 9 | 0 | 0 | PLANNED / TBD |
| E2E Tests (`e2e/lab-03/`) | 3 | 0 | 0 | PLANNED / TBD |
| **Total Planned Tests** | **50** | **0** | **0** | **PLANNED / TBD** |
