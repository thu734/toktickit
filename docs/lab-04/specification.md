# Lab 4 - Sprint 4 Engineering Specification

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** D-01 through D-16 approved; Issue 19 storage/migration/seed foundation implemented for review. Action APIs/UI, Ticket workflow enforcement and dashboards are not implemented by Issue 19.
**Source:** CPE 334 Lab 4 handout, SE+Lab+4.pdf, all 11 pages, reviewed 2026-10-15.

**Provenance:** R = required by Lab 4; I = inherited from Labs 1-3; A = user-approved implementation choice, not a handout mandate.
A combined label separates the required capability from its user-approved implementation details.
Approval evidence: the user explicitly approved the final D-01 through D-16 choices in this session on 2026-10-15. This approval does not authorize implementation, database changes or release.

## 1. Sprint Goal

Complete the core service-desk workflow with Actions Taken, final Ticket rules, concise role dashboards and verified earlier-lab regression (R).

## 2. Stakeholder Request

Ticket Owner coordinates the Ticket; different Staff members may record work. Requester resolution indications remain advisory (R/I).

## 3. Scope

### 3.1 Included

Included future work (R): Actions Taken, assignment/edit/status/complete/cancel evidence, backend workflow enforcement, Requester/Staff/Admin dashboards, concurrency, migration/seed/recovery, final regression and accessibility.
Issue 18 established the documentation contract. Issue 19 implements only its data, migration, seed and persistence-test foundation; later issues implement API/UI/workflow/dashboard behavior.

### 3.2 Explicitly Excluded

Explicitly excluded by the Lab 4 handout (R, section 4.2):

- Automatic SLA clocks, escalation engines, on-call scheduling and breach notifications.
- Email, SMS, LINE, push and other external notification services.
- Inventory consumption, spare-parts management, purchasing and service cost accounting.
- Time-sheet billing, payroll and detailed labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Advanced business-intelligence tools, custom report builders and export warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- New product features not approved in the Sprint 4 engineering contract.

Additional simplification boundaries requested by the user: no Action IN_PROGRESS state, full immutable revision snapshots, separate Action version system, rolling-seven-day dashboard filter, dual assigned/performed dashboard summaries or changed initial landing pages. These are implementation-scope choices, not exclusions quoted from the handout.

### 3.3 Inherited Behavior and Effective-Lab Boundaries

Inherited (I): session authentication and first-password lock; current-account authorization; Requester Ticket/Attachment ownership; Public Comments and advisory resolution; private Internal Notes; queue functions; Administrator account safety; Zen Green and earlier screens.
Preserve historical Lab 1-3 documents, artifacts and branch history. Lab 2's identity header may remain in historical evidence, but cannot authenticate the post-Lab-3 application. Current regression suites use authenticated sessions.
Lab 4 explicitly grants Administrators IT Staff behavior (R, section 4.3); historical Lab 3 restrictions remain historical, while applicable current tests must later reflect this deliberate change.

## 4. Functional Requirements

1. **FR-01 - Retrieve Actions for accessible Tickets** (R): Owned Requesters and permitted Staff/Admin can read the applicable Action lines.
2. **FR-02 - Create Actions** (R): Staff/Admin can create an Action with the handout fields under exactly one Ticket.
3. **FR-03 - Edit Actions** (R/A): Support view/edit mode; retain history according to D-05.
4. **FR-04 - Assign Actions** (R/A): Support assignment and inactive-assignee rejection; eligible targets follow D-02.
5. **FR-05 - Action lifecycle** (R/A): Support status transition, completion and cancellation; exact lifecycle follows D-01.
6. **FR-06 - Automatic performer** (R/A): Set performer to the authenticated creator and keep it immutable; later actors are recorded only in D-05 audit events.
7. **FR-07 - Conditional follow-up** (R): Require a nonblank Follow-up Note when Follow-Up Required is true.
8. **FR-08 - Attachment Notes** (R/I): Provide notes describing relevant existing files without replacing attachment management.
9. **FR-09 - Final Ticket transitions** (R/I/A): Retain the eight statuses and document the final approved transition matrix.
10. **FR-10 - Backend resolution rule** (R/A): Enforce the approved resolution predicate even when clients bypass the UI.
11. **FR-11 - Requester resolution indication** (R/I): Keep Problem Appears Resolved advisory and preserve its Public Comment behavior.
12. **FR-12 - Requester Dashboard** (R/A): Summarize only authenticated Requester-owned Tickets using approved metrics.
13. **FR-13 - Staff/Admin Dashboard** (R/A): Provide approved operational metrics, current-user Actions and recent/urgent Tickets.
14. **FR-14 - Authoritative metrics and drill-down** (R/A): Calculate bounded responses on the backend with documented queries and destinations.
15. **FR-15 - Concurrent/stale writes** (R/A): Prevent unnoticed overwriting of newer workflow changes; mechanism follows D-10.
16. **FR-16 - Duplicate/failure protection** (R/A): Handle repeated clicks/retries safely and retain entered data after recoverable failures.
17. **FR-17 - Role navigation and earlier screens** (R/I/A): Add Dashboard navigation while retaining permitted earlier screens; landing policy follows D-13.
18. **FR-18 - Feedback and accessibility** (R/I): Reuse Zen Green; provide meaningful states, keyboard operation, focus, labels and responsive layouts.
19. **FR-19 - Migration, backfill and seed** (R/I/A): Preserve prior data and document recovery and repeatable demonstration fixtures.
20. **FR-20 - Labs 1-3 regression** (R/I): Preserve prior functionality except explicitly superseded rules and keep current regressions traceable.
21. **FR-21 - Append-only evidence** (R/A): Demonstrate stable ordering and append-only behavior while supporting required editing; mechanism follows D-05/D-16.

## 5. Business Rules

1. **BR-01** (R): An Action belongs to exactly one Ticket.
2. **BR-02** (R): Ticket Owner coordinates the Ticket; a different Staff member may perform an Action.
3. **BR-03** (I/R): Backend authenticated identity determines the acting user; legacy identity headers cannot authenticate.
4. **BR-04** (R): Requesters do not create, assign, edit or transition Actions.
5. **BR-05** (R/I): Requester Action visibility is restricted to owned Tickets and includes all current Action lines.
6. **BR-06** (R): Staff/Admin operational permissions are enforced by the backend, not hidden controls.
7. **BR-07** (R/A): assignedTo may be null; assigned targets must be active IT Staff or Administrators, independently of Ticket Owner and performer (D-02).
8. **BR-08** (R/A): Performed by is the authenticated creator, immutable after creation; later editors/status actors appear only in minimal append-only audit events.
9. **BR-09** (R): Follow-Up Required implies a nonblank Follow-up Note.
10. **BR-10** (R/A): Description is trimmed, nonblank and at most 2000 characters; Result at most 2000; Follow-up Note trimmed and at most 1000, nonblank when required; Attachment Notes optional and at most 1000 (D-06).
11. **BR-11** (R/A): Action lifecycle is PLANNED -> COMPLETED/CANCELLED; terminal Actions do not reopen. Create another Action for additional work (D-01).
12. **BR-12** (R/A): Result is required for COMPLETED and CANCELLED Actions (D-06).
13. **BR-13** (R/A): Editing must coexist with append-only evidence; minimal audit events record the acting user; completed-Action corrections follow D-05 without reopening status.
14. **BR-14** (R/A): Action ordering is immutable createdAt ASC, then ID ASC; edits do not reorder lines (D-16).
15. **BR-15** (R/I): Ticket statuses remain New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened and Cancelled.
16. **BR-16** (R/I): Requester resolution indication does not formally resolve or close a Ticket.
17. **BR-17** (R/A): Atomically recheck the gate for both RESOLVED and CLOSED: any PLANNED Action or COMPLETED Action with Follow-Up Required true blocks; CANCELLED Actions do not (D-07).
18. **BR-18** (R/A): Legacy zero-action Tickets retain existing permitted transitions; zero Actions alone does not block, and no historical Actions are fabricated (D-08).
19. **BR-19** (R/A): No Action writes on RESOLVED, CLOSED or CANCELLED Tickets. Reopen RESOLVED/CLOSED before work or corrections; CANCELLED remains terminal (D-09).
20. **BR-20** (R/A): Every Ticket workflow/Action mutation supplies the expected single Ticket workflow revision; mismatch returns 409, success returns the new revision. Non-workflow APIs need no token (D-10).
21. **BR-21** (R/A): Action creation uses a per-operation request key; identical replay returns the original result and different-payload reuse returns 409 (D-11).
22. **BR-22** (R): Dashboard values are calculated from authoritative backend data, not browser totals.
23. **BR-23** (R/A): Dashboard counts use current authoritative state; recent Ticket previews contain up to five sorted updatedAt DESC, id DESC, without a date-window cutoff. My Actions is assigned PLANNED work only (D-12).
24. **BR-24** (R/A): Use additive migrations, stable seed identities and preservation-oriented fixtures; preserve earlier records and rehearse migration/recovery on disposable test data (D-14).
25. **BR-25** (I/R/A): Public Comments remain shared; Internal Notes remain restricted. Minimal audit events are stored without a history browser or separate actor-history system (D-05).
26. **BR-26** (I/R): Apply changes from the Lab in which they became effective and preserve historical documentation/artifacts.

### 5.1 Authorization Rules

The operation matrix is specified in [api-spec.md](api-spec.md#2-authorization-matrix). Backend enforcement is mandatory (R); hidden buttons are only feedback. Authentication, password-lock and safe-error conventions are inherited (I). D-05 defines minimal internal audit events without a history browser; D-15 fixes safe error codes.

### 5.2 Ticket Transition Starting Point

Retain the inherited Lab 3 paths below, with the approved D-07 resolution/closure gate and D-10 revision checks. Authorized formal transitions are IT Staff/Admin operations; Requester indications remain advisory.

| Current Ticket status | Inherited targets                                       |
| --------------------- | ------------------------------------------------------- |
| NEW                   | OPEN, IN_PROGRESS, CANCELLED                            |
| OPEN                  | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS           | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED              |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED                        |
| RESOLVED              | CLOSED, REOPENED                                        |
| CLOSED                | REOPENED                                                |
| REOPENED              | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED             | None                                                    |

R fixes the eight statuses; I supplies the preserved paths. A supplies the gate and concurrency overlay: recheck both RESOLVED and CLOSED; zero Actions alone never blocks. The blocking predicate is the user-approved D-07 choice, not a predicate supplied by the handout.

### 5.3 Approved Actions Taken Lifecycle and Audit Rules

D-01: PLANNED -> COMPLETED/CANCELLED. COMPLETED and CANCELLED are terminal; additional work requires another Action. D-03/D-04 preserve the authenticated creator and server creation time immutably.
D-05: minimal append-only events record Action ID, actor, timestamp, event type and changed fields. No full snapshots, history browser or separate actor-history system. COMPLETED Actions permit only audited corrections to Result, Follow-Up Required, Follow-up Note and Attachment Notes; status, performer and creation time do not change. CANCELLED Actions have no approved correction exception.
D-07: PLANNED Actions and COMPLETED Actions with Follow-Up Required true block both resolution and closure; CANCELLED Actions do not. Clearing follow-up through a validated audited correction removes that blocker without reopening the Action. A true flag still requires a nonblank note.
D-09: all Action writes, including these corrections, are forbidden when the parent Ticket is RESOLVED, CLOSED or CANCELLED. Reopen RESOLVED/CLOSED first; CANCELLED remains terminal. Existing Public Comment, Internal Note and Attachment behavior is preserved.

### 5.4 Approved Dashboard Calculations

D-12 approves current-state counts, five recent Tickets and one assigned-PLANNED My Actions preview. The table preserves the concise calculation choices in this contract; these formulas are implementation choices (A). Counts are authoritative backend queries, empty results are zero/empty, and drill-downs retain the same scope.

| Metric                            | Query scope                                                                     | Drill-down                            |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Requester active Tickets          | requesterId = session user; status in NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED | My Tickets with the same active set             |
| Waiting for Requester             | owned Tickets; currentStatus = WAITING_FOR_REQUESTER                                      | Matching My Tickets filter                      |
| Resolved Tickets                  | owned Tickets; currentStatus = RESOLVED                                                   | Matching My Tickets filter                      |
| Recent Requester Tickets          | owned; five most recently updated, without a date-window cutoff                                           | Owned detail or identically scoped list         |
| Unassigned operational Tickets    | active set; assignedStaffId is null                                                       | Unassigned active queue                         |
| My operational Tickets            | active set; assignedStaffId = authenticated Staff/Admin                                   | Current-owner active queue                      |
| Status/IT Priority counts         | group operational Tickets by current status/priority                                       | Queue with the same scope and bucket            |
| My Actions                        | PLANNED Actions assigned to the authenticated IT Staff/Administrator                          | Parent Ticket Detail Actions Taken area |
| Recent/urgent operational Tickets | five most recently updated accessible operational Tickets                                             | Matching queue or Ticket Detail                 |

D-12 uses current-state counts and up to five most recently updated Tickets without a date-window cutoff, sorted updatedAt DESC, id DESC. Requester scope is authenticated ownership; Staff/Admin scope is accessible operational Tickets. Active counts use the explicit status set above. My Actions contains only PLANNED Actions assigned to the authenticated Staff/Admin, with links to parent Ticket Detail; historical performer-only work is excluded. Use the recent-Tickets option of the approved recent/urgent preview, without a separate urgency-ranking feature.
Do not call updatedAt a resolution timestamp. The approved metric is current Resolved count; dated resolution analytics are outside this contract. Zero data returns zero counts/empty previews; failed queries must not masquerade as zeros (R).

## 6. UI Specification Summary

R fields: Action Date/Time, Action Description, Result, Performed by (auto), Follow-Up Required, conditional Follow-up Note and Attachment Notes. Assignment and lifecycle operations are required by submission Part 6. I preserves existing attachment storage/download/removal; Attachment Notes do not introduce a new upload system.
D-03 sets immutable authenticated-creator attribution; D-04 uses immutable server-generated creation time with no editable work-date field. D-02 allows null or active Staff/Admin assignment; D-06 fixes text bounds and terminal Result requirements. [ui-spec.md](ui-spec.md) defines modes, layout, feedback and accessibility; it does not implement screens.

## 7. Data Changes

R: preserve Users, Categories, Related Systems, Tickets, ownership, Attachments and file references, Public Comments and Internal Notes. Document legacy zero-action behavior, dashboard treatment and tested recovery; justify at least two database-design decisions.

A/D-14: additive Action relationships, minimal append-only audit events and one Ticket workflow revision; stable seed identities; no fabricated historical work/events; new fixtures cover zero/one/multiple Actions, statuses/priorities/ownership and zero/nonzero metrics.

### 7.1 Issue 19 Storage Representation

| Model | Implemented representation |
| --- | --- |
| ActionTaken | Required Ticket and immutable performer User; nullable assignee User; PLANNED/COMPLETED/CANCELLED enum; approved bounded text, conditional follow-up fields, immutable server-created timestamp and updatedAt. No editable work date. |
| Ticket | One nonnegative workflowRevision integer initialized to 0 for legacy/new Tickets. No Action-level version. |
| ActionAuditEvent | Action ID, actor User ID, timestamp, event type and JSON changed-field deltas. Creation events describe inserted fields; later events describe changes only. SQL rejects event UPDATE/DELETE; no full revision snapshots or history browser. |
| ActionCreationRequest | Key unique within creator + Ticket, creation-payload SHA-256, Action reference and immutable original creation result. Composite FK anchors creator/Ticket to that same Action. This is one retry result, not revision history. |

Named SQL checks enforce nonblank Description, terminal Result and conditional Follow-up Note; database column bounds enforce 2000/1000 limits. Seed inputs are trimmed; application input normalization remains Issue 20. New foreign keys use restrictive deletion to preserve evidence. SQL triggers reject changes to Action identity, Ticket, performer or creation time and mutation/deletion of audit/retry evidence. These triggers do not implement authorization, active-assignee validation, Action transitions, Ticket gates or revision increments for application requests.

Design justifications: (1) separate owner, creator and nullable assignee preserve the required coordination/work distinction; (2) a single Ticket revision provides the shared boundary needed by Action/resolve races; (3) preserving an original creation result allows retry after later Action edits without reconstructing or overwriting history. The future API owns request canonicalization and replay/conflict handling; seed fingerprints identify only deterministic fixture insertions.

Indexes: Action (ticketId, createdAt, id), (assignedToId, status), (ticketId, status, followUpRequired); audit (actionId, timestamp, id); unique request (creatorId, ticketId, requestKey). The extra unique Action/creation-request relation keys enforce consistent Ticket/creator references. Earlier indexes and relationship behavior are preserved.

A/D-10: serialize related workflow writes through the parent Ticket; validate one expected Ticket workflow revision and the resolution predicate atomically. Every Ticket workflow and Action mutation must send the expected revision; return 409 on mismatch and the new revision on success. Non-workflow APIs retain their existing contract without this token. Current operational clients/tests must be updated in the implementation issues.

### 7.2 Separate Prerequisite Repair and Additive Migration

Disposable replay reproduced two differences: historical SQL leaves Category while Prisma maps categories, and users.updatedAt retains a SQL default absent from Prisma. `20261015090000_reconcile_lab3_schema` renames the Category table/constraint/index/sequence and removes only that default; existing row values and Ticket FKs survive. It refuses an ambiguous existing categories table rather than dropping or merging records. This prerequisite repair is separate from `20261015090100_lab4_actions_foundation`, which only adds the new storage and workflowRevision. No historical migration was edited.

Migration tests replay representative Lab 2 data through Lab 3 before taking the preservation snapshot; approved historical PENDING/priority transformations happen only in that old increment. Issue 19 preserves the resulting Users, Categories, Systems, Tickets, ownership, timestamps, attachment metadata/file references, Comments and Internal Notes. Legacy Tickets gain revision 0 and no invented Actions/events. Fresh SQL replay matches the current Prisma model. Development migration-history reconciliation remains separately authorized work and has not been performed.

Recovery (A): a disposable PostgreSQL dump and a separately copied referenced attachment file were restored and compared with pre-loss records, Actions, events and retry results. This is not authorization to restore/reset development data. A real backup must capture both database and uploads; do not discard new work to roll back.

### 7.3 Seed Preservation

Both seed profiles create missing records without updating existing passwords, account state, reference-data activity, Ticket content/ownership/status or timestamps. A transaction-level advisory lock serializes seed runs. Default `all` adds dedicated Lab 4 accounts/Tickets (including an empty Requester), all eight Ticket statuses, all priorities, zero/one/multiple Actions, nullable/active assignment, all three Action states and both follow-up states. New fixture events record actual fixture insertion, not invented past transitions. No Actions are backfilled onto any existing Ticket, including an existing fixture Ticket. Completed/cancelled demo records are initial fixture state, not runtime writes on terminal Tickets.

The explicit `baseline` profile supplies unchanged Lab 1–3 fixture coverage for regression suites that clean up Tickets. Full-seed tests verify all Lab 4 scenarios, repeated/concurrent runs and preservation after user edits. Initial passwords are assigned only on account creation. Earlier historical documents/artifacts remain unchanged.

## 8. API Contract

[api-spec.md](api-spec.md) contains approved paths, payload field responsibilities, response/error contracts and examples of conflict scenarios. Paths/shapes/tokens are A/D-15/D-10/D-11. Existing protected functionality and authentication remain I unless R explicitly extends permissions.

## 9. Acceptance Criteria

1. **AC-01** (R/A): Given permitted Staff/Admin and valid approved data, when an Action is created, then it belongs to the correct Ticket and records immutable authenticated-creator attribution and server-generated creation time.
2. **AC-02** (R): Given one Ticket and different permitted Staff members, when Actions are recorded, then work attribution can differ from the primary Ticket Owner.
3. **AC-03** (R/I/A): Given a Requester, when Action access is requested, then owned-ticket reads are permitted and unauthorized reads/writes are rejected safely.
4. **AC-04** (R/A): Given missing, blank or out-of-bound Action input, when submitted, then approved validation errors identify the affected fields.
5. **AC-05** (R): Given Follow-Up Required is true and the note is blank, when submitted, then the operation is rejected without saving invalid data.
6. **AC-06** (R/A): Given an inactive or otherwise ineligible assignee, when assignment is requested, then it is rejected according to the approved policy.
7. **AC-07** (R/A): Given an existing Action, when an approved edit succeeds, then list ordering remains stable and a minimal append-only event records the actor; permitted corrections to completed Result/follow-up/Attachment Notes preserve COMPLETED status, performer and creation time.
8. **AC-08** (R/A): Given an Action state, when a transition is requested, then only transitions from the approved matrix succeed.
9. **AC-09** (R/A): Given completion or cancellation, when submitted, then the approved Result/follow-up conditions are enforced.
10. **AC-10** (R/A): Given a stale update or competing workflow changes, when writes race, then a revision mismatch returns 409 without overwriting newer work; success returns the new revision.
11. **AC-11** (R/A): Given the same logical create operation is clicked/retried repeatedly, when requests arrive, then an identical request-key replay returns the original result; different-payload reuse returns 409.
12. **AC-12** (R/I/A): Given a Ticket status, when a transition is requested, then the final approved eight-status matrix is enforced.
13. **AC-13** (R/A): Given Actions that block the approved resolution rule, when a direct API resolution or closure request is sent, then that transition is rejected atomically; after an authorized audited correction clears a completed Action's follow-up blocker, that Action remains COMPLETED and no longer blocks resolution.
14. **AC-14** (R/A): Given a legacy Ticket without Actions, when workflow operations occur, then the approved zero-action policy applies without fabricated backfill.
15. **AC-15** (R/I): Given an owned Ticket, when its Requester indicates that the problem appears resolved, then the Public Comment behavior remains and formal status is unchanged.
16. **AC-16** (R): Given an Administrator, when approved Staff operations are requested, then Lab 4 permissions apply while User Management remains available.
17. **AC-17** (R/A): Given a Requester Dashboard request, when its metrics/previews are returned, then only authenticated ownership and approved calculations are used.
18. **AC-18** (R/A): Given a Staff/Admin Dashboard request, when operational and current-user Action data is returned, then calculations are correct and My Actions contains only PLANNED Actions assigned to that authenticated user, excluding historical performed work.
19. **AC-19** (R/A): Given a dashboard card or preview, when its drill-down is followed, then the destination represents the same documented scope and filters.
20. **AC-20** (R): Given loading, zero data, recoverable failure or conflict, when the UI responds, then it shows the correct state and preserves recoverable input.
21. **AC-21** (R/I/A): Given earlier-lab data and repeat seed/migration runs in isolated test data, when upgraded, then approved preservation, fixture and recovery checks pass.
22. **AC-22** (R/I): Given the current final application, when complete Labs 1-3 regressions run, then inherited behavior passes except explicitly superseded expectations.
23. **AC-23** (R/I): Given keyboard users, long content and required viewports, when screens are exercised, then approved focus, style, responsive and accessibility checks pass.
24. **AC-24** (R/A): Given a final evidence run, when artifacts are reviewed, then required screen/viewport captures and AC-to-run traceability are complete without replacing earlier evidence.

All ACs reflect the user-approved D-01 through D-16 choices. [tests.md](tests.md) distinguishes completed Issue 19 storage evidence from the still-planned API/UI/workflow tests; data tests alone do not complete those later ACs.

## 10. Definition of Done

### 10.1 Issue 18 Documentation Completion

- [ ] All six documents reviewed and mutually consistent.
- [ ] Every FR/BR/AC has source provenance and planned test traceability.
- [x] D-01 through D-16 explicitly approved by the user on 2026-10-15; implementation choices remain distinguished from handout mandates.
- [ ] Baseline limitations, evidence dates and remediation ownership recorded.
- [ ] Reviewer record remains an honest placeholder until reviews happen.
- [ ] AI-use record describes actual prompts and leaves personal reflection to the author.
- [ ] Documentation approval and feature-readiness gate are recorded separately.

### 10.2 Sprint 4 Product Completion (R/I)

- [ ] Approved scope and all ACs implemented; direct authorization and resolution bypass tests pass.
- [ ] Conflict/duplicate behavior and recoverable-input retention pass.
- [ ] Migration/recovery preserve earlier data; seed scenarios verified.
- [ ] Complete current Labs 1-3 and Lab 4 server/client/build/E2E checks pass with isolated test data.
- [ ] Style, responsive, keyboard, focus, geometry and manual visual checks pass.
- [ ] Required Lab 4 artifact structure and AC-to-run evidence complete; earlier evidence preserved.
- [ ] Setup, seed, migration, test and demonstration instructions accurate.
- [ ] Final-main verification recorded after approved staging release.

Course delivery (R): peer review, Kanban evidence, feature PRs into lab4-staging, release lab4-staging -> main, reviewer/AI-use records and submission Answer Parts 1-9. Documentation may be committed locally for review when authorized; no push, PR or submission is performed by this drafting task.

## 11. Assumptions and Decisions

### 11.1 Approved Decision Register

**Approval evidence:** The user explicitly approved D-01 through D-16 in this session on 2026-10-15. Approval covers the choices below; it does not claim implementation or test completion.

| Decision | Topic | Approved choice | Handout source | Status |
| --- | --- | --- | --- | --- |
| D-01 | Action lifecycle | PLANNED -> COMPLETED/CANCELLED; COMPLETED/CANCELLED are terminal and never reopen. Create another Action for more work. | 9, submission Part 6 | APPROVED |
| D-02 | Assignment | assignedTo may be null; assigned targets must be active IT Staff/Admin. Assignment is independent of Ticket Owner and performer. | 4.3-4.4, submission Part 6 | APPROVED |
| D-03 | Automatic performer | Immutable authenticated Action creator; later edits/status actors appear only in minimal D-05 audit events. | 3, 8.3, 9.1 | APPROVED |
| D-04 | Action Date/Time | Immutable server-generated creation time; no separate editable work date. | 3, 8.3 | APPROVED |
| D-05 | Minimal audit events | Each append-only event records Action ID, actor, timestamp, event type and changed fields. No full snapshots/history browser. COMPLETED corrections allow only Result, Follow-Up Required, Follow-up Note and Attachment Notes; D-09 applies. | 8.3, submission Parts 6-7 | APPROVED |
| D-06 | Validation | Description trimmed/nonblank/max 2000; Result max 2000 and required for COMPLETED/CANCELLED; Follow-up Note trimmed/max 1000/nonblank when required; Attachment Notes optional/max 1000. | 4.1, 8.3, 8.5 | APPROVED |
| D-07 | Resolution/closure gate | Any PLANNED Action or COMPLETED Action with Follow-Up Required true blocks both RESOLVED and CLOSED; recheck atomically. CANCELLED Actions do not block. Audited completed corrections can clear follow-up without reopening. | 4.5, 6.1 | APPROVED |
| D-08 | Legacy zero-action Tickets | Retain existing permitted transitions; zero Actions alone is not a blocker. Do not fabricate historical Actions. | 5.2 | APPROVED |
| D-09 | Terminal-Ticket Action writes | No Action writes on RESOLVED/CLOSED/CANCELLED Tickets. Reopen RESOLVED/CLOSED before work or corrections; CANCELLED remains terminal. | 4.5, 6.1, 8.3 | APPROVED |
| D-10 | Workflow revision | One Ticket workflow revision protects all Ticket workflow/Action mutations; each sends expected revision. Mismatch 409; success returns new revision. Non-workflow APIs need no token. | 5.1, 6.1 | APPROVED |
| D-11 | Creation request key | Per-operation Action creation key; identical replay returns original result; changed-payload reuse returns conflict (409). | 8.5 | APPROVED |
| D-12 | Dashboards | Requester: current-state owned counts and five most recently updated owned Tickets. Staff/Admin: operational counts, five recent/urgent Tickets and My Actions = PLANNED Actions assigned to current user. Recent order updatedAt DESC, id DESC. | 4.6, 6.2, 8.1-8.2, submission Part 5 | APPROVED |
| D-13 | Navigation | Role-appropriate Dashboard links and active-page indication; preserve initial landing pages; omit optional Admin account counts. | 4.6, 7 | APPROVED |
| D-14 | Migration/seed/recovery | Additive evolution; preserve earlier data; no fabricated historical Actions/events; stable seed identities and preservation-oriented fixtures. Rehearse migration/recovery on disposable test data; never rewrite historical migrations. | 5.1-5.3 | APPROVED |
| D-15 | API/safe errors | Keep nested Action and dashboard endpoints, inherited safe envelopes; 400 validation, 401 unauthenticated, 403 forbidden role, ownership-safe 404, 409 stale/conflict/resolution-gate. | 6-6.2 | APPROVED |
| D-16 | Stable Action order | Immutable createdAt ASC, then ID ASC; editing does not reorder an Action. | submission Part 7 | APPROVED |

### 11.2 Baseline Limitations and Prerequisites

Issue 19 update (2026-10-15): Issue 18 merged through PR #58; this branch started at lab4-staging 7c2cfd7. The separate forward repair and Lab 4 migration passed disposable replay/preservation tests. Active server tests now own fresh migrated schemas per file rather than using db push. Development migration history, Playwright isolation and later product behavior remain outside this issue. The original Issue 18 observations below are retained as a dated baseline, not current claims that these resolved items are still unimplemented.

**Design decisions: APPROVED. Baseline gate: BLOCKED until the recorded prerequisites are verified; documentation review can proceed.** Snapshot observed 2026-10-15; no fresh automated suites or database audit were run for Issue 18.

- Remote main/reference origin/main: 83bfc8f, readiness PR #46 merged; original local main remains 74e5144, four commits behind.
- Local lab4-staging and feature/18-lab4-contract-baseline created from 83bfc8f for this documentation task; no remote Lab 4 branch or push created; no origin/main upstream is assigned to staging.
- Existing screenshot modifications and untracked generated client JavaScript predate this task and are preserved; they are not Issue 18 changes.
- Migration SQL creates Category while current Prisma maps categories; repair requires separate approval before migration-dependent work.
- Development \_prisma_migrations absence was previously observed, not rechecked here; it is environment-specific, not proof of a universal product defect.
- Server test safety validation precedes mutations, but setup uses db push, not migration replay.
- Playwright reuses existing servers and does not enforce its own test DB; root test:e2e selects Lab 2 only.
- Client tsc emits JavaScript beside source; noEmit is not in the committed configuration.
- Earlier responsive/style and conditional E2E evidence gaps remain; protected-resource existence errors require contract/implementation verification.
- README setup/test isolation and migration naming limitations must be addressed in a later approved issue; .gitignore excludes env/dependencies/build/test outputs/uploads but does not prevent compiler sibling outputs.
- Committed evidence: Lab 2 has 19 PNGs including 9 baseline viewport images; Lab 3 has 31 PNGs including 12 baseline images. Extra images do not substitute for baseline structure.
- Existing test files: server Lab 1/2/3 = 2/5/11; client = 1/4/7; E2E = 1 Lab 2 and 3 Lab 3 specs. Prior documentation records 98 server, 50 client and 21 E2E passes; these are historical results, not a new Issue 18 gate pass.

Gate release prerequisites: review the updated contract and verify its approved protected-operation matrix; verify a clean authoritative staging baseline in an isolated checkout; separately resolve migration prerequisites; verify regression/build/E2E commands against isolated test data. Do not sweep unrelated working-tree changes into the Issue 18 commit.

### 11.3 Earlier Contract References

- [Lab 2 specification](../lab-02/specification.md), [tests](../lab-02/tests.md), [UI](../lab-02/ui-spec.md), [API](../lab-02/api-spec.md).
- [Lab 3 specification](../lab-03/specification.md), [tests](../lab-03/tests.md), [UI](../lab-03/ui-spec.md), [API](../lab-03/api-spec.md).

Earlier artifacts/documents remain descriptions of their effective increments. Current regressions use the final application's authentication; historical selector/header evidence is not rewritten.
