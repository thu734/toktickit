# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a secure, full-stack multi-role IT Service Desk increment for TokTickIT in Sprint 3. This increment replaces the temporary Lab 2 Development Requester selector with real authentication and server-side role-based access control (RBAC), introduces the first operational IT Staff ticket management workflow and minimalist Administrator user administration, and preserves all completed Lab 2 Requester capabilities without data loss or breaking changes.

## 2. Stakeholder Request

The IT department requires TokTickIT to transition from a development prototype into an operational multi-user platform supporting three roles: Requester, IT Staff, and Administrator. Anonymous header-based testing selectors must be replaced with secure email/password authentication. Users signing in with an initial password must change it before entering normal application screens (`BR-02`). Requesters must continue creating and managing their owned tickets using their authenticated identity (`BR-03`). IT Staff need a shared Ticket Queue to find and prioritize work, open Ticket Detail, claim or reassign ticket ownership, set IT Priority, update permitted status values, post Public Comments, and record private Internal Notes (`BR-04`). Requesters may indicate that a problem appears resolved (`BR-05`), but IT Staff remain responsible for formally resolving or closing tickets. Administrators require a minimalist User Management screen to view users, create accounts with initial passwords, edit user details, assign one permitted role, activate or deactivate accounts, and set new initial passwords under safety rules (preventing self-deactivation, preventing removal of the last active Administrator, and enforcing unique emails). Role-based security must be enforced on the backend for every API endpoint. The user interface must maintain strict consistency with the Zen Green design system across desktop, tablet, and mobile viewports.

## 3. Scope

### Included

- User authentication (email/password login, secure password hashing, authenticated session persistence, logout, current user retrieval) and mandatory first-login password change (`BR-02`).
- Server-side role-based authorization middleware for three roles: `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
- Evolving the Lab 2 PostgreSQL and Prisma schema, migrating `DevelopmentRequester` records into the `User` model (`role = REQUESTER`), mapping legacy `PENDING` tickets to `WAITING_FOR_REQUESTER`, initializing `itPriority = requestedPriority`, and preserving all existing Lab 2 Ticket, Category, System, and Attachment data.
- Continuation of all Lab 2 Requester functions (ticket creation, listing, searching, filtering, sorting, pagination, attachment upload/download/soft-removal) using authenticated identity (`BR-03`).
- Requester Public Comments feed and "Problem Appears Resolved" resolution indication trigger (`BR-05`).
- IT Staff Ticket Queue with search (ticket number, summary, description), filtering (Category, IT Priority, Status, Assigned Owner), sorting, pagination, and responsive presentation.
- IT Staff Ticket Detail operations: ticket claiming, staff/admin reassignment, IT Priority management, state-machine status transitions with optional `resolutionSummary` for `RESOLVED`, Public Comments, private Internal Notes (`BR-04`), and attachment viewing/downloading with soft-removed history.
- Administrator User Management (`/admin/users`): user listing, name/email search, role filter, user creation with initial password, editing (name, email, role, active status), set new initial password, and Admin safety rules (`BR-06`–`BR-11`).
- Zen Green UI extension, WCAG 2.1 AA focus rings, responsive multi-viewport layouts, authorization security tests, and Playwright E2E test suites.

### Explicitly Excluded

- Email invitations, password-reset emails, multi-factor authentication (MFA), social login, and Single Sign-On (SSO).
- Self-registration and Requester-created accounts (user accounts created exclusively by Administrator).
- Actions Taken by IT Staff (deferred to Lab 4).
- Formal SLA calculation engines, automated SLA escalation rules, and notification services.
- Dashboards and KPI analytics beyond simple queue counts.
- Multi-tenant organizations, departments, and customer administration.
- Production-grade deployment or cloud infrastructure changes.
- Multiple roles assigned to a single user (each user has exactly 1 primary role).
- User deletion, bulk user operations, user import or export, and account-history screens.
- Department, organization, profile-photo, and other extended user-profile management.
- Email delivery of initial passwords or reset links (local lab display only).
- Account unlocking, administrator approval workflows, and advanced identity-management functions.
- Advanced user-list features in User Management such as mandatory pagination, multi-column sorting, and multiple simultaneous filters.

## 4. Authorization & Workflow Specifications

### 4.1 Master Authorization Matrix

| Resource / Endpoint Category     | Operation / Endpoint Method & Path                                                                       |          Requester          |      IT Staff       |     Administrator      | Unauthenticated |
| :------------------------------- | :------------------------------------------------------------------------------------------------------- | :-------------------------: | :-----------------: | :--------------------: | :-------------: |
| **Auth: Public**                 | `POST /api/auth/login`                                                                                   |            Allow            |        Allow        |         Allow          |      Allow      |
| **Auth: Core**                   | `POST /api/auth/logout`, `GET /api/auth/me`                                                              |            Allow            |        Allow        |         Allow          |       401       |
| **Auth: Password Change**        | `POST /api/auth/change-password`                                                                         |            Allow            |        Allow        |         Allow          |       401       |
| **Requester: Workspace**         | `POST /api/tickets`, `GET /api/tickets`                                                                  |         Allow (Own)         |         403         |          403           |       401       |
| **Requester: Ticket Detail**     | `GET /api/tickets/:id`                                                                                   | Allow (Own) / 404 (Unowned) | 403 (Use Staff API) |  403 (Use Staff API)   |       401       |
| **Attachments: Upload/Remove**   | `POST /api/tickets/:id/attachments`, `POST /api/attachments/:id/soft-remove`                             | Allow (Own) / 404 (Unowned) |         403         |          403           |       401       |
| **Attachments: History List**    | `GET /api/tickets/:id/attachments`                                                                       | Allow (Own) / 404 (Unowned) |        Allow        |         Allow          |       401       |
| **Attachments: Download**        | `GET /api/attachments/:id/download`                                                                      | Allow (Own) / 404 (Unowned) |        Allow        |         Allow          |       401       |
| **Public Comments**              | `GET`, `POST /api/tickets/:id/comments`                                                                  | Allow (Own) / 404 (Unowned) |        Allow        |         Allow          |       401       |
| **Resolution Indication**        | `POST /api/tickets/:id/indicate-resolved`                                                                | Allow (Own) / 404 (Unowned) |         403         |          403           |       401       |
| **IT Staff: Queue Retrieval**    | `GET /api/staff/tickets`                                                                                 |             403             |        Allow        | Allow (Read Oversight) |       401       |
| **IT Staff: Ticket Detail View** | `GET /api/staff/tickets/:id`                                                                             |             403             |        Allow        | Allow (Read Oversight) |       401       |
| **IT Staff: Claim & Reassign**   | `PATCH /api/staff/tickets/:id/assign`                                                                    |             403             |        Allow        |          403           |       401       |
| **IT Staff: Priority Update**    | `PATCH /api/staff/tickets/:id/priority`                                                                  |             403             |        Allow        |          403           |       401       |
| **IT Staff: Status Update**      | `PATCH /api/staff/tickets/:id/status`                                                                    |             403             |        Allow        |          403           |       401       |
| **Internal Notes: Read/Write**   | `GET`, `POST /api/staff/tickets/:id/notes`                                                               |             403             |        Allow        |         Allow          |       401       |
| **Admin: User Management**       | `GET`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password` |             403             |         403         |         Allow          |       401       |

### 4.2 Ticket Status Transition Matrix

| Current Status          | Allowed Target Statuses                                         | Permitted Roles | Required Input / Confirmation                                             | Invalid Transitions (Return 400 Bad Request)                                   |
| :---------------------- | :-------------------------------------------------------------- | :-------------: | :------------------------------------------------------------------------ | :----------------------------------------------------------------------------- |
| `NEW`                   | `OPEN`, `IN_PROGRESS`, `CANCELLED`                              |    IT Staff     | Confirmation required for `CANCELLED`                                     | `RESOLVED`, `CLOSED`, `REOPENED`, `WAITING_FOR_REQUESTER`                      |
| `OPEN`                  | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |    IT Staff     | `resolutionSummary` (optional/encouraged up to 1000 chars) for `RESOLVED` | `NEW`, `REOPENED`                                                              |
| `IN_PROGRESS`           | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`                |    IT Staff     | `resolutionSummary` (optional/encouraged up to 1000 chars) for `RESOLVED` | `NEW`, `OPEN`, `REOPENED`                                                      |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED`                          |    IT Staff     | `resolutionSummary` (optional/encouraged up to 1000 chars) for `RESOLVED` | `NEW`, `OPEN`, `REOPENED`                                                      |
| `RESOLVED`              | `CLOSED`, `REOPENED`                                            |    IT Staff     | None                                                                      | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`             |
| `CLOSED`                | `REOPENED`                                                      |    IT Staff     | Confirmation required to Reopen                                           | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `REOPENED`              | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |    IT Staff     | `resolutionSummary` (optional/encouraged up to 1000 chars) for `RESOLVED` | `NEW`, `OPEN`, `CLOSED`                                                        |
| `CANCELLED`             | _(Terminal State — None)_                                       |       N/A       | None                                                                      | Any transition attempt returns `HTTP 400 Bad Request`                          |

## 5. Functional Requirements

- **FR-01 (User Authentication)**: The system shall allow users to authenticate using email and password, returning HTTP 200 OK and establishing a signed HTTP-Only session cookie (`toktickit_session`).
- **FR-02 (Credential Validation & Inactive Protection)**: The system shall reject invalid credentials or inactive user accounts (`isActive = false`) with `HTTP 401 Unauthorized` without revealing account existence or active status (`BR-01`).
- **FR-03 (Mandatory First-Login Password Change)**: The system shall restrict users with `mustChangePassword = true` to `POST /api/auth/change-password`, `POST /api/auth/logout`, and `GET /api/auth/me`, returning `HTTP 403 Forbidden` (`MUST_CHANGE_PASSWORD`) for all other routes (`BR-02`).
- **FR-04 (Current User Retrieval)**: The system shall provide `GET /api/auth/me` returning the authenticated user's ID, name, email, role, and `mustChangePassword` state.
- **FR-05 (User Logout)**: The system shall allow authenticated users to log out (`POST /api/auth/logout`), clearing the session cookie on client and server.
- **FR-06 (Server-Side Authorization Enforcement)**: The system shall enforce server-side authorization middleware on all protected API endpoints, returning `HTTP 401 Unauthorized` for unauthenticated requests and `HTTP 403 Forbidden` for role violations.
- **FR-07 (Role-Based Application Shell)**: The system shall render an application shell presenting navigation options strictly permitted for the authenticated user's role:
  - **Requester**: My Tickets | Create Ticket
  - **IT Staff**: Ticket Queue
  - **Administrator**: User Management
- **FR-08 (Authenticated Requester Identity)**: The system shall derive requester identity strictly from the server-side authenticated session cookie and remove the client-supplied `X-Development-Requester-Id` header (`BR-03`).
- **FR-09 (Lab 2 Requester Functionality Preservation)**: The system shall permit authenticated Requesters to create tickets, view owned tickets, search/filter/sort/paginate owned tickets, upload attachments (max 5 active, ≤ 5 MB; permitted formats: JPG/JPEG, PNG, WEBP, PDF), download active attachments, and soft-remove attachments with a mandatory reason.
- **FR-10 (Public Comments)**: The system shall allow Requesters (on owned tickets), IT Staff, and Administrators to view and append Public Comments (3–1000 trimmed characters) on a ticket.
- **FR-11 (Problem Appears Resolved Indication)**: The system shall allow a Requester to click "Problem Appears Resolved" on an owned ticket, submitting a public resolution comment (3–1000 trimmed characters) without directly changing ticket status (`BR-05`).
- **FR-12 (IT Staff Ticket Queue)**: The system shall provide a shared Ticket Queue for IT Staff and Administrators (read oversight) with text search (ticket number, summary, description), filtering (Category, IT Priority, Status, Assigned Owner), sorting, and pagination. When query parameters are omitted, defaults shall be: `sortBy = createdAt`, `sortOrder = desc`, `page = 1`, and `limit = 10`.
- **FR-13 (Ticket Claiming & Reassignment)**: The system shall allow IT Staff to claim an unassigned ticket or reassign ownership (`assignedStaffId`) to any active IT Staff or active Administrator account (`BR-12`). Assigning to non-staff/inactive accounts is rejected (`HTTP 400`).
- **FR-14 (IT Priority Management)**: The system shall allow IT Staff to update `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), which is initialized to `requestedPriority` upon creation (`BR-13`, `BR-17`).
- **FR-15 (State-Machine Status Transitions)**: The system shall allow IT Staff to update ticket status strictly according to the approved status transition matrix, capturing an optional `resolutionSummary` when transitioning to `RESOLVED` (`BR-14`, `BR-19`).
- **FR-16 (Internal Notes)**: The system shall allow IT Staff and Administrators to view and write private Internal Notes (3–2000 trimmed characters) on a ticket (`BR-04`). Internal Notes are strictly inaccessible to Requesters (`HTTP 403`).
- **FR-17 (User Account Listing)**: The system shall allow Administrators to view all user accounts with Name, Email, Role, Activation Status, and Edit actions.
- **FR-18 (User Search & Role Filtering)**: The system shall allow Administrators to search users by name or email and filter by role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
- **FR-19 (User Account Creation)**: The system shall allow Administrators to create new user accounts specifying Name, Email, Role, Activation State, and an Initial Password (`BR-08`). Duplicate email attempts return `HTTP 409 Conflict`.
- **FR-20 (User Account Editing)**: The system shall allow Administrators to update a user's Name, Email, Role, and Activation State. Duplicate email attempts return `HTTP 409 Conflict`.
- **FR-21 (Initial Password Reset)**: The system shall allow Administrators to assign a new initial password to any user account, setting `mustChangePassword = true` for their next login (`BR-08`).
- **FR-22 (Admin Safety Rule Enforcement)**: The system shall reject duplicate emails with `HTTP 409 Conflict` (`BR-07`), prevent Administrators from deactivating their own account (`BR-09`), and prevent deactivating or demoting the last active Administrator in the system (`BR-10`).

## 6. Business Rules

- **BR-01 (Active User Authentication)**: Only an active user (`isActive = true`) with valid credentials may authenticate. Unauthenticated or inactive login attempts return `HTTP 401 Unauthorized` with generic safe error text.
- **BR-02 (Mandatory Password Change Lock)**: A user marked with `mustChangePassword = true` cannot enter normal application screens or request standard APIs until a new valid password meeting complexity rules is saved (`HTTP 403 Forbidden` with code `MUST_CHANGE_PASSWORD`).
- **BR-03 (Server-Determined Identity)**: Authenticated user identity derived from the server session cookie determines resource ownership. Client-supplied identity headers or body parameters are ignored.
- **BR-04 (Comment & Note Visibility Boundaries)**: Public Comments are visible to Requesters, IT Staff, and Administrators. Internal Notes are operational notes visible **strictly** to IT Staff and Administrators (`HTTP 403 Forbidden` for Requester access). Both IT Staff and Administrators may view and post Internal Notes.
- **BR-05 (Requester Resolution Limitation)**: Requesters may indicate that a problem appears resolved, but **cannot** formally set ticket status to `RESOLVED` or `CLOSED`. Formal status transitions to `RESOLVED` or `CLOSED` are restricted to IT Staff.
- **BR-06 (Single Permitted Role)**: Each user must be assigned exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles per user are forbidden.
- **BR-07 (Unique Email Conflict)**: Every user account must have a unique, case-insensitive email address. Creating or updating a user to an existing email returns `HTTP 409 Conflict` with code `EMAIL_ALREADY_EXISTS`.
- **BR-08 (Initial Password Flag)**: Accounts created by an Administrator or receiving a password reset must be flagged with `mustChangePassword = true`.
- **BR-09 (Self-Deactivation Prevention)**: An Administrator cannot deactivate their own active account (`HTTP 400 Bad Request`).
- **BR-10 (Last Administrator Protection)**: The system must prevent deactivating or demoting the last active `ADMINISTRATOR` in the database (`HTTP 400 Bad Request`).
- **BR-11 (Deactivation over Deletion)**: Account removal is executed via deactivation (`isActive = false`). Deleting users is prohibited to preserve ticket ownership and comment history.
- **BR-12 (Primary Ticket Ownership)**: Each ticket has at most one primary owner (`assignedStaffId`) referencing an active `IT_STAFF` or active `ADMINISTRATOR` user. New tickets are unassigned (`assignedStaffId = null`, displayed as "Unassigned"). Assigning to non-staff/inactive accounts returns `HTTP 400 Bad Request`.
- **BR-13 (IT Priority Decoupling)**: `requestedPriority` is set by the Requester on creation and is read-only. `itPriority` initially copies `requestedPriority` upon creation (`BR-17`) and can later be modified only by IT Staff.
- **BR-14 (State-Machine Status Transitions)**: Status transitions must strictly conform to the approved Status Transition Matrix. Invalid transitions return `HTTP 400 Bad Request`.
- **BR-15 (Comment & Note Validation)**: Public Comments (3–1000 characters), Internal Notes (3–2000 characters), and Problem Appears Resolved indications (3–1000 characters) must be non-empty, trimmed, and append-only. Whitespace-only or out-of-range text returns `HTTP 400 Bad Request`.
- **BR-16 (Safe Error & Existence Leak Prevention)**: Requests for unowned individual Requester resources (tickets, attachments) return `HTTP 404 Not Found` to prevent cross-Requester resource existence probing. Role violations return `HTTP 403 Forbidden`.
- **BR-17 (IT Priority Initialization)**: On ticket creation, the backend automatically initializes `itPriority` to match `requestedPriority`. Legacy text representation `UNASSIGNED` is replaced by `assignedStaffId = null`.
- **BR-18 (Legacy PENDING Migration)**: During database migration, legacy Lab 2 tickets with status `PENDING` are converted to `WAITING_FOR_REQUESTER` to conform with the Lab 3 status enum.
- **BR-19 (Resolution Summary Option)**: When transitioning a ticket status to `RESOLVED`, an optional `resolutionSummary` string (up to 1000 characters) may be provided to record resolution details.
- **BR-20 (Soft-Removed Attachment History & Visibility)**: Soft-removed attachments (`isRemoved = true`) remain preserved in the database with `removalReason` (5–250 chars) and `removedAt` timestamp. Attachment lists return soft-removed metadata marked as `[Soft-Removed]`, but direct file downloads return `HTTP 410 Gone`.
- **BR-21 (Backend-Generated Authorship and Timestamps)**: Authorship (`authorId`) for Public Comments and Internal Notes comes strictly from the authenticated session user on the backend. Client-supplied `authorId` values are rejected or ignored. Creation timestamps (`createdAt`) are generated by the server.
- **BR-22 (Comment and Internal Note Safe Rendering)**: All Public Comments and Internal Notes rendered in the user interface must be safely rendered/escaped (e.g., HTML entity encoding or React JSX automatic string escaping) to prevent Cross-Site Scripting (XSS) attacks.

## 7. UI Specification Summary

The application shell and new screens reuse the **Zen Green Design System**:

- **Application Header**: Dark green navbar (`#006B3C`) displaying TokTickIT logo, role-specific navigation links, and active profile pill with user name, role badge (`Requester`, `IT Staff`, `Admin`), Change Password action, and Logout button.
- **Login Screen**: Centered card (`max-width: 440px`) with email/password inputs, validation, busy state spinner, and safe `401` error feedback.
- **Change Password Screen**: Centered card (`max-width: 520px`) with temporary password, new password, confirmation, dynamic password rules checklist, and save action.
- **Requester Workspace**: Authenticated Create Ticket form (2-col grid desktop `≥ 992px`, 1-col mobile `< 768px`), My Tickets list, and Ticket Detail view with Public Comments feed and "Problem Appears Resolved" trigger.
- **IT Staff Ticket Queue**: Responsive data table (desktop `≥ 992px`) / card list (mobile `< 768px`) supporting search, filters (Category, IT Priority, Status, Assigned Owner), sorting, pagination, empty state, and no-results feedback.
- **IT Staff Ticket Detail**: Operational dashboard (side-by-side desktop `≥ 992px`, stacked mobile `< 768px`) with loading spinner, saving feedback for claiming/reassignment, IT Priority selection, status updates (optional `resolutionSummary`), Public Comments feed, private Internal Notes tab (`#FEF3C7` amber shading), and attachment viewer with soft-removed history.
- **Administrator User Management**: Responsive list table (desktop `≥ 992px`, card list mobile `< 768px`) of users with name/email search, role filter, Create User modal, Edit User modal, Reset Password modal, busy spinners, success alerts, `409 Conflict` feedback, and Admin safety rules enforcement.

## 8. Data Changes & Seed Contract

### 8.1 Models & Schema Design

- **`User` Model**: `id`, `name`, `email` (unique), `passwordHash`, `role` (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), `mustChangePassword` (`Boolean`), `isActive` (`Boolean`), `createdAt`, `updatedAt`.
- **`Ticket` Model Extensions**: `assignedStaffId` (optional FK to `User`), `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `resolutionSummary` (`String?`), and expanded `TicketStatus` enum (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- **`Comment` Model**: `id`, `content`, `ticketId`, `authorId`, `createdAt`.
- **`InternalNote` Model**: `id`, `content`, `ticketId`, `authorId`, `createdAt`.
- **`Attachment` Model Extensions**: `isRemoved` (`Boolean`), `removalReason` (`String?`), `removedAt` (`DateTime?`). Permitted file formats: JPG/JPEG, PNG, WEBP, PDF (max 5 MB).

### 8.2 Database Migration Strategy

- `DevelopmentRequester` records evolved into `User` records with `role = REQUESTER`, hashed initial password (`Initial123!`), and `mustChangePassword = true`.
- Foreign key `tickets.requesterId` maps directly to `users.id`, guaranteeing zero data loss.
- Legacy `PENDING` tickets converted to `WAITING_FOR_REQUESTER`.
- `itPriority` populated with `requestedPriority` value for all existing tickets.

### 8.3 Required Seed Data Contract (`prisma/seed.ts`)

The seed script must be idempotent and safe to run repeatedly:

- **Active Requesters (4)**: `jennifer.a@toktickit.local`, `michael.b@toktickit.local`, `sarah.j@toktickit.local`, `david.l@toktickit.local` (Password: `Initial123!`).
- **Inactive Requester (1)**: `inactive.req@toktickit.local` (`isActive = false`).
- **Active IT Staff (3)**: `alex.t@toktickit.local`, `kevin.p@toktickit.local`, `emily.d@toktickit.local` (Password: `Initial123!`).
- **Inactive IT Staff (1)**: `inactive.staff@toktickit.local` (`isActive = false`).
- **Active Administrator (1)**: `admin@toktickit.local` (Password: `Initial123!`).
- **Seeded Tickets**: Distributed across Requesters, statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`), priorities, and assigned (`assignedStaffId`) vs unassigned (`null`) ownership. Includes sample non-sensitive Public Comments and Internal Notes.
- **Disclaimer**: Seed credentials and initial password (`Initial123!`) are strictly for local development and testing environments and must never be used in production.

### 8.4 Database Index & Constraint Specification

- **Unique User Email Index**: Unique case-insensitive index on `User.email`.
- **Ticket Requester Lookup Index**: Index on `Ticket.requesterId` for fast Requester ticket listing.
- **Ticket Owner Lookup Index**: Index on `Ticket.assignedStaffId` for staff queue filtering.
- **Ticket Status & Priority Index**: Composite/single indexes on `Ticket.currentStatus` and `Ticket.itPriority` for queue queries.
- **Comment Ticket Lookup Index**: Index on `Comment.ticketId` for comment feed retrieval.
- **Internal Note Ticket Lookup Index**: Index on `InternalNote.ticketId` for internal notes retrieval.

## 9. API Contract Summary

| Endpoint                              | Method        | Permitted Roles           | Description                                                                     |
| ------------------------------------- | ------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `/api/auth/login`                     | `POST`        | Public                    | Authenticate user credentials & establish session cookie                        |
| `/api/auth/logout`                    | `POST`        | All Authenticated         | Invalidate session cookie                                                       |
| `/api/auth/me`                        | `GET`         | All Authenticated         | Retrieve current user profile & role                                            |
| `/api/auth/change-password`           | `POST`        | All Authenticated         | Change initial or current password                                              |
| `/api/categories`                     | `GET`         | All Authenticated         | Retrieve active Ticket Categories                                               |
| `/api/related-systems`                | `GET`         | All Authenticated         | Retrieve active Related Systems                                                 |
| `/api/tickets`                        | `POST`        | Requester                 | Create a new ticket (initializes `itPriority = requestedPriority`)              |
| `/api/tickets`                        | `GET`         | Requester                 | List paginated owned tickets (search, filter, sort)                             |
| `/api/tickets/:id`                    | `GET`         | Requester (Owner)         | Retrieve owned ticket detail (Unowned returns 404)                              |
| `/api/tickets/:id/attachments`        | `POST`        | Requester (Owner)         | Upload attachment (JPG/JPEG/PNG/WEBP/PDF ≤ 5MB)                                 |
| `/api/tickets/:id/attachments`        | `GET`         | Requester / Staff / Admin | Retrieve attachment metadata list (includes soft-removed history)               |
| `/api/attachments/:id/download`       | `GET`         | Owner / Staff / Admin     | Download active attachment file (Soft-removed returns 410 Gone)                 |
| `/api/attachments/:id/soft-remove`    | `POST`        | Requester (Owner)         | Soft-remove attachment with mandatory reason                                    |
| `/api/tickets/:id/comments`           | `GET`, `POST` | Owner / Staff / Admin     | Retrieve and post Public Comments (3–1000 chars, backend authorship)            |
| `/api/tickets/:id/indicate-resolved`  | `POST`        | Requester (Owner)         | Post public comment indicating resolution intent (3–1000 chars)                 |
| `/api/staff/tickets`                  | `GET`         | IT Staff / Admin          | Search, filter, sort, and paginate Ticket Queue (Admin read oversight)          |
| `/api/staff/tickets/:id`              | `GET`         | IT Staff / Admin          | Retrieve IT Staff ticket detail dashboard (Admin read oversight)                |
| `/api/staff/tickets/:id/assign`       | `PATCH`       | IT Staff                  | Claim or reassign ticket ownership to active Staff or Admin (`assignedStaffId`) |
| `/api/staff/tickets/:id/priority`     | `PATCH`       | IT Staff                  | Update IT Priority (`itPriority`)                                               |
| `/api/staff/tickets/:id/status`       | `PATCH`       | IT Staff                  | Update status per matrix (captures optional `resolutionSummary` for `RESOLVED`) |
| `/api/staff/tickets/:id/notes`        | `GET`, `POST` | IT Staff / Admin          | Retrieve and create private Internal Notes (3–2000 chars, backend authorship)   |
| `/api/admin/users`                    | `GET`, `POST` | Administrator             | List users (search/filter) & create user (409 on duplicate email)               |
| `/api/admin/users/:id`                | `PATCH`       | Administrator             | Edit user name, email, role, or active status (409 on duplicate)                |
| `/api/admin/users/:id/reset-password` | `POST`        | Administrator             | Set new initial password for user (`mustChangePassword = true`)                 |

## 10. Acceptance Criteria

- [x] **AC-01**: Given active user with valid credentials, when submitting login, backend establishes session cookie and returns user profile with role.
- [x] **AC-02**: Given invalid credentials or inactive user account (`isActive = false`), when submitting login, backend returns `HTTP 401 Unauthorized` with safe error feedback.
- [x] **AC-03**: Given user with `mustChangePassword = true`, when login succeeds, standard API endpoints return `HTTP 403 Forbidden` (`MUST_CHANGE_PASSWORD`) until a new valid password is saved.
- [x] **AC-04**: Given logged-in user changing initial password, when submitting valid new password, `mustChangePassword` becomes `false` and app opens.
- [x] **AC-05**: Given authenticated user, when clicking Logout, session cookie is invalidated and user is redirected to login.
- [x] **AC-06**: Given authenticated Requester, ticket creation and listing derive identity strictly from session cookie, ignoring client headers.
- [x] **AC-07**: Given migrated Lab 2 database, existing tickets and attachments remain intact, owned by migrated Requesters, with legacy `PENDING` status converted to `WAITING_FOR_REQUESTER`.
- [x] **AC-08**: Given Requester or IT Staff, submitting non-empty Public Comment (3–1000 chars) saves comment with backend-determined author role badge.
- [x] **AC-09**: Given Requester viewing owned ticket, clicking "Problem Appears Resolved" appends public resolution comment (3–1000 chars) without setting status to `RESOLVED` directly.
- [x] **AC-10**: Given IT Staff fetching `GET /api/staff/tickets`, queue returns all system tickets with search, filter, sort, and pagination metadata.
- [x] **AC-11**: Given IT Staff searching queue (`search=laptop` or `itPriority=HIGH`), queue returns matching tickets.
- [x] **AC-12**: Given unassigned ticket, IT Staff clicking "Claim Ticket" updates `assignedStaffId` to staff member's ID.
- [x] **AC-13**: Given ticket detail, IT Staff selecting another active IT Staff or Administrator user updates `assignedStaffId`.
- [x] **AC-14**: Given IT Staff updating `itPriority` to `HIGH`, `itPriority` updates in DB while `requestedPriority` stays intact.
- [x] **AC-15**: Given ticket with status `NEW`, IT Staff updating status to `OPEN` or `IN_PROGRESS` succeeds per transition matrix.
- [x] **AC-16**: Given ticket with status `CANCELLED`, IT Staff updating status to `OPEN` fails with `HTTP 400 Bad Request`.
- [x] **AC-17**: Given IT Staff or Administrator creating Internal Note (3–2000 chars), note is saved with backend authorship and visible ONLY to Staff & Admin (`HTTP 403` for Requester).
- [x] **AC-18**: Given Administrator fetching `GET /api/admin/users`, user list is returned with Name, Email, Role, Status, and Edit controls.
- [x] **AC-19**: Given Administrator searching users (`search=jennifer` or `role=IT_STAFF`), matching user list is returned.
- [x] **AC-20**: Given Administrator creating valid new user, account is saved with `mustChangePassword = true` and HTTP 201 Created.
- [x] **AC-21**: Given Administrator creating/editing user with existing email, request fails with `HTTP 409 Conflict`.
- [x] **AC-22**: Given Administrator attempting to deactivate own account, action fails with `HTTP 400 Bad Request`.
- [x] **AC-23**: Given only 1 active Administrator in system, deactivating or demoting account fails with `HTTP 400 Bad Request`.
- [x] **AC-24**: Given Administrator resetting user password, new initial password is saved and `mustChangePassword` is set to `true`.
- [x] **AC-25**: Given Requester or IT Staff calling `/api/admin/users`, API returns `HTTP 403 Forbidden`.
- [x] **AC-26**: Given major screens viewed on Desktop (1280px), Tablet (800px), and Mobile (390px), controls remain operable without horizontal scrolling, meeting WCAG 2.1 AA focus ring standards.

## 11. Definition of Done

### Part 1: Product Completion

- [x] All functional requirements (FR-01 to FR-22) and business rules (BR-01 to BR-22) implemented and verified.
- [x] Authentication, session persistence, logout, and password hashing (`bcrypt`) implemented and tested.
- [x] Mandatory first-login password change enforced for initial password accounts (`BR-02`).
- [x] Server-side role-based authorization middleware enforcing Requester, IT Staff, and Administrator permissions.
- [x] Database evolved via Prisma without loss of Lab 2 ticket/attachment data, seeded idempotently.
- [x] Lab 2 Requester features fully regression-tested under authenticated context.
- [x] Public Comments feed and "Problem Appears Resolved" indication trigger implemented.
- [x] IT Staff Ticket Queue implemented with search, filtering, sorting, pagination, and responsive presentation.
- [x] IT Staff Ticket Detail operations implemented: ticket claiming, staff/admin reassignment, IT Priority management, state-machine status transitions (capturing optional `resolutionSummary` for `RESOLVED`), and private Internal Notes (`BR-04`).
- [x] Administrator User Management implemented: user listing, search/filter, account creation, editing, status toggling, initial password reset, `409 Conflict` duplicate handling, and Admin safety rules (`BR-07`–`BR-10`).
- [x] Safe failure feedback, sanitized 500 banners, and 401/403/404/409/410 security responses verified.
- [x] Responsive UI verified on Desktop (1280px), Tablet (800px), and Mobile (390px) without horizontal scrollbars.
- [x] All planned unit, API, UI, security, and Playwright E2E tests passing clean on `main`.

### Part 2: Course Delivery Requirements

- [x] **Specification & Test Planning Pre-Implementation Traceability**: Initial Sprint Specification and Test Planning contract files (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`) are explicitly committed and merged on branch `feature/10-contract-testplan` targeting `lab3-staging` via PR #10 before implementation feature branches are merged.
- [x] **Sequential Issue Naming**: GitHub Issues continue directly from Lab 2 (#1 through #9) starting at Issue #10 through Issue #17:
  - Issue #10: `[Lab 3] Sprint 3 Engineering Contract & Test Plan` (`feature/10-contract-testplan`)
  - Issue #11: `[Lab 3] User Migration & Authentication Foundation` (`feature/11-auth-foundation`)
  - Issue #12: `[Lab 3] Mandatory First-Login Password Change` (`feature/12-first-login-password`)
  - Issue #13: `[Lab 3] Server-Side Authorization & Application Shell` (`feature/13-rbac-app-shell`)
  - Issue #14: `[Lab 3] Requester Regression, Public Comments & Resolution Indication` (`feature/14-requester-comments`)
  - Issue #15: `[Lab 3] IT Staff Ticket Queue & Ticket Operations` (`feature/15-staff-queue-operations`)
  - Issue #16: `[Lab 3] Administrator User Management` (`feature/16-admin-user-management`)
  - Issue #17: `[Lab 3] E2E, Responsive Verification & Release` (`feature/17-e2e-release`)
- [x] **Strict Branching**: All feature branches are created from `lab3-staging` and open PRs targeting `lab3-staging` (never branch directly from or merge to `main`).
- [x] **Peer Review & Approvals**: All PRs reviewed, approved, and recorded in `docs/lab-03/reviewer.md` with reviewer identity, PR links, comments, responses, and approvals.
- [x] **AI Use Record**: `docs/lab-03/ai-use.md` completed with selected key prompts and reflection.
- [x] **Required Contract Documents**: `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md` present in `docs/lab-03/`.
- [x] **Final Release PR**: One final release PR merged from `lab3-staging` into `main` after integration testing.
- [x] **PDF Submission Evidence**: Required single Lab 3 submission PDF compiled with Answer Part 1 through Answer Part 9.

## 12. Assumptions and Technical Decisions

1. **Authentication & Session Strategy**: Server-side session authentication using Express `express-session` (stored in-memory or database session store) where the signed HTTP-Only cookie (`toktickit_session`) identifies the session ID, while active user session state is stored and maintained server-side with an 8-hour expiration. `SameSite = strict` enforcement; `X-Requested-With: XMLHttpRequest` required on state-mutating requests (`POST`, `PATCH`). Session secret loaded from environment variable `SESSION_SECRET`.
2. **Accessible Endpoints during First-Login Lock**: Users with `mustChangePassword = true` may only request `POST /api/auth/change-password`, `POST /api/auth/logout`, and `GET /api/auth/me`. All other routes return `HTTP 403 Forbidden` (`MUST_CHANGE_PASSWORD`).
3. **Password Hashing & Complexity**: `bcrypt` with 10 salt rounds. Passwords require min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character (`!@#$%^&*`).
4. **Existence Leak Prevention**: Requesting unowned individual Requester resources (e.g. `GET /api/tickets/:id`) returns `HTTP 404 Not Found` rather than `403` to prevent probing resource existence.
5. **Conflict Response Code**: Duplicate email creation or editing attempts return `HTTP 409 Conflict` with code `EMAIL_ALREADY_EXISTS`.
6. **Comment & Note Validation & Rendering**: Public Comments (3 to 1000 chars); Internal Notes (3 to 2000 chars); Problem Appears Resolved comments (3 to 1000 chars). All append-only, whitespace-trimmed, non-empty, with backend-generated `authorId` and server timestamp. All rendered comment and note content must be safely escaped/sanitized (`BR-22`).
7. **Resolution Summary Option**: Transitioning ticket status to `RESOLVED` accepts an optional `resolutionSummary` (up to 1000 chars) to record resolution details.
8. **Attachment History Retention**: Soft-removed attachments (`isRemoved = true`) are preserved in database history with `removalReason` (5–250 chars) and `removedAt` timestamp. Permitted attachment formats: JPG/JPEG, PNG, WEBP, PDF (max 5 MB). Direct download attempts return `HTTP 410 Gone`.
