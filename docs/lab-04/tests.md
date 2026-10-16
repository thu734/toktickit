# Lab 4 - Planned Tests and AC Traceability

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** Issue 18 contract plus executed Issue 19 data/migration/seed evidence; API/UI/workflow/E2E implementation remains planned.
**Provenance:** R = Lab 4 requirement; I = inherited; A = user-approved implementation choice, not a handout mandate.
**Contract:** [specification.md](specification.md), [api-spec.md](api-spec.md), [ui-spec.md](ui-spec.md).

## 1. Test Strategy and Status Vocabulary

R: cover unit, API/integration, component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke and E2E. Plan before implementation, map every AC to concrete scenarios/paths and include failures/boundaries, not only happy paths.
I: preserve complete current Labs 1-3 regression; use sessions for current application tests while leaving accurate historical identity-header documentation intact.
A: D-01 through D-16 are explicitly approved by the user. Test fixtures and assertions must implement those choices; performance measurements are recorded on isolated data, without adding a new product timing promise.

PLANNED means no execution evidence; BLOCKED means a design/baseline prerequisite is unresolved; PASS requires an actual executed result and code revision. Only the completed Issue 19 data scenarios below have PASS evidence. The incomplete sample E2E row in the handout is an example, not supplied passing evidence.

## 2. Planned Test Matrix

All automated paths below are planned future files, except the explicitly inherited suite group; manual evidence is labelled separately. Issue 19 now supplies migration, seed and data-integrity tests; endpoint/UI tests still belong to later issues. The Requirement / AC column retains FR, BR and AC links; Expected Result is distinct from the test scenario. Final changes only after actual execution, and expected results use the approved decision register.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| ACT-API-01 | API/integration | FR-01, FR-02; BR-01, BR-02, BR-03, BR-06; AC-01, AC-02 | Create valid Action; second performer differs from Ticket Owner; parent relation, immutable creator and server creation time; later actor captured only in a minimal audit event. | Each valid Action is saved once under its Ticket with automatic authenticated attribution, including a performer different from Ticket Owner; edits/status changes preserve performer and creation time. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| ACT-SEC-01 | Authorization | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06; BR-03, BR-04, BR-05, BR-06, BR-08, BR-25; AC-03, AC-16 | Unauthenticated/header-only/locked/deactivated/demoted requests; Requester writes; unowned reads; Staff/Admin matrix; forged actor and wrong parent. | Permitted reads/writes succeed; missing authentication and forbidden roles/ownership fail safely, with no forged actor, private-note leak or wrong-parent update. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| ACT-VAL-01 | API/integration (boundaries) | FR-02, FR-03, FR-07, FR-08; BR-09, BR-10, BR-12; AC-04, AC-05, AC-09 | Missing/whitespace text, approved nonblank checks and maximum +/-1, follow-up true/false, result requiredness and invalid payload types. | Invalid inputs are rejected without saving invalid data; approved field errors and exact maximum boundary behavior are returned. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| ACT-ASSIGN-01 | API/integration | FR-04; BR-02, BR-07; AC-02, AC-06 | Active eligible assignee, different performer/owner, inactive and invalid target; null assignment and active Staff/Admin targets. | Approved active targets are accepted, inactive/ineligible targets are rejected, and assignee remains independent of Ticket Owner/performer. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| ACT-LIFE-01 | Unit / API/integration | FR-03, FR-05, FR-21; BR-11, BR-12, BR-13, BR-14; AC-07, AC-08, AC-09 | Every approved Action transition plus invalid/same/terminal transition; minimal append-only edit/transition events, deterministic ties and authorized completed Result/follow-up/Attachment Notes corrections; reject lifecycle/performer/date changes and all Action writes on terminal parent Tickets; verify Action ID/actor/time/type/changed-fields events. | Only the approved lifecycle transitions succeed; edits append minimal actor events; permitted completed corrections preserve COMPLETED, performer, creation time and ordering, without full snapshots or a history browser. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| ACT-CONFLICT-01 | API/integration (concurrency) | FR-03, FR-15; BR-17, BR-20; AC-10 | Two stale edits, assignment versus edit, and mandatory expected workflow revision, 409 mismatch, returned new revision and non-workflow token exemption; no lost update or orphan audit record. | Stale edits do not overwrite newer work; 409 is returned on stale revision, success returns the new revision, and non-workflow APIs do not require a token and no partial audit record remains. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| ACT-RETRY-01 | API/integration | FR-02, FR-16; BR-21; AC-11 | Repeated click/network replay creates one logical Action; different-payload key reuse; replay creates no extra audit event or revision increment. | A repeated logical create operation produces one Action; request-key/payload reuse follows the explicitly approved D-11 policy. | server/tests/lab-04/actions-taken.api.test.ts | PLANNED |
| WF-UNIT-01 | Unit | FR-09; BR-15; AC-12 | All eight Ticket statuses: every permitted and forbidden pair; unchanged inherited paths unless explicitly approved. | Every permitted pair is accepted and every forbidden/same-state pair rejected according to the final approved eight-status matrix. | server/tests/lab-04/ticket-transition.unit.test.ts | PASS (Issue 22) |
| WF-API-01 | Workflow | FR-09, FR-10, FR-11, FR-21; BR-15, BR-16, BR-17, BR-18, BR-19; AC-12, AC-13, AC-14, AC-15 | Direct gate bypass, zero Actions, unfinished/completed/cancelled/follow-up cases, closure/reopen policy, completed follow-up correction then resolution, and stable workflow evidence. | The backend enforces the gate for both RESOLVED and CLOSED, no Action writes on terminal Tickets, and zero-action legacy policy and advisory indication while preserving stable required workflow evidence; an audited follow-up correction removes the completed blocker without reopening its lifecycle. | server/tests/lab-04/ticket-workflow.api.test.ts | PASS (Issue 22) |
| WF-RACE-01 | API/integration (concurrency) | FR-10, FR-15; BR-17, BR-20; AC-10, AC-13 | Resolve versus Action create/edit/transition; exactly coherent outcomes, rollback on failure and no gate escape. | Competing Action and resolution writes yield a coherent approved outcome; no unnoticed overwrite, partial commit or resolution-gate escape occurs. | server/tests/lab-04/ticket-workflow.api.test.ts | PASS (Issue 22) |
| WF-SEC-01 | Authorization | FR-09, FR-17, FR-20; BR-03, BR-06, BR-25, BR-26; AC-12, AC-15, AC-16, AC-22 | Admin Staff-operation extension; Requester denied formal changes; Internal Notes remain private; inherited account checks. | Administrators receive the explicit Lab 4 Staff extension, Requesters cannot formally change status, and inherited activity/role/Note privacy remains enforced. | server/tests/lab-04/ticket-workflow.api.test.ts | PASS (Issue 22) |
| REQ-DASH-01 | API/integration (calculation) | FR-12, FR-14; BR-22, BR-23; AC-17, AC-19 | Independent fixture query reconciliation, cross-owner isolation, client-supplied identity ignored, all status buckets, drill-down parity. | Counts and previews match independent fixture queries, contain only session-owned Tickets and use identical drill-down filters. | server/tests/lab-04/requester-dashboard.api.test.ts | PASS (Issue 23) |
| REQ-TIME-01 | API/integration (boundaries) | FR-12, FR-14; BR-23; AC-17, AC-19, AC-20 | Recent-five limit and deterministic tie ordering, empty owner, fewer or more than five Tickets, timezone presentation contract and failed query distinct from zero. | Recent-five/no-date-cutoff and approved tie/timezone rules are exact; empty data returns zeros/empty previews and failed queries return safe errors instead of false zeros. | server/tests/lab-04/requester-dashboard.api.test.ts | PASS (Issue 23) |
| STAFF-DASH-01 | API/integration (calculation) | FR-13, FR-14; BR-02, BR-06, BR-22, BR-23; AC-18, AC-19 | Unassigned/current-owner/status/priority metrics; one My Actions preview scoped to assigned PLANNED Actions, excluding completed/cancelled/unassigned/other-assignee and historical performer-only records; Admin reuse; recent/urgent filters; independent query reconciliation. | Operational and current-user Action values match independent queries, include only PLANNED Actions assigned to the authenticated Staff/Admin in My Actions and use approved role/scope/drill-down rules. | server/tests/lab-04/staff-dashboard.api.test.ts | PLANNED |
| DASH-PERF-01 | Performance-smoke | FR-13, FR-14; BR-22, BR-23; AC-18, AC-19 | Approved large isolated dataset, bounded previews, no per-Ticket query loop, successful repeated reads; measured timing/query plan, recorded timings and query plan on the documented test environment. | Results remain correct and bounded with no per-Ticket query loop; reads succeed and measurements and query behavior are recorded without an invented product timing threshold. | server/tests/lab-04/dashboard-performance.test.ts | PLANNED |
| ACT-UI-01 | UI component | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-16, FR-18, FR-21; BR-04, BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-14; AC-01, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-11, AC-20 | List/create/view/edit, assignment, follow-up fields, busy/duplicate state, read-only Requester, retained form after failure and conflict. | Approved controls/modes and conditional validation work; Requester controls are read-only, duplicate clicks are handled and recoverable input is retained. | client/tests/lab-04/ActionsTaken.test.tsx | PLANNED |
| WF-UI-01 | UI component | FR-09, FR-10, FR-11, FR-15, FR-18; BR-15, BR-16, BR-17, BR-18, BR-19, BR-20; AC-10, AC-12, AC-13, AC-14, AC-15, AC-16, AC-20 | Permitted options, blocked resolution explanation, current status refresh, role controls and recoverable conflict input. | Only approved transitions are offered, blocked resolution is explained safely, successful changes refresh status and conflicts preserve recoverable input. | client/tests/lab-04/TicketWorkflow.test.tsx | PASS (Issue 22) |
| REQ-UI-01 | UI component | FR-12, FR-14, FR-17, FR-18; BR-22, BR-23; AC-17, AC-19, AC-20 | Correct labelled cards/previews, destinations, zero/loading/error/retry, no fabricated zero on failure. | Labels/values/previews and destinations agree with the contract; zero/loading/error/retry states remain distinct. | client/tests/lab-04/RequesterDashboard.test.tsx | PASS (Issue 23) |
| STAFF-UI-01 | UI component | FR-13, FR-14, FR-17, FR-18; BR-22, BR-23; AC-18, AC-19, AC-20 | Operational cards/current-user Action preview, Admin navigation, filter destinations and meaningful states. | Approved operational cards, current-user Actions, Admin navigation and drill-downs render correctly with meaningful processing/empty/failure feedback. | client/tests/lab-04/StaffDashboard.test.tsx | PLANNED |
| MIG-01 | Migration/regression | FR-19, FR-20; BR-01, BR-24, BR-26; AC-14, AC-21, AC-22 | Fresh SQL migration replay and representative Lab 2/3 upgrade: IDs, owners, data/file refs preserved; no fabricated history; approved recovery rehearsal. | Upgrade/fresh replay preserve prior IDs, ownership, records and file references, avoid fabricated history and pass the approved recovery rehearsal. | server/tests/lab-04/migration-regression.test.ts | PASS (Issue 19 data) |
| DATA-01 | Data integration / constraints | FR-02, FR-04, FR-06, FR-07, FR-15, FR-16, FR-19, FR-21; BR-01, BR-02, BR-08, BR-09, BR-10, BR-13, BR-14, BR-20, BR-21; AC-01, AC-04, AC-05, AC-07, AC-10, AC-11, AC-21 | FK integrity, nullable assignment, enum/bounds/conditional checks, immutable creator/time, append-only events, scoped retry uniqueness/original result, stable ordering/indexes and guarded test targets. | Persistence invariants hold; API authentication, active-role assignment, HTTP replay/409 and workflow races are not claimed by these storage tests. | server/tests/lab-04/actions-data-integrity.test.ts | PASS (Issue 19 data) |
| SEED-01 | API/integration (Seed integration) | FR-19; BR-24; AC-21 | Repeated Lab 4 seed runs; zero/one/multiple Actions; zero/nonzero dashboard cases; unrelated conversations/users/Tickets preserved according to approved policy. | Repeated seeds produce required fixtures without duplicates and preserve unrelated records according to the approved seed policy. | server/tests/lab-04/seed.test.ts | PASS (Issue 19 data) |
| REG-01 | Migration/regression (earlier labs) | FR-11, FR-17, FR-20; BR-03, BR-15, BR-16, BR-25, BR-26; AC-15, AC-16, AC-22 | Health/categories, auth/lock/logout, Requester tickets/search/filter/sort/page, attachments/removal/download, comments/notes, Staff queue/ownership/priority and Admin safety. | All inherited current-application regressions pass; only explicitly superseded Lab 4 expectations change, with no weakening or historical evidence rewrite. | Existing `server/tests/lab-01/` through `lab-03/`, `client/tests/lab-01/` through `lab-03/`, and `e2e/lab-02/`, `e2e/lab-03/` suites | PLANNED |
| STYLE-01 | UI style | FR-18; BR-25; AC-23 | Browser-computed tokens/read-only/shared-private cues; non-color status meaning; specify assertions, not screenshot-only proof. | Approved computed-style and non-color/shared-private/read-only cues are verified with real assertions rather than inferred from screenshot presence. | client/tests/lab-04/ZenGreenStyle.test.tsx | PLANNED |
| RESP-A11Y-01 | Responsive/accessibility | FR-18; BR-25; AC-20, AC-23 | Keyboard/focus/dialog/labels/feedback, approved viewports, zoom/narrow width, long content, overflow/geometry and manual visual checklist. | Approved viewports and long-content states remain keyboard usable, correctly labelled/focused and free of geometry/overflow defects; manual checklist is completed. | e2e/lab-04/accessibility-responsive.spec.ts | PLANNED |
| E2E-ACT-01 | E2E | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-16, FR-21; BR-01, BR-02, BR-04, BR-05, BR-06, BR-07, BR-08, BR-09, BR-11, BR-13, BR-14, BR-25; AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-11, AC-20, AC-24 | Staff/Admin create/assign/edit/complete/cancel; Requester all-current-line read-only view; different performers, inactive target, validation/failure evidence. | Full approved Action journeys and negative states succeed across permitted roles; captures follow assertions and Requesters cannot edit shared Action lines. | e2e/lab-04/actions-taken-flow.spec.ts | PLANNED |
| E2E-WF-01 | E2E | FR-09, FR-10, FR-11, FR-15, FR-20; BR-15, BR-16, BR-17, BR-18, BR-19, BR-20, BR-26; AC-10, AC-12, AC-13, AC-14, AC-15, AC-16, AC-22, AC-24 | Creation through resolution/closure or cancellation; direct gate enforcement evidence, advisory indication, stale conflict and inherited features. | Approved Ticket lifecycle, resolution/advisory/conflict behavior and inherited journeys pass with real assertions and traceable evidence. | e2e/lab-04/ticket-resolution.spec.ts | PLANNED |
| E2E-DASH-01 | E2E | FR-12, FR-13, FR-14, FR-17, FR-18, FR-20; BR-22, BR-23, BR-25, BR-26; AC-17, AC-18, AC-19, AC-20, AC-22, AC-23, AC-24 | Requester ownership, Staff/Admin counts/current-user Actions, database-query evidence, drill-downs, empty/failure and responsive layouts. | Owned/operational metrics match query evidence, drill-downs agree and approved empty/failure/responsive states pass end-to-end. | e2e/lab-04/dashboards.spec.ts | PLANNED |
| ART-01 | Artifact/document review | FR-18, FR-20, FR-21; BR-14, BR-26; AC-23, AC-24 | Required folders and three viewports; behavioral captures follow assertions; commit/run/AC traceability and preservation of earlier evidence. | Required screen/viewport evidence and AC/run/revision traceability are complete without replacing earlier artifacts or silently skipping captures. | Manual/document verification; no new artifact-validator feature is included | PLANNED |

## 3. Planned Paths and Issue Ownership

- API filenames: `server/tests/lab-04/actions-taken.api.test.ts` (Issue 20), `ticket-workflow.api.test.ts` (Issue 22), `requester-dashboard.api.test.ts` (Issue 23), `staff-dashboard.api.test.ts` (Issue 24).
- Additional unit/migration/seed/performance filenames above are planned under `server/tests/lab-04/` (Issues 19/20/22/24); they are not current repository files.
- Component filenames: `client/tests/lab-04/ActionsTaken.test.tsx` (Issue 21), `TicketWorkflow.test.tsx` (Issue 22), `RequesterDashboard.test.tsx` (Issue 23), `StaffDashboard.test.tsx` (Issue 24).
- Style filename is planned under `client/tests/lab-04/`; computed browser verification may be supplied by the browser suite during browser verification (Issue 26).
- Browser paths: `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts` (Issue 27), plus planned `accessibility-responsive.spec.ts` (Issue 26).
- Existing server/client/E2E suites retain their current paths. Issue 25 owns integrated regression/hardening; Issue 28 owns final-main evidence.

## 4. AC-to-Test Traceability

| AC | Planned test IDs | Status |
| --- | --- | --- |
| AC-01 | ACT-API-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-02 | ACT-API-01, ACT-ASSIGN-01, E2E-ACT-01 | PLANNED |
| AC-03 | ACT-SEC-01, E2E-ACT-01 | PLANNED |
| AC-04 | ACT-VAL-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-05 | ACT-VAL-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-06 | ACT-ASSIGN-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-07 | ACT-LIFE-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-08 | ACT-LIFE-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-09 | ACT-VAL-01, ACT-LIFE-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-10 | ACT-CONFLICT-01, WF-RACE-01, WF-UI-01, E2E-WF-01 | PLANNED |
| AC-11 | ACT-RETRY-01, ACT-UI-01, E2E-ACT-01 | PLANNED |
| AC-12 | WF-UNIT-01, WF-API-01, WF-SEC-01, WF-UI-01, E2E-WF-01 | PLANNED |
| AC-13 | WF-API-01, WF-RACE-01, WF-UI-01, E2E-WF-01 | PLANNED |
| AC-14 | WF-API-01, WF-UI-01, MIG-01, E2E-WF-01 | PLANNED |
| AC-15 | WF-API-01, WF-SEC-01, WF-UI-01, REG-01, E2E-WF-01 | PLANNED |
| AC-16 | ACT-SEC-01, WF-SEC-01, WF-UI-01, REG-01, E2E-WF-01 | PLANNED |
| AC-17 | REQ-DASH-01, REQ-TIME-01, REQ-UI-01, E2E-DASH-01 | PLANNED |
| AC-18 | STAFF-DASH-01, DASH-PERF-01, STAFF-UI-01, E2E-DASH-01 | PLANNED |
| AC-19 | REQ-DASH-01, REQ-TIME-01, STAFF-DASH-01, DASH-PERF-01, REQ-UI-01, STAFF-UI-01, E2E-DASH-01 | PLANNED |
| AC-20 | REQ-TIME-01, ACT-UI-01, WF-UI-01, REQ-UI-01, STAFF-UI-01, RESP-A11Y-01, E2E-ACT-01, E2E-DASH-01 | PLANNED |
| AC-21 | MIG-01, SEED-01 | PLANNED |
| AC-22 | WF-SEC-01, MIG-01, REG-01, E2E-WF-01, E2E-DASH-01 | PLANNED |
| AC-23 | STYLE-01, RESP-A11Y-01, E2E-DASH-01, ART-01 | PLANNED |
| AC-24 | E2E-ACT-01, E2E-WF-01, E2E-DASH-01, ART-01 | PLANNED |

Every FR and BR is linked in the matrix; every AC has at least one planned test. Refine separate case IDs for each boundary/role/race using the approved D-01..D-16 contract. IDs are Lab 4-local; references to earlier IDs must identify the earlier Lab.

## 5. Baseline Evidence and Gate

Committed baseline reference: origin/main 83bfc8f, readiness PR #46. Local staging/documentation branch derives from this reference. Existing modified screenshots/generated JS predate this task; exclude them from Issue 18 scope and do not delete or claim them as fresh evidence.

| Existing coverage | Observed committed structure | Evidence interpretation |
| --- | --- | --- |
| Server | 18 test files: Lab 1/2/3 = 2/5/11 | Lab 3 documentation records earlier 98-pass run; not rerun here |
| Client | 12 test files: Lab 1/2/3 = 1/4/7 | Earlier 50-pass record; not rerun here |
| E2E | 4 specs: Lab 2 = 1, Lab 3 = 3 | Earlier 21-pass record; no Lab 1 standalone browser suite |
| Artifacts | Lab 2: 19 PNGs/9 baseline; Lab 3: 31 PNGs/12 baseline | Existing structure only; screenshot names are not behavior proof |
| Builds | Server tsc; client tsc then Vite | Previous passing evidence; current Issue 18 creates no new build result |

Issue 18 baseline gate (historical): feature work required verified prerequisites; D-01 through D-16 are approved. Issue 19 results and remaining limitations are recorded below. Missing migration replay, default E2E isolation and style/responsive evidence are explicitly recorded, not disguised by green unit counts. Development migration history is an earlier environment-specific finding requiring revalidation. See [Baseline Limitations and Prerequisites](specification.md#112-baseline-limitations-and-prerequisites).

## 6. Future Execution Procedure and Isolation Prerequisites

These are documented intentions, not commands executed by Issue 18.

1. Use an isolated checkout of the exact approved staging revision; preserve the user's current files and historical artifacts.
2. Validate the test target before any schema/seed mutation; use only dedicated toktickit_test or an approved disposable test schema.
3. Run database-mutating suites sequentially when they share fixtures; isolate parallel suites by database/schema.
4. Run complete server/client tests and both builds, then focused authorization/workflow/race tests.
5. Replay actual migrations on disposable data separately from db push-based API fixtures.
6. Run full E2E only against verified isolated application servers and test data; current reuseExistingServer behavior cannot be assumed safe merely by setting DATABASE_URL.
7. Capture failures and exact counts; do not weaken, skip or conditionally bypass required assertions to make a run pass.
8. Record final-main output after approved release integration, with code revision and run links.

Existing command entry points to verify in the isolated checkout: `npm test --prefix server`, `npm test --prefix client`, `npm run build --prefix server`, `npm run build --prefix client`, and `npx playwright test --retries=0`. `npm test --prefix server` now runs existing tests and then `test:data`; fresh random schemas replay actual migrations. The root `npm run test:e2e` currently selects Lab 2 only. These are not a ready-to-run isolated E2E harness; correcting/documenting that harness belongs to later approved work. Both TEST_DATABASE_URL and application DATABASE_URL must identify the approved test target where applicable, and pre-existing servers must not be reused without verification.

## 7. Evidence and Artifact Strategy

R minimum future folders: artifacts/lab-04/screenshots/staff-dashboard/, requester-dashboard/, actions-taken/. A: desktop/tablet/mobile images per screen plus Action/workflow/dashboard failure and behavior cases; manifest identifies scenario, AC, viewport, tested code revision and run.
Assert the required state before capture; no empty early-return passes, no existing-file-based proof and no visibility-conditioned silent skips. Keep routine capture output separate from committed evidence. Earlier screenshots stay unchanged; fresh representative regression evidence belongs to a Lab 4 supplementary folder.

Performance smoke (R): document the isolated dataset/environment; verify bounded payloads, independent count correctness, no per-Ticket query loop and successful repeated reads. Record timings/query plans rather than inventing a pass threshold after seeing results.

## 8. Known Limitations / Deferred Execution

- D-01 through D-16 are explicitly approved; tests outside the completed Issue 19 data scope remain PLANNED and remaining baseline prerequisites still require verification.
- Issue 19 repairs migration/schema drift through separate forward SQL rehearsed only on disposable test schemas; development migration-history reconciliation remains outstanding.
- Current old-resource 403/404 behavior and conditional screenshot workflows need later verification/hardening against approved contracts.
- Existing style/responsive and Admin reset-to-next-login evidence is incomplete; plan actual cases in later issues instead of revising historical Lab 2 artifacts.
- reviewer.md is a placeholder; no peer verdict or PR exists for this documentation task.
- Issue 18 itself produced no execution evidence; Issue 19 data results below are separate. No Lab 4 screenshot/E2E or performance-budget claim is made.

## 9. Issue 19 Execution Evidence (2026-10-15)

Branch `feature/19-lab4-actions-data`, based on merged staging `7c2cfd7`; results refer to this uncommitted working tree, not a final-main release.

| Check | Exact result | Scope |
| --- | --- | --- |
| Existing server suites | 18 files, 98 tests passed | Complete Labs 1–3 suite, including 11 authorization regressions |
| Data suites | 3 files, 26 tests passed | 19 integrity, 3 migration/recovery, 4 seed tests |
| Server build | PASS | TypeScript compilation |
| Client suites | 12 files, 50 tests passed | Existing component regressions; one pre-existing React act warning |
| Client validation/build | PASS | tsc --noEmit and Vite production build; existing generated JavaScript preserved |
| E2E | NOT RUN | Existing reusable-server isolation remains a separate prerequisite; no Lab 4 E2E implementation |

Migration tests reproduce Category/categories drift, replay a representative Lab 2→3→4 upgrade, compare retained records and file references, confirm an empty Prisma schema diff after migration, verify seven applied migration records and rehearse dump/file recovery. An intentionally ambiguous Category/categories case must fail without removing either table. Historical migrations are unchanged.

Seed tests check all required scenarios, repeat-run equality including timestamps/password hashes/revisions, preservation after user edits, and concurrent first-run safety. Dedicated full-seed schemas contain eight Actions and matching audit/retry records; earlier-lab suites use the explicit baseline fixture profile so existing Ticket cleanup does not delete new evidence. No existing assertion was skipped or weakened.

Test infrastructure: `tests/lab-04/migrationTestDatabase.ts` validates toktickit_test and generated schema names before creating or dropping anything. `vitest.migrations.config.ts` runs the data suites without default setup; `tests/setup.ts` gives every earlier-lab file its own migrated schema and baseline seed. All schemas are removed after their suite. The old global db-push setup is no longer used by the active configuration. PostgreSQL psql/pg_dump are required for the disposable recovery test.

Issue 19 supports AC-01/04/05/07/10/11 through storage integrity and completes the data portion of AC-14/21/22. API role checks, active-assignee enforcement, lifecycle restrictions, gate races and HTTP revision/retry behavior still require Issues 20/22; dashboard calculations require Issues 23/24. Those matrix rows remain PLANNED. Development database reconciliation and a verified E2E server-isolation harness remain separate work.

## 10. Issue 22 Workflow Verification (2026-10-16)

The workflow unit/API/security/race/component rows now have execution evidence in
[issue-22-verification.md](issue-22-verification.md). API/component regression runs include Labs 1–3;
this does not mark final browser regression, accessibility, screenshot evidence or release criteria complete.
AC-to-test rows above retain their broader sprint status where later-issue verification remains outstanding.

## 11. Issue 23 Requester Dashboard Verification (2026-10-16)

REQ-DASH-01, REQ-TIME-01 and REQ-UI-01 have passed API/component/integration verification;
see [issue-23-verification.md](issue-23-verification.md) for exact commands, counts, scope and limitations.
The real PostgreSQL concurrency test pauses after one count, commits ticket changes on another connection,
then verifies that the remaining counts, previews and database-observed `asOf` retain the original snapshot.
Active-group parity is verified across four backend-paginated pages with interleaved inactive and foreign-owner tickets.
This does not complete Staff/Admin dashboard, final browser/style/accessibility, E2E or release acceptance.
