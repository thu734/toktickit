# Lab 4 - Sprint 4 Engineering Specification

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** Documentation prepared for review; product decisions pending approval; no Lab 4 feature implementation.

**Provenance:** R = required by Lab 4; I = inherited from Labs 1-3; P = proposed decision requiring approval.
A combined label separates the required capability from its proposed implementation details.
Authorization to draft these documents does not approve every P decision.

## 1. Sprint Goal

Complete the core service-desk workflow with Actions Taken, final Ticket rules, concise role dashboards and verified earlier-lab regression (R).

## 2. Stakeholder Request

Ticket Owner coordinates the Ticket; different Staff members may record work. Requester resolution indications remain advisory (R/I).

## 3. Scope

### 3.1 Included

Included future work (R): Actions Taken, assignment/edit/status/complete/cancel evidence, backend workflow enforcement, Requester/Staff/Admin dashboards, concurrency, migration/seed/recovery, final regression and accessibility.
Issue 18 creates only this six-file documentation contract. No model, migration, API, UI, seed, application test or E2E code is implemented here.

### 3.2 Explicitly Excluded

Excluded (R): SLA clocks/escalation/on-call; notifications; inventory/spare parts/purchasing; billing/payroll/labor costing; approvals/signatures; advanced BI/export warehouses; multi-tenancy/production-scale cloud operations; unapproved features.

### 3.3 Inherited Behavior and Effective-Lab Boundaries

Inherited (I): session authentication and first-password lock; current-account authorization; Requester Ticket/Attachment ownership; Public Comments and advisory resolution; private Internal Notes; queue functions; Administrator account safety; Zen Green and earlier screens.
Preserve historical Lab 1-3 documents, artifacts and branch history. Lab 2's identity header may remain in historical evidence, but cannot authenticate the post-Lab-3 application. Current regression suites use authenticated sessions.
Lab 4 explicitly grants Administrators IT Staff behavior (R, section 4.3); historical Lab 3 restrictions remain historical, while applicable current tests must later reflect this deliberate change.

## 4. Functional Requirements

1. **FR-01 - Retrieve Actions for accessible Tickets** (R): Owned Requesters and permitted Staff/Admin can read the applicable Action lines.
2. **FR-02 - Create Actions** (R): Staff/Admin can create an Action with the handout fields under exactly one Ticket.
3. **FR-03 - Edit Actions** (R/P): Support view/edit mode; retain history according to D-05.
4. **FR-04 - Assign Actions** (R/P): Support assignment and inactive-assignee rejection; eligible targets follow D-02.
5. **FR-05 - Action lifecycle** (R/P): Support status transition, completion and cancellation; exact lifecycle follows D-01.
6. **FR-06 - Automatic performer** (R/P): Derive performer from authenticated identity; attribution timing follows D-03.
7. **FR-07 - Conditional follow-up** (R): Require a nonblank Follow-up Note when Follow-Up Required is true.
8. **FR-08 - Attachment Notes** (R/I): Provide notes describing relevant existing files without replacing attachment management.
9. **FR-09 - Final Ticket transitions** (R/I/P): Retain the eight statuses and document the final approved transition matrix.
10. **FR-10 - Backend resolution rule** (R/P): Enforce the approved resolution predicate even when clients bypass the UI.
11. **FR-11 - Requester resolution indication** (R/I): Keep Problem Appears Resolved advisory and preserve its Public Comment behavior.
12. **FR-12 - Requester Dashboard** (R/P): Summarize only authenticated Requester-owned Tickets using approved metrics.
13. **FR-13 - Staff/Admin Dashboard** (R/P): Provide approved operational metrics, current-user Actions and recent/urgent Tickets.
14. **FR-14 - Authoritative metrics and drill-down** (R/P): Calculate bounded responses on the backend with documented queries and destinations.
15. **FR-15 - Concurrent/stale writes** (R/P): Prevent unnoticed overwriting of newer workflow changes; mechanism follows D-10.
16. **FR-16 - Duplicate/failure protection** (R/P): Handle repeated clicks/retries safely and retain entered data after recoverable failures.
17. **FR-17 - Role navigation and earlier screens** (R/I/P): Add Dashboard navigation while retaining permitted earlier screens; landing policy follows D-13.
18. **FR-18 - Feedback and accessibility** (R/I): Reuse Zen Green; provide meaningful states, keyboard operation, focus, labels and responsive layouts.
19. **FR-19 - Migration, backfill and seed** (R/I/P): Preserve prior data and document recovery and repeatable demonstration fixtures.
20. **FR-20 - Labs 1-3 regression** (R/I): Preserve prior functionality except explicitly superseded rules and keep current regressions traceable.
21. **FR-21 - Append-only evidence** (R/P): Demonstrate stable ordering and append-only behavior while supporting required editing; mechanism follows D-05/D-16.

## 5. Business Rules

1. **BR-01** (R): An Action belongs to exactly one Ticket.
2. **BR-02** (R): Ticket Owner coordinates the Ticket; a different Staff member may perform an Action.
3. **BR-03** (I/R): Backend authenticated identity determines the acting user; legacy identity headers cannot authenticate.
4. **BR-04** (R): Requesters do not create, assign, edit or transition Actions.
5. **BR-05** (R/I): Requester Action visibility is restricted to owned Tickets and includes all current Action lines.
6. **BR-06** (R): Staff/Admin operational permissions are enforced by the backend, not hidden controls.
7. **BR-07** (R/P): New Action assignments reject inactive accounts; eligible roles and unassigned behavior await D-02.
8. **BR-08** (R/P): Performed by is automatic; creator versus completion-actor semantics await D-03.
9. **BR-09** (R): Follow-Up Required implies a nonblank Follow-up Note.
10. **BR-10** (P): Action input lengths, trimming, required Result conditions and Attachment Notes bounds await D-06.
11. **BR-11** (R/P): Action transitions follow an approved matrix, not an invented implementation default.
12. **BR-12** (P): Completion and cancellation validation follow D-06; a cancellation result/reason is proposed.
13. **BR-13** (R/P): Editing must coexist with append-only evidence; audit representation and visibility await D-05.
14. **BR-14** (R/P): Action ordering is stable; proposed immutable creation-time/ID ordering awaits D-16.
15. **BR-15** (R/I): Ticket statuses remain New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened and Cancelled.
16. **BR-16** (R/I): Requester resolution indication does not formally resolve or close a Ticket.
17. **BR-17** (R/P): Backend resolution validation and related writes are concurrency-safe; blocking conditions await D-07.
18. **BR-18** (R/P): Legacy zero-action Ticket behavior is documented; proposed continued transitionability awaits D-08.
19. **BR-19** (P): New work-affecting Actions on terminal Tickets follow an approved D-09 policy.
20. **BR-20** (R/P): Stale updates cannot unknowingly overwrite newer work; token scope, compatibility and error code await D-10.
21. **BR-21** (R/P): Repeated creation cannot produce accidental duplicates; request-key semantics await D-11.
22. **BR-22** (R): Dashboard values are calculated from authoritative backend data, not browser totals.
23. **BR-23** (R/P): Each metric has an identity scope, date boundary, empty behavior and drill-down; formulas await D-12.
24. **BR-24** (R/I/P): Migration and seed behavior preserve earlier records and relationships; new fixture policy awaits D-14.
25. **BR-25** (I/R/P): Public Comments remain shared; Internal Notes remain restricted; Action audit visibility is separately approved.
26. **BR-26** (I/R): Apply changes from the Lab in which they became effective and preserve historical documentation/artifacts.

### 5.1 Authorization Rules

The operation matrix is specified in [api-spec.md](api-spec.md#2-authorization-matrix). Backend enforcement is mandatory (R); hidden buttons are only feedback. Authentication, password-lock and safe-error conventions are inherited (I). Exact new error codes and audit visibility remain D-05/D-15 (P).

### 5.2 Ticket Transition Starting Point

The following is the inherited Lab 3 matrix, not a silently approved new policy:

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

R fixes the eight status values; I supplies the starting paths. P recommends preserving those paths and adding the approved resolution/concurrency overlay. D-07 defines blocking work and whether closure repeats validation; D-08 defines zero-action behavior. The handout requires a resolution rule, but does not provide a complete predicate. Do not treat unfinished-work/follow-up assumptions as settled.

### 5.3 Actions Taken Lifecycle Proposal

D-01 proposes PLANNED -> IN_PROGRESS or CANCELLED; IN_PROGRESS -> COMPLETED or CANCELLED; terminal statuses do not reopen. D-05 separately governs audited amendments. These labels/transitions are P, not fixed handout vocabulary.
D-07 proposes blocking unfinished Actions and completed Actions with follow-up still required, excluding cancelled Actions. If terminal amendments are allowed, clearing follow-up must be possible without reopening terminal Action status. D-09 defines terminal Ticket write restrictions and must not silently change existing comment/attachment behavior.

### 5.4 Dashboard Calculation Candidates

All following formulas are P under D-12; R requires authoritative, concise, ownership-safe metrics with defined empty behavior and practical drill-downs.

| Metric                            | Candidate query scope                                                                     | Candidate drill-down                            |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Requester active Tickets          | requesterId = session user; status in NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED | My Tickets with the same active set             |
| Waiting for Requester             | owned Tickets; currentStatus = WAITING_FOR_REQUESTER                                      | Matching My Tickets filter                      |
| Resolved Tickets                  | owned Tickets; currentStatus = RESOLVED                                                   | Matching My Tickets filter                      |
| Recent Requester Tickets          | owned; updatedAt in approved window; up to five                                           | Owned detail or identically scoped list         |
| Unassigned operational Tickets    | active set; assignedStaffId is null                                                       | Unassigned active queue                         |
| My operational Tickets            | active set; assignedStaffId = authenticated Staff/Admin                                   | Current-owner active queue                      |
| Status/IT Priority counts         | group approved operational scope by status/priority                                       | Queue with the same scope and bucket            |
| My Actions                        | separate assigned unfinished work from performer-attributed work                          | Approved Action panel/Ticket Detail destination |
| Recent/urgent operational Tickets | bounded approved active/recent/priority scope                                             | Matching queue or Ticket Detail                 |

D-12 proposes one server asOf and a rolling interval [asOf - 7 days, asOf), UTC storage/comparison and Asia/Bangkok presentation. This is not a calendar-day window. Proposed ordering: recent previews by updatedAt descending then ID descending; urgent preview priority ranking followed by updatedAt and ID. Exact My Actions scope, urgency set, filters and limits require approval.
Do not call updatedAt a resolution timestamp. A truly recently-resolved metric needs a separately approved trustworthy timestamp/backfill design; current Resolved count is the lower-complexity proposal. Zero data returns zero counts/empty previews; failed queries must not masquerade as zeros (R).

## 6. UI Specification Summary

R fields: Action Date/Time, Action Description, Result, Performed by (auto), Follow-Up Required, conditional Follow-up Note and Attachment Notes. Assignment and lifecycle operations are required by submission Part 6. I preserves existing attachment storage/download/removal; Attachment Notes do not introduce a new upload system.
D-02/D-03/D-04/D-06 decide assignment, attribution, date and validation semantics. [ui-spec.md](ui-spec.md) defines modes, layout, feedback and accessibility; it does not implement screens.

## 7. Data Changes

R: preserve Users, Categories, Related Systems, Tickets, ownership, Attachments and file references, Public Comments and Internal Notes. Document legacy zero-action behavior, dashboard treatment and tested recovery; justify at least two database-design decisions.

P/D-14: additive Action relationships, audit records and version fields; stable seed identities; no fabricated historical work/events; new fixtures cover zero/one/multiple Actions, statuses/priorities/ownership and zero/nonzero metrics. Proposed indexes support Ticket/stable ordering and assignee/status lookup; proposed versions support conflict detection. These are conceptual decisions only, not Prisma or SQL definitions.

P/D-10: serialize related workflow writes through the parent Ticket; validate expected versions and the resolution predicate atomically. Approve whether new version tokens are mandatory for existing operational endpoints and how current clients/tests migrate.

Existing migration/schema mismatch is a separate prerequisite. Proposed repair sequence: compare fresh migration output with Prisma and a disposable copy of development; identify all differences; approve a forward repair; rehearse preservation/recovery; separately approve any development history reconciliation. Never edit historical migration files or blindly mark migrations applied as part of Issue 18.

Recovery proposal (P): verified backups and application-version compatibility, rehearsed on disposable data; do not assume new work may be deleted to roll back. Existing seed password/Ticket resets are an observed policy, not an explicit preservation prohibition in the handout; approve new Lab 4 seed behavior without silently rewriting earlier policy.

## 8. API Contract

[api-spec.md](api-spec.md) contains proposed paths, payload field responsibilities, response/error contracts and examples of conflict scenarios. Paths/shapes/tokens are P/D-15/D-10/D-11. Existing protected functionality and authentication remain I unless R explicitly extends permissions.

## 9. Acceptance Criteria

1. **AC-01** (R/P): Given permitted Staff/Admin and valid approved data, when an Action is created, then it belongs to the correct Ticket and records authenticated attribution.
2. **AC-02** (R): Given one Ticket and different permitted Staff members, when Actions are recorded, then work attribution can differ from the primary Ticket Owner.
3. **AC-03** (R/I/P): Given a Requester, when Action access is requested, then owned-ticket reads are permitted and unauthorized reads/writes are rejected safely.
4. **AC-04** (R/P): Given missing, blank or out-of-bound Action input, when submitted, then approved validation errors identify the affected fields.
5. **AC-05** (R): Given Follow-Up Required is true and the note is blank, when submitted, then the operation is rejected without saving invalid data.
6. **AC-06** (R/P): Given an inactive or otherwise ineligible assignee, when assignment is requested, then it is rejected according to the approved policy.
7. **AC-07** (R/P): Given an existing Action, when an approved edit succeeds, then list ordering remains stable and required previous history remains available.
8. **AC-08** (R/P): Given an Action state, when a transition is requested, then only transitions from the approved matrix succeed.
9. **AC-09** (R/P): Given completion or cancellation, when submitted, then the approved Result/follow-up conditions are enforced.
10. **AC-10** (R/P): Given a stale update or competing workflow changes, when writes race, then newer work is not silently overwritten.
11. **AC-11** (R/P): Given the same logical create operation is clicked/retried repeatedly, when requests arrive, then accidental duplicate Actions are prevented.
12. **AC-12** (R/I/P): Given a Ticket status, when a transition is requested, then the final approved eight-status matrix is enforced.
13. **AC-13** (R/P): Given Actions that block the approved resolution rule, when a direct API resolution request is sent, then resolution is rejected atomically.
14. **AC-14** (R/P): Given a legacy Ticket without Actions, when workflow operations occur, then the approved zero-action policy applies without fabricated backfill.
15. **AC-15** (R/I): Given an owned Ticket, when its Requester indicates that the problem appears resolved, then the Public Comment behavior remains and formal status is unchanged.
16. **AC-16** (R): Given an Administrator, when approved Staff operations are requested, then Lab 4 permissions apply while User Management remains available.
17. **AC-17** (R/P): Given a Requester Dashboard request, when its metrics/previews are returned, then only authenticated ownership and approved calculations are used.
18. **AC-18** (R/P): Given a Staff/Admin Dashboard request, when operational and current-user Action data is returned, then the approved calculations and actor/assignee semantics are correct.
19. **AC-19** (R/P): Given a dashboard card or preview, when its drill-down is followed, then the destination represents the same documented scope and filters.
20. **AC-20** (R): Given loading, zero data, recoverable failure or conflict, when the UI responds, then it shows the correct state and preserves recoverable input.
21. **AC-21** (R/I/P): Given earlier-lab data and repeat seed/migration runs in isolated test data, when upgraded, then approved preservation, fixture and recovery checks pass.
22. **AC-22** (R/I): Given the current final application, when complete Labs 1-3 regressions run, then inherited behavior passes except explicitly superseded expectations.
23. **AC-23** (R/I): Given keyboard users, long content and required viewports, when screens are exercised, then approved focus, style, responsive and accessibility checks pass.
24. **AC-24** (R/P): Given a final evidence run, when artifacts are reviewed, then required screen/viewport captures and AC-to-run traceability are complete without replacing earlier evidence.

All ACs dependent on P decisions are provisional until those decisions are approved. [tests.md](tests.md) maps every AC to planned evidence; no proposed feature has passed execution evidence yet.

## 10. Definition of Done

### 10.1 Issue 18 Documentation Completion

- [ ] All six documents reviewed and mutually consistent.
- [ ] Every FR/BR/AC has source provenance and planned test traceability.
- [ ] All blocking P decisions explicitly approved; no assumption masquerades as a fixed rule.
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

### 11.1 Proposed Decisions Requiring Approval

| Decision | Topic                            | Recommendation / unresolved point                                                                                                                                                  | Handout source                   | Status           |
| -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------- |
| D-01     | Action statuses/transitions      | PLANNED -> IN_PROGRESS/CANCELLED; IN_PROGRESS -> COMPLETED/CANCELLED; no terminal status reopening.                                                                                | 3.4, 6.1, 8.3, submission Part 6 | PENDING APPROVAL |
| D-02     | Assignment                       | Separate assignee from Ticket Owner; active IT_STAFF/ADMINISTRATOR targets; decide whether unassigned Actions are allowed.                                                         | 4.3, 4.4, submission Part 6      | PENDING APPROVAL |
| D-03     | Automatic performer              | Capture authenticated creator immutably and record editors/transition actors separately; confirm whether completion should determine performer instead.                            | 3, 8.3, 9.1                      | PENDING APPROVAL |
| D-04     | Action date/time                 | Server creation time for the required field; separately approve any editable actual-work date or future-date rule.                                                                 | 3, 8.3                           | PENDING APPROVAL |
| D-05     | Editing and append-only evidence | Current Action plus immutable revisions, no deletion; approve terminal amendments and role-specific history visibility.                                                            | 8.3, submission Parts 6-7        | PENDING APPROVAL |
| D-06     | Validation                       | Description 5-2000; Result up to 2000 and required for completion/cancellation; Follow-up Note required when true and up to 1000; Attachment Notes optional up to 1000; trim text. | 4.1, 8.3, 8.5                    | PENDING APPROVAL |
| D-07     | Resolution gate                  | Block PLANNED/IN_PROGRESS Actions and completed Actions with unresolved follow-up; cancelled Actions do not block; decide whether closure repeats the check.                       | 4.5, 6.1, 9 specification table  | PENDING APPROVAL |
| D-08     | Legacy zero-action Tickets       | Preserve existing permitted transitions; do not require invented historical work or a minimum one-Action rule.                                                                     | 5.2                              | PENDING APPROVAL |
| D-09     | Terminal-ticket Action writes    | Require reopening Resolved/Closed Tickets before new work; deny work-affecting writes on Cancelled Tickets, which have no inherited reopen path; amendment exceptions remain open. | 4.5, 6.1, 8.3                    | PENDING APPROVAL |
| D-10     | Concurrency and compatibility    | Action version and parent Ticket workflow version with transactions; approve token requirements, conflict payloads and changes to current-client requests.                         | 5.1, 6.1                         | PENDING APPROVAL |
| D-11     | Creation retries                 | Per-operation request key; identical replay returns the original result, changed payload with the same key produces a conflict.                                                    | 8.5                              | PENDING APPROVAL |
| D-12     | Metrics/time/order               | Use section 5.4 formulas, rolling seven days, one server asOf, UTC comparisons, Asia/Bangkok display, preview limit five and deterministic ties.                                     | 4.6, 6.2, 8.1-8.2                | PENDING APPROVAL |
| D-13     | Navigation/Admin metrics         | Add Dashboard links; approve initial landing page; initially omit optional Admin account-count cards.                                                                              | 4.6, 7                           | PENDING APPROVAL |
| D-14     | Schema/backfill/seed/recovery    | Additive data evolution, no invented historical Actions/events, stable seed identities, preservation-oriented new fixtures and backup-based recovery rehearsal.                    | 5.1-5.3                          | PENDING APPROVAL |
| D-15     | API details and safe errors      | Approve proposed paths/payloads, validation response shape, conflict codes and missing/unowned resource behavior against inherited safe-error rules.                               | 6, 6.1-6.2                       | PENDING APPROVAL |
| D-16     | Stable Action ordering           | Immutable createdAt ascending, then ID ascending; editing does not reorder a line.                                                                                                 | submission Part 7                | PENDING APPROVAL |

No decision is marked approved merely because Issue 18 document creation was authorized. Record approval evidence and date here before using a P rule for implementation.

Please approve or revise D-01 through D-16 before feature implementation; none is silently accepted.

### 11.2 Baseline Limitations and Prerequisites

**Gate: BLOCKED for feature implementation; documentation review can proceed.** Snapshot observed 2026-10-15; no fresh automated suites or database audit were run for Issue 18.

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

Gate release prerequisites: approve this contract; confirm protected-operation matrix and P decisions; verify a clean authoritative staging baseline in an isolated checkout; separately resolve migration prerequisites; verify regression/build/E2E commands against isolated test data. Do not sweep unrelated working-tree changes into the Issue 18 commit.

### 11.3 Earlier Contract References

- [Lab 2 specification](../lab-02/specification.md), [tests](../lab-02/tests.md), [UI](../lab-02/ui-spec.md), [API](../lab-02/api-spec.md).
- [Lab 3 specification](../lab-03/specification.md), [tests](../lab-03/tests.md), [UI](../lab-03/ui-spec.md), [API](../lab-03/api-spec.md).

Earlier artifacts/documents remain descriptions of their effective increments. Current regressions use the final application's authentication; historical selector/header evidence is not rewritten.
