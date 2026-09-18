# TokTickIT Lab 3 — Zen Green UI Specification

## 1. Design System Overview & Color Tokens

Lab 3 extends the **Zen Green Design System** established in Lab 2. All existing color tokens, typography scales, spacing multipliers, and accessibility focus indicators remain in full force.

### Color Tokens Table

| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| **Primary Green** | `#006B3C` | App header, primary buttons (`.btn-zen-primary`), active pagination page, main branding |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, focus accents, interactive links, hover states |
| **Pale Green** | `#EAF6EF` | Success callouts, info background, `NEW`, `RESOLVED`, `IN_PROGRESS` status badges |
| **Page Background** | `#F5F7F6` | Quiet near-white page body background |
| **Surface / Cards** | `#FFFFFF` | Card surfaces with subtle `#E2E8F0` border |
| **Text Primary** | `#1E2923` | Body text (high contrast dark charcoal green) |
| **Text Muted** | `#64748B` | Labels, timestamps, secondary metadata, disclaimers |
| **Read-Only Surface** | `#F1F5F3` | Quiet shading for system-generated, read-only field backgrounds |
| **Error / Destructive**| `#D92D20` | Error messages, invalid input borders, high priority badges, error banners |
| **Warning / Amber** | `#FEF3C7` / `#D97706` | Medium priority badge, `WAITING_FOR_REQUESTER` status badge, Internal Notes background |
| **Info / Blue** | `#EFF6FF` / `#2563EB` | `OPEN` status badge, role badges for IT Staff |
| **Purple Accent** | `#F3E8FF` / `#7E22CE` | Role badge for Administrator (`ADMINISTRATOR`) |

---

## 2. Authenticated Application Shell & Navigation

- **Application Header**: Dark green navbar (`#006B3C`) spanning 100% width (`FR-07`).
  - Left: **TokTickIT** branding logo.
  - Center: **Role-Specific Navigation Links**:
    - **Requester**: `My Tickets` | `Create Ticket`
    - **IT Staff**: `Ticket Queue`
    - **Administrator**: `User Management`
  - Right: **User Profile Pill**:
    - Displays user name alongside a **Role Badge** (`Requester`, `IT Staff`, or `Admin`).
    - Clicking pill opens menu with: **Change Password** action and **Logout** action (`FR-05`).

---

## 3. Required Screen Specifications & Meaningful States

### 3.1 Login Screen (`/login`)
- **Permitted Roles**: Public / Unauthenticated (`FR-01`).
- **Controls**: Email input, Password input, Password visibility toggle, **Sign In** button.
- **Editable Fields**: Email, Password.
- **Read-Only Fields**: None.
- **Loading / Busy State**: Sign In button disabled with spinner (`"Signing in..."`).
- **Validation Feedback**: Inline red messages below invalid email formats.
- **Success Feedback**: Immediate transition to Password Change screen (if `mustChangePassword = true`) or role dashboard.
- **Failure States**: `HTTP 401` displays top red banner: *"Invalid email or password. Please try again."* without exposing account active state (`BR-01`, `AC-02`). `HTTP 500` displays generic server error banner.
- **Responsive & Accessibility**: Centered card (`max-width: 440px`), full WCAG focus rings (`2px solid #0B7A46`).

---

### 3.2 Mandatory Change Password Screen (`/change-password`)
- **Permitted Roles**: Authenticated users with `mustChangePassword = true` (`BR-02`, `FR-03`).
- **Controls**: Current Password, New Password, Confirm New Password, Password rules checklist, **Save New Password** button.
- **Editable Fields**: Current Password, New Password, Confirm New Password.
- **Read-Only Fields**: Informational banner *"You must change your password to continue."*
- **Loading State**: Save button disabled with inline spinner (`"Saving password..."`).
- **Validation Feedback**: Dynamic checklist checking min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (`!@#$%^&*`). Red inline error if passwords do not match.
- **Success Feedback**: Green success callout and redirection to main workspace (`AC-04`).
- **Failure States**: `HTTP 400` displays inline validation errors; `HTTP 401` current password incorrect banner; `HTTP 500` server error banner.
- **Responsive**: Centered card surface (`max-width: 520px`).

---

### 3.3 Requester Create Ticket Screen (`/tickets/new`)
- **Permitted Roles**: `REQUESTER` (`FR-09`).
- **Controls**: Category select, Related System select, Requested Priority select, Summary input, Description textarea, File dropzone (permitted formats: JPG/JPEG, PNG, WEBP, PDF; ≤ 5 MB), **Submit Ticket** button.
- **Editable vs Read-Only**: Inputs editable. Ticket Number placeholder (`TKT-2026-XXXXXX`) and Created Date read-only (`#F1F5F3`).
- **Loading State**: Category/System dropdowns show spinner during fetch. Submit button displays spinner (`"Submitting..."`).
- **Validation Feedback**: Inline red error messages directly below affected controls (e.g. summary < 5 chars, description < 10 chars).
- **Failure States**: `HTTP 500` displays top red banner: *"Failed to submit ticket. Please try again."* while preserving typed form fields and selected dropdowns.
- **Responsive Layout**:
  - **Desktop (≥ 992px)**: 2-column form grid for dropdowns, full-width textareas, right sidebar guidance card.
  - **Tablet (768px–991px)**: 2-column layout collapsing sidebar below form.
  - **Mobile (< 768px)**: 1-column stacked form, min 44px touch targets, zero page-level horizontal overflow.

---

### 3.4 Requester My Tickets Workspace (`/tickets`)
- **Permitted Roles**: `REQUESTER` (`FR-09`).
- **Controls**: Search bar, Category filter, Priority filter, Status filter, Sort selector, Pagination controls (`Prev`/`Next`), **Clear Filters** button.
- **Loading State**: Table skeleton lines or centered spinner while fetching tickets.
- **Empty State**: Graphic and message *"You have not submitted any IT support tickets yet."* with `[ + Create Ticket ]` action button.
- **No-Results State**: Graphic and message *"No matching tickets found."* with `[ Clear Filters ]` button.
- **Failure States**: `HTTP 500` displays red alert banner: *"Unable to load tickets. Please refresh."*
- **Responsive Layout**:
  - **Desktop (≥ 992px)**: Full data table with Category, System, Priority, Status badges.
  - **Tablet (768px–991px)**: Scroll-safe table with essential columns.
  - **Mobile (< 768px)**: Stacked card list view with full-width card touch area, zero horizontal scrollbar.

---

### 3.5 Requester Ticket Detail Screen (`/tickets/:id`)
- **Permitted Roles**: `REQUESTER` (Must own ticket).
- **Controls**: **Back to My Tickets** button, Attachment Upload & Soft Remove controls, **Public Comments Feed**, **Post Comment** form, **Problem Appears Resolved** button (`FR-10`, `FR-11`).
- **Interactive Behavior**:
  - Clicking "Problem Appears Resolved" appends public resolution comment (3–1000 chars) without changing status to `RESOLVED` directly (`BR-05`, `AC-09`).
  - Posting Public Comment validates 3–1000 characters; whitespace-only rejected with inline error (`BR-15`).
  - Soft-removed attachments display in attachment history as `[Soft-Removed]` with removal reason and timestamp (`BR-20`).
- **Failure States**: Requesting unowned ticket returns `HTTP 404 Not Found` screen: *"Ticket not found."* (`BR-16`). `HTTP 500` displays top API failure banner.
- **Responsive Layout**:
  - **Desktop (≥ 992px)**: 2-column layout (left: ticket info & comments; right: metadata, priority & attachments).
  - **Tablet (768px–991px)**: Stacked metadata block above comments.
  - **Mobile (< 768px)**: 1-column stacked card sections, zero horizontal overflow.

---

### 3.6 IT Staff Ticket Queue Screen (`/staff/tickets`)
- **Permitted Roles**: `IT_STAFF`, `ADMINISTRATOR` (Read oversight) (`FR-12`, `AC-10`).
- **Controls**: Search input (ticket #, summary, description), Category filter, IT Priority filter, Status filter, Owner filter, Sort dropdown, Pagination controls.
- **Desktop Grid (≥ 992px)**: Table columns: Ticket #, Created Date, Summary, Category, Requested Priority, IT Priority, Status, Owner (`assignedStaff`), Actions (`[ Open Detail ]`).
- **Mobile Grid (< 768px)**: Stacked cards with priority badges, status badge, and full-width `[ Open Detail ]` button.
- **Loading State**: Skeleton table rows during fetch.
- **Empty Queue State**: *"No IT support tickets in queue."*
- **No-Results State**: *"No tickets match your filter criteria."* with `[ Clear Filters ]` action (`AC-11`).
- **Failure States**: Requester accessing `/staff/tickets` sees red forbidden screen: *"Access Denied: IT Staff authorization required."* (`HTTP 403`, `AC-25`). `HTTP 500` displays server failure banner.

---

### 3.7 IT Staff Ticket Detail Screen (`/staff/tickets/:id`)
- **Permitted Roles**: `IT_STAFF` (Full operational edit access), `ADMINISTRATOR` (Read oversight access) (`FR-13`–`FR-16`).
- **Header & Info Block**: Read-only Ticket #, Created Date, Requester Name/Email, Category, System, Summary, Description, and `resolutionSummary` (when resolved).
- **Operational Toolbar (IT Staff Only)**:
  - **Ownership Control**: `[ Claim Ticket ]` button (if unassigned) or staff selector dropdown showing active IT Staff and active Administrators (`FR-13`, `BR-12`, `AC-12`, `AC-13`).
  - **IT Priority Control**: Dropdown (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) initialized to `requestedPriority` (`BR-13`, `BR-17`, `AC-14`).
  - **Status Transition Control**: State-machine dropdown allowing valid transitions (`NEW` → `OPEN`/`IN_PROGRESS`, etc. `BR-14`, `AC-15`). Selecting `RESOLVED` permits adding an optional `resolutionSummary` (up to 1000 chars) (`BR-19`). Confirmation modal shown for `CANCELLED` or `REOPENED`.
- **Busy & Success States**:
  - Claim/Reassign, Priority update, and Status transition buttons show inline spinners during API request.
  - Successful updates display a top green callout banner: *"Ticket updated successfully."*
- **Tabbed Activity Section**:
  - **Public Comments Tab**: Green badge count. Renders public feed and comment box (3–1000 chars) (`FR-10`, `AC-08`). All comment content is safely rendered/escaped to prevent XSS (`BR-22`).
  - **Internal Notes Tab**: Amber `#FEF3C7` background. Renders private staff notes feed and note box (3–2000 chars) (`FR-16`, `AC-17`). Visible and writable by Staff and Admin. All internal note content is safely rendered/escaped to prevent XSS (`BR-22`).
  - **Attachments Tab**: List of requester attachments (including soft-removed history marked `[Soft-Removed]` with removal reason) (`BR-20`). Active attachments include download links.
- **Failure States**:
  - `HTTP 400` invalid status transition displays red alert banner: *"Invalid status transition."* (`AC-16`).
  - `HTTP 400` invalid assignment target displays red alert: *"Cannot assign ticket to selected account."* (`BR-12`).
  - Requester calling Staff Detail API sees `HTTP 403 Forbidden` screen (`AC-25`). `HTTP 500` displays server failure banner.
- **Responsive Layout**:
  - **Desktop (≥ 992px)**: 2-column dashboard (left: detail, comments & notes; right: operational controls & attachments).
  - **Tablet (768px–991px)**: Operational control panel stacked above tabbed feeds.
  - **Mobile (< 768px)**: 1-column stacked layout, full-width touch buttons, zero horizontal overflow.

---

### 3.8 Administrator User Management Screen (`/admin/users`)
- **Permitted Roles**: `ADMINISTRATOR` (`FR-17`–`FR-22`, `AC-18`).
- **Header Toolbar**: Title "User Management", Search bar (Name/Email), Role filter (`All`, `Requester`, `IT Staff`, `Admin`), `[ + Create User ]` button (`AC-19`).
- **User List Table**: Columns: Name, Email, Role Badge (`Requester`, `IT Staff`, `Admin`), Activation Status (`Active` / `Inactive`), Actions (`[ Edit ]`, `[ Reset Password ]`).
- **Create User Modal**: Name input, Email input, Role select (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), Activation toggle, Initial Password input (`FR-19`, `AC-20`).
- **Edit User Modal**: Editable Name, Email, Role, Activation toggle (`FR-20`).
- **Reset Password Modal**: New initial password input, save button (`FR-21`, `AC-24`).
- **Busy & Success States**:
  - Modals show busy spinners on save buttons during creation, editing, or password resets.
  - Successful user creation/edit displays top green toast banner: *"User account updated successfully."*
- **Failure States**:
  - `HTTP 409 Conflict` duplicate email returns red inline alert: *"A user account with this email address already exists."* (`BR-07`, `AC-21`).
  - `HTTP 400 Bad Request` self-deactivation shows warning: *"You cannot deactivate your own account."* (`BR-09`, `AC-22`).
  - `HTTP 400 Bad Request` last-admin removal shows warning: *"Cannot deactivate the only active Administrator account."* (`BR-10`, `AC-23`).
  - Non-Admin accessing `/admin/users` sees red forbidden screen: *"Access Denied: Administrator authorization required."* (`HTTP 403`, `AC-25`). `HTTP 500` displays server failure banner.
- **Responsive Layout**:
  - **Desktop (≥ 992px)**: Full user table with inline status pills and action buttons.
  - **Tablet (768px–991px)**: Condensed table layout.
  - **Mobile (< 768px)**: User card list view with stacked details and touch action buttons, zero horizontal overflow.
