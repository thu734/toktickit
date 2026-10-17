# Lab 4 - REST API Contract

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** D-01 through D-16 explicitly approved by the user on 2026-10-15; documentation review and baseline verification remain separate; no Lab 4 implementation.
**Source:** CPE 334 Lab 4 handout, SE+Lab+4.pdf, all 11 pages, reviewed 2026-10-15.

**Provenance:** R = required by Lab 4; I = inherited from Labs 1-3; A = user-approved implementation choice, not a handout mandate.
A combined label separates the required capability from its user-approved implementation details.
Approval evidence: the user explicitly approved the final D-01 through D-16 choices in this session on 2026-10-15. This approval does not authorize implementation, database changes or release.

## 1. Contract Status and Inherited Conventions

This is the user-approved future API contract, not an implemented API. D-01 through D-16 were explicitly approved on 2026-10-15; D-10/D-11 define required revision/request-key behavior.

I: retain session-cookie authentication, first-login password change lock, current account activity/role checks, CSRF treatment and existing Public Comment/Internal Note/Attachment rules. R: all writes are authorized by the backend; Admin receives IT Staff behavior in Lab 4. Do not change the authentication scheme or introduce external notification services.

## 2. Authorization Matrix

| Operation | Requester | IT Staff | Administrator | Basis / condition |
| --- | --- | --- | --- | --- |
| Read current Action lines | Owned Tickets only | Accessible Tickets | Accessible Tickets | R; all current lines visible, including cancellation under approved lifecycle |
| Create/edit Actions | Forbidden | Allowed | Allowed | R; validation/lifecycle A |
| Assign/complete/cancel Actions | Forbidden | Allowed | Allowed | R submission Part 6; target/state policy D-01/D-02 |
| Read audit-event history | No new history endpoint planned | No new history endpoint planned | No new history endpoint planned | D-05 minimal append-only events; no visible history feature |
| Requester Dashboard | Own metrics | Forbidden | Forbidden | R ownership; role exclusion A |
| Staff Dashboard | Forbidden | Allowed | Allowed | R role-appropriate scope; formulas A |
| Ticket operational writes | Forbidden | Allowed | Allowed | I Staff; R Lab 4 Admin extension; D-10 compatibility |
| Public Comments/resolution indication | Inherited owned behavior | Inherited permitted behavior | Inherited permitted behavior | I; Requester indication remains advisory |
| Internal Notes | Forbidden | Allowed | Allowed | I |
| User Management | Forbidden | Forbidden | Allowed | I |

Unauthenticated protected requests remain 401; first-password-locked requests remain subject to MUST_CHANGE_PASSWORD; authenticated role violations remain 403 (I). Missing or unowned protected resources return ownership-safe 404 using inherited safe error envelopes (D-15). The matrix does not claim that every existing route already matches it.

## 3. Approved Actions Endpoints (A/D-15)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/tickets/:ticketId/actions-taken` | Read authorized Action lines in approved stable order |
| POST | `/api/tickets/:ticketId/actions-taken` | Create one Action with server-derived attribution |
| PATCH | `/api/tickets/:ticketId/actions-taken/:actionId` | Apply approved field/assignment/status changes |

No deletion endpoint is included (A/D-05). Validate that actionId belongs to ticketId and that the caller can access the parent. Server-controlled actor and creation-time fields are immutable and never accepted as client identity (I/R).

### 3.1 Field Responsibilities

| Field | Required concept | Approved field responsibilities |
| --- | --- | --- |
| ticketId / Action ID | Parent-child relationship R | Server validates relation; parameter naming A |
| actionDateTime | Date/time R | Immutable server-generated creation time; no editable work-date field (D-04) |
| description | Action Description R | Trimmed, nonblank, maximum 2000 (D-06) |
| result | Result R | Maximum 2000; required for COMPLETED and CANCELLED (D-06) |
| performedBy | Automatic performer R | Immutable authenticated creator; subsequent actors only in D-05 minimal audit events |
| assignedTo | Assignment evidence R | Null allowed; otherwise active IT Staff/Admin, independent of owner/performer (D-02) |
| followUpRequired | Follow-up flag R | Boolean; true requires a trimmed nonblank Follow-up Note |
| followUpNote | Conditional note R | Trimmed, nonblank when flag true, maximum 1000 (D-06) |
| attachmentNotes | Attachment Notes R | Optional text referencing existing files, maximum 1000 (D-06) |
| status | Lifecycle operations R | PLANNED -> COMPLETED/CANCELLED; no terminal reopening (D-01) |
| workflowRevision | Conflict control R; field choice A | Expected single Ticket revision required for every Action/workflow mutation; 409 mismatch, new revision on success (D-10) |
| requestKey | Safe retries R | Per-operation creation key; identical replay returns original result, changed payload returns 409 (D-11) |
| createdAt / updatedAt / audit events | Stable/auditable behavior R | Events record Action ID, actor, timestamp, event type and changed fields; no full snapshots/history endpoint (D-05/D-16) |

These fields document the approved future contract; inherited payload conventions are retained. Return safe, bounded actor/assignee data, never credential hashes or private note content (I/R).

### 3.2 Validation and Lifecycle

D-06 fixes the validation bounds above; D-01/D-05/D-09 fix lifecycle and write restrictions in the [approved decision register](specification.md#111-approved-decision-register).
The approved COMPLETED correction allowlist is Result, Follow-Up Required, Follow-up Note and Attachment Notes. Authorized Staff/Admin corrections append a minimal actor audit event, retain COMPLETED status and cannot alter performer or creation time. Enforce existing validation and atomic gate evaluation; clearing follow-up removes that completed Action's blocker. D-09 forbids all Action writes on RESOLVED/CLOSED/CANCELLED parent Tickets, including corrections; reopen RESOLVED/CLOSED first. CANCELLED Actions have no approved correction exception. No snapshots, history browser or separate actor-history system is introduced.
Do not silently add Action attachment uploads, deletion, owner-only performer restrictions or administrative approval workflows.

## 4. Ticket Workflow Extension

Continue existing Ticket endpoints (I). Lab 4 expands Staff operations to Administrator (R) and adds the approved resolution/conflict rule (R/A). Every Ticket workflow and Action mutation sends the expected Ticket workflow revision; success returns the new revision and mismatch returns 409. Preserve other inherited fields/envelopes. Non-workflow APIs do not require this token.
Approved concurrency boundary (A): parent Ticket serialization/single-workflow-revision validation, then Action gate check and workflow update in the same transaction, with atomic audit writes. An Action update simultaneously becoming unfinished must not slip past resolution. The transaction must atomically validate/increment the single revision and enforce the gate; implementation is outside Issue 18.
Both RESOLVED and CLOSED transitions recheck the gate: PLANNED Actions and COMPLETED Actions with Follow-Up Required true block; CANCELLED and zero Actions do not.
Requester Problem Appears Resolved retains its existing Public Comment behavior and cannot set RESOLVED/CLOSED (I/R).

### 4.1 Issue 22 Implemented Workflow Payloads and Errors

Existing PATCH `/api/staff/tickets/:id/assign`, `/priority`, and `/status` accept the
inherited operation fields plus mandatory nonnegative integer `workflowRevision`.
Both IT_STAFF and ADMINISTRATOR are authorized. Successful responses remain updated
Ticket objects with incremented `workflowRevision`; no new mutation route is added.

- Invalid/missing revision: 400 `INVALID_WORKFLOW_REVISION`.
- Invalid transition, including same-state: 400 `INVALID_STATUS_TRANSITION`.
- Invalid owner target: 400 `INVALID_ASSIGNMENT_TARGET`.
- Invalid priority or resolution summary: 400 `INVALID_IT_PRIORITY` / `INVALID_RESOLUTION_SUMMARY`.
- Missing Ticket: 404 `RESOURCE_NOT_FOUND`; role violations remain 403 before resource disclosure.
- Revision mismatch: 409 `STALE_REVISION`, with refresh guidance.
- Outstanding-work gate: 409 `RESOLUTION_BLOCKED`, with safe `blockingWork: { planned, followUp }`
  counts and guidance to review Actions Taken. No private content or extra resource data is returned.

Owner/priority/status changes and Action mutations serialize on the same parent row.
Resolution/closure check current Action fields inside the workflow transaction.
Failures leave Ticket status/revision and existing Action/audit/retry evidence unchanged.
Action GET returns its list and revision from one consistent database snapshot.
Requester advisory resolution, comments, notes and attachments do not require workflow revisions.

## 5. Approved Dashboard Endpoints and Scope

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/api/dashboard/requester` | Authenticated Requester-owned data |
| GET | `/api/dashboard/staff` | Permitted Staff/Admin operational scope |

A/D-12/D-15 response envelope: asOf, documented counts, bounded Ticket/Action previews, and approved drill-down filters/destinations. Reuse inherited payload conventions. Never return full Ticket collections or calculate authoritative counts in the browser (R).
Calculate each response using a documented consistency policy and the approved common asOf. Approved calculations appear in [specification.md](specification.md#54-approved-dashboard-calculations).
Zero results return zero counts/empty lists; failures return safe errors, not false zero totals (R). D-12 uses current-state counts, five most recent Tickets without a date-window cutoff and one current-user Action preview. My Actions is PLANNED Actions assigned to the authenticated Staff/Admin; historical performed Actions are excluded. Recent Ticket ordering is updatedAt DESC, id DESC, scoped to owned Requester or accessible operational Staff/Admin Tickets; drill-down filters match the documented query. No separate Action version or dual assigned/performed dashboard summary is planned.

### 5.1 Initial Issue 23 Requester Dashboard Representation (history)

The initial three-count design below was approved before implementation and is retained as history.
The 2026-10-16 D-12-R1 approval extends it with the current seven-count representation in §5.3.

GET `/api/dashboard/requester` is Requester-only and derives ownership exclusively from the session.
Response: `asOf` (UTC ISO timestamp), `counts: { active, waitingForRequester, resolved }`,
`recentTickets` (at most five `{ id, ticketNumber, summary, currentStatus, updatedAt }` objects),
and `drillDowns` with `active`, `waitingForRequester`, and `resolved` entries.
Each entry has `destination: "my-tickets"` and `filters`: respectively `{ statusGroup: "active" }`,
`{ currentStatus: "WAITING_FOR_REQUESTER" }`, or `{ currentStatus: "RESOLVED" }`.
Recent Ticket IDs navigate through existing owned Ticket Detail.

All counts and previews share one read-only PostgreSQL Repeatable Read transaction.
Its first SELECT establishes the snapshot and reads PostgreSQL `transaction_timestamp()` as `asOf`.
This labels the read transaction; it is not a historical query cutoff or a resolution timestamp.
Counts use specification §5.4; recent ordering is updatedAt DESC, id DESC with no date window.
No full descriptions, Internal Notes, attachment paths, account secrets, or full Ticket collection are returned.
The endpoint accepts no identity override or configurable preview limit.
Session/account checks, first-password lock and 401/403 behavior are inherited; query failures return a safe 500 without counts.

### 5.2 Requester Dashboard Drill-down Filters

Existing GET `/api/tickets` additionally accepts `statusGroup=active`, applying the five approved active statuses
in the database before both counting and pagination. It is a filter group, never a Ticket status.
Omitted groups preserve existing behavior; unsupported/repeated groups return 400.
When combined with `currentStatus`, the predicates intersect. Ownership is always session-derived.
Waiting/resolved drill-downs use existing single-status filters. Dashboard navigation starts at page one,
updatedAt DESC (with inherited ID DESC tie-break), clearing unrelated filters.

### 5.3 D-12-R1 Current Requester Dashboard Representation (approved 2026-10-16)

The user explicitly approved the status-specific revision separately from the initial D-12 layout.
The same GET `/api/dashboard/requester` now returns `counts` and `drillDowns` entries for
`active`, `new`, `open`, `inProgress`, `waitingForRequester`, `resolved`, and `reopened`.
Existing `active`, `waitingForRequester` and `resolved` fields are retained; four exact-status fields are additive.

| Key | Backend currentStatus predicate | Drill-down filters |
| --- | --- | --- |
| active | IN NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED | `{ statusGroup: "active" }` |
| new | NEW | `{ currentStatus: "NEW" }` |
| open | OPEN only | `{ currentStatus: "OPEN" }` |
| inProgress | IN_PROGRESS | `{ currentStatus: "IN_PROGRESS" }` |
| waitingForRequester | WAITING_FOR_REQUESTER | `{ currentStatus: "WAITING_FOR_REQUESTER" }` |
| resolved | RESOLVED | `{ currentStatus: "RESOLVED" }` |
| reopened | REOPENED | `{ currentStatus: "REOPENED" }` |

Every count query is owner-scoped on the backend; all seven counts use the same read-only Repeatable Read
transaction as asOf and recentTickets. The backend Active count reconciles with the five active status counts.
All drill-down entries retain `destination: "my-tickets"`. No new endpoint, status, migration or client-side
count authority is introduced. Recent previews, five-item bound, fields, ordering, timestamp and error policy are unchanged.
A valid empty account returns zero for every count; a query failure returns a safe error without counts.

### 5.4 Issue 24 Staff/Admin Dashboard

GET `/api/dashboard/staff` permits current active IT_STAFF/ADMINISTRATOR sessions and retains the first-password lock.
Operational scope is the existing shared Staff/Admin Ticket Queue (all accessible Tickets, not owner-only).
Response: `asOf`, `counts: { unassignedActive, myActive, byStatus, byPriority }`, `recentTickets`, `myActions`, `drillDowns`.
Active means NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED. Unassigned requires null owner; myActive requires
owner = session user. Status/priority maps include all eight/four enum buckets, including zero, over all operational Tickets.

Recent previews select id, ticketNumber, summary, currentStatus, itPriority, updatedAt; limit five, updatedAt DESC/id DESC.
My Actions selects id, description, createdAt, status and parent Ticket id/number/status; limit five, createdAt ASC/id ASC.
Its predicate is assignedToId = session user AND status = PLANNED, independent of Ticket Owner and performer.
No extra terminal-parent filter is added. Previews open existing Ticket Detail; My Actions opens its Actions Taken area.
No Internal Notes, full Ticket descriptions, audit collections, private account fields or attachment paths are returned.

One read-only PostgreSQL Repeatable Read transaction provides all counts/previews and transaction_timestamp() as asOf.
No date-window cutoff or browser-authoritative count calculation. Forged identity/limit query parameters do not override scope/bounds.
Valid empty results return zero buckets/empty previews; failures return safe 500 without fabricated counts; 401/403/lock behavior is inherited.
`drillDowns.unassignedActive/myActive` describe ticket-queue filters with statusGroup=active and assignedStaffId=unassigned/me.
`drillDowns.byStatus/byPriority` describe matching currentStatus/itPriority filters for every bucket.
The existing GET `/api/staff/tickets` accepts `statusGroup=active` and `assignedStaffId=me`;
`me` resolves only from the authenticated session. Group and exact-status filters intersect before count/pagination.
Unknown status groups return 400. Existing unassigned/numeric-owner filters remain supported.
Dashboard destinations start at page one, updatedAt DESC/id DESC; clearing filters restores ordinary queue defaults.

## 6. Safe Error and Conflict Plan

| Condition | Inherited / approved behavior | Basis |
| --- | --- | --- |
| No authenticated session | 401 | I |
| Must change initial password | Existing MUST_CHANGE_PASSWORD lock | I |
| Forbidden role | 403 before disclosing protected contents | I/R |
| Invalid input | Existing validation convention; 400 and field errors | I/A |
| Missing/unowned resource | Uniform safe outcome; 404 for ownership-sensitive resources | I/R/A D-15 |
| Stale version | 409 with safe refresh guidance | R/A D-10 |
| Resolution blocked | 409 with permitted blocking-work summary | R/A D-07/D-15 |
| Same retry key, changed payload | 409 | R/A D-11 |
| Unexpected error | Generic safe server failure, no stack/SQL/secret details | I/R |

Do not expose a private Internal Note, credential hash or another Requester's resource existence in any error. The codes above are approved; reuse inherited safe response/error conventions. These contracts are not claims of implemented behavior.

## 7. Planned Verification and Compatibility

AC-01 through AC-22 map to API/security/workflow/migration/regression tests in [tests.md](tests.md). Existing Lab 3 Admin operational-denial expectations change only where Lab 4 explicitly grants the operation. Existing attachment, comment, note, login and user-management contracts remain inherited. Tests must cover mandatory expected revisions, new-revision responses, ownership-safe errors and inherited compatibility. For an authenticated, authorized identical creation replay, D-11 returns the original result without another mutation; a new mutation still requires the current revision and a writable Ticket. Changed-payload key reuse returns 409.
