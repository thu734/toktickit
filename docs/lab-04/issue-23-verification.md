# Issue 23 — Requester Dashboard verification

Date: 2026-10-16, Asia/Bangkok. GitHub task: [Issue 23 / #52](https://github.com/thu734/toktickit/issues/52).
Branch: `feature/23-lab4-requester-dashboard`. Approved origin/local staging baseline:
`801696f752dd56eadfcb7128714ef7deead7e3b7`, merge PR #62 for Issue 22.
Issues 18–22 are verified ancestors. Local staging was fast-forwarded before branching.

## Requirements and security audit

| Requirement | Implemented behavior and evidence |
| --- | --- |
| FR-12/14, BR-22/23, AC-17 | Requester-only GET `/api/dashboard/requester`; session-derived owner on every count/preview query. Active five-status set, waiting and currently-resolved counts. Up to five recent owned Tickets, updatedAt DESC then ID DESC, with no cutoff. All status buckets, old records, ties, bounds and two-owner isolation tested. |
| Snapshot / common asOf | One read-only Repeatable Read PostgreSQL transaction. First SELECT reads `transaction_timestamp()` and establishes the snapshot. A real concurrency test pauses AFTER the first count, commits a status/summary change and a new Ticket using another connection, then resumes. All original counts and previews remain unchanged; asOf equals the database-observed timestamp and precedes the concurrent commit boundary. A fresh request sees the new state. This is tested behavior, not an inference from choosing an isolation option. |
| Requester AC-19 | Active drill-down uses `statusGroup=active` in both database count and findMany WHERE clauses BEFORE skip/take. Fifteen active Tickets are verified over four pages despite newer inactive/foreign-owner records. Waiting/resolved filters match counts. Combined group/status filters intersect. Ordinary list behavior remains unfiltered. |
| Authentication/authorization | Anonymous/header-only requests return 401; locked accounts receive MUST_CHANGE_PASSWORD; Staff/Admin return 403. Inactive and changed-role sessions are rejected. Forged query/header identities cannot select another owner. Previews expose only five allowlisted fields, excluding notes, full descriptions, credentials and attachment paths. |
| D-13 / FR-17 | Requester Dashboard navigation with active-page indication; My Tickets remains Requester landing, Staff queue and Admin User Management remain their landings. Other roles receive no Requester Dashboard navigation. |
| Requester AC-20 | Loading and failures never fabricate zeros. Empty owners get three actual zeros and an empty preview. Retry/refresh and 401/403/lock feedback are tested. Old-account late responses are ignored, in-flight reads are aborted on account changes/unmount, and logout removes the data. |
| UI / relevant AC-23 | Zen Green/Bootstrap cards, textual statuses, semantic headings, labelled buttons, Enter/Tab operation, stacked responsive grid, wrapping long text and locale timestamp cue. Component tests verify structure/keyboard operation; browser geometry and final accessibility evidence are not claimed. |
| AC-22 affected regressions | Complete current server/client regression suites passed, including My Tickets/detail, authentication, comments, notes, attachments, Actions/workflow and Admin user management. Existing inherited tests were not weakened or rewritten. |

## Actual verification

| Command / check | Result |
| --- | --- |
| Initial dashboard API file | 15 tests passed |
| API dashboard + inherited list/requester focused run | 3 files / 24 tests passed |
| Drill-down + inherited My Tickets component focused run | 2 files / 9 tests passed |
| `npm test` from `server/` | 25 files / 586 tests passed, then 3 data files / 26 tests passed: 612 total |
| Final dashboard API run after strengthening exact database-asOf assertion | 1 file / 17 tests passed |
| `npm test --prefix client` | 20 files / 162 tests passed |
| Dashboard component / navigation / transport within client run | 18 / 7 / 3 tests passed |
| Drill-down component/transport within client run | 5 tests passed |
| `npx tsc --noEmit` from each of `server/` and `client/` | Both passed |
| `npm run build --prefix server` | Passed |
| `npm run build --prefix client` | TypeScript and Vite passed |
| `git diff --check` and baseline diff whitespace check | Passed |
| Browser E2E / screenshot evidence | Not run; assigned to later issues |

The full server run tested the final implementation; afterward only the snapshot test's assertions and documentation changed.
The strengthened 17-case API suite was rerun successfully. Verification corresponds to the tree finalized with this record,
after implementation commits `935c5a7`, `4ef3678`, and `12b78f0`.
All database-writing tests used guarded random `lab4_test_*` schemas in `toktickit_test` and existing migration/seed infrastructure.
No development database, new migration, schema, seed or historical artifact changes were made.
The client suite emits the existing AuthProvider React act warning; no failing tests remain.

## Changed files

- `server/src/app.ts`: dashboard router registration and server-side active group filtering.
- `server/src/routes/dashboard.ts`: Requester endpoint and safe failures.
- `server/src/services/requesterDashboard.ts`: snapshot metrics, bounded previews and drill-down descriptors.
- `server/tests/lab-04/requester-dashboard.api.test.ts`: calculations, ordering, ownership, authorization, failures, snapshot and pagination parity.
- `client/src/api.ts`: response/filter types, dashboard transport and list group encoding.
- `client/src/App.tsx`: requester tab, filter/detail navigation and ordinary-navigation reset.
- `client/src/components/AppShell.tsx`: requester-only active Dashboard navigation.
- `client/src/components/MyTicketsList.tsx`: initial filters and Active Tickets group.
- `client/src/components/RequesterDashboard.tsx`: dashboard cards, previews, data/recovery/session states.
- `client/tests/lab-04/RequesterDashboard.test.tsx`: rendering, states, callbacks, session isolation and keyboard checks.
- `client/tests/lab-04/requester-dashboard-navigation.test.tsx`: real shell/App/list/detail integration and preserved landings.
- `client/tests/lab-04/requester-dashboard-api.test.tsx`: session transport, cancellation and error handling.
- `client/tests/lab-04/requester-drilldown.test.tsx`: initial/clear filters and backend request encoding.
- `docs/lab-04/api-spec.md`: concrete representation, consistency policy and filter semantics.
- `docs/lab-04/ui-spec.md`: dashboard interaction/state details.
- `docs/lab-04/tests.md`: executed Issue 23 rows and traceability.
- `docs/lab-04/issue-23-verification.md`: this verification record.

## Scope, findings and later work

No missing Issue 23 requirement or implementation blocker was found in this audit.
No Staff/Admin Dashboard, workflow/Actions feature changes, schema/migration changes, analytics, exports,
SLA calculations or unrelated UI redesigns are included. Existing generated JS and cookies remain untracked and preserved.
Final accessibility/responsive browser verification belongs to Issue 26; dashboard E2E/screenshots and integrated
browser evidence belong to Issue 27; full release evidence belongs to Issue 28. These broader ACs remain pending.
Previously documented requester detail/attachment 403-versus-contract-404 discrepancies remain outside this issue.
No push, Pull Request, merge, force operation or reset was performed for this feature implementation.
