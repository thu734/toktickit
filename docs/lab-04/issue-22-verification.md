# Issue 22 — Ticket Workflow and Resolution Rules

Date: 2026-10-16 (Asia/Bangkok). Branch: `feature/22-lab4-ticket-workflow`.
Live origin and local staging baseline verified as `04a25fc591f85a62e5b6a4fb20eb0966495fab2c`,
merging Issue 21 PR #61. Issue 21 tip `b8c9cae` is an ancestor. Main was not modified.

## Behavior and requirement audit

| Contract / AC | Implementation and verification |
| --- | --- |
| FR-09, BR-15, AC-12 | Exact specification §5.2 matrix; all 64 pairs tested at unit level and through each Staff/Admin API role. Same-state and forbidden pairs return 400. |
| FR-10, BR-17, AC-13 | Both RESOLVED and CLOSED atomically reject PLANNED or COMPLETED-with-follow-up Actions with 409 and safe counts. CANCELLED Actions do not block. Audited completed corrections can clear follow-up without changing performer/time/status. |
| BR-18, AC-14 | Zero Actions permit matrix-approved transitions; no fabricated work or backfill. |
| BR-19 | Terminal-ticket Action writes rejected; RESOLVED/CLOSED must reopen, CANCELLED remains terminal. Ticket cancellation does not automatically cancel Actions. |
| FR-15, BR-20, AC-10 | Parent row serialization shared by owner/priority/status and Action mutations; mandatory expected revision; increment once on success; stale writes rejected. Resolve/create/edit/transition and owner/priority races tested. Reads return consistent list/revision snapshots. Database failure rolls back each workflow operation. |
| FR-11, BR-16, AC-15 | Requester indication still posts an owned public comment, with no status/revision change. No requester confirm/reject/formal-reopen feature is authorized. API and component checks cover advisory behavior. |
| BR-02/06, AC-16 | Staff and Admin can claim/reassign/unassign, set priority and perform formal transitions. Active Staff/Admin owner targets; one nullable owner independent of performer/Action assignee. Admin user management retained. |
| FR-16/18, workflow AC-20 | Allowed controls, safe blocker guidance, busy protection, status refresh, retained summary/comment/Action drafts, explicit conflict refresh/review, stale forbidden-target feedback and uncertain create retry preservation. API remains authoritative. |
| Inherited authorization | Session/current account activity/role, first-password lock, CSRF, requester formal-write denial, missing-resource safety, private-note isolation and server attribution verified. Existing Actions security/retry/append-only tests retained. |
| AC-22, affected regression portion | Full existing Labs 1–3 API/component regressions run. Only Lab 3 workflow revisions and explicit Admin permission expectations changed. Final integrated/browser regression remains later-issue work. |

No schema or migration changes. No owner-only workflow restriction, mandatory resolution summary,
extra cancellation gate, automatic Action completion/cancellation, new audit-history feature or additional transition was introduced.
Existing attachment/comment/note operations remain independent of workflow tokens.

## Verification

Tests run against approved fresh random `lab4_test_*` schemas in `toktickit_test`.
Existing committed migrations were replayed there by the existing guarded harness; only those temporary schemas were removed.
Development database and historical evidence were not changed.

The tested tree includes the audit changes committed with this document,
on top of backend commit `788432f` and UI commit `5a1913c`.

| Command / check | Actual result |
| --- | --- |
| `npm test --prefix server` (run from server as `npm test`) | 24 files / 569 tests passed, followed by 3 data files / 26 tests passed: 595 total |
| Workflow API file within that run | 150 tests passed |
| Exhaustive workflow unit file | 64 tests passed |
| `npm test --prefix client` | 16 files / 129 tests passed |
| Workflow component file within that run | 37 tests passed |
| Workflow client transport file | 4 tests passed |
| `npm run build --prefix server` | Passed |
| `npm run build --prefix client` | TypeScript and Vite passed |
| `git diff --check` | Passed |
| Browser / screenshot / E2E | Not run; later issue ownership preserved |

No required Issue 22 workflow, authorization, race, rollback, unit or component case remains unimplemented.
The complete sprint ACs that include browser/final regression evidence remain pending their owning issues.

## Scope and remaining boundaries

- `server/tests/lab-04/ticket-workflow.api.test.ts`: WF-API-01, WF-RACE-01, WF-SEC-01.
- `server/tests/lab-04/ticket-transition.unit.test.ts`: WF-UNIT-01.
- `client/tests/lab-04/TicketWorkflow.test.tsx`: WF-UI-01 plus requester and synchronization recovery.
- `client/tests/lab-04/workflow-api.test.tsx`: revision/CSRF/session transport and safe conflict details.
- Existing Actions UI/API/data tests remain authoritative for their previously implemented lifecycle and evidence behavior.
- Workflow journeys needed by `e2e/lab-04/ticket-resolution.spec.ts` are covered at API/component levels here:
  creation/operational transitions through resolve/close or cancel, reopen, direct gate rejection,
  advisory comments, stale conflicts and inherited comments/notes/attachments regressions.
  Creating/running final browser evidence remains Issue 27. No E2E execution claim is made.
- No dashboards, new migrations, accessibility campaign, screenshot regeneration, release integration, push, PR or merge.
- Known pre-existing requester detail/attachment 403-versus-contract-404 discrepancies remain outside this workflow change.
  Final Lab 4 regression/security acceptance cannot be inferred from the Issue 22 pass results.
- Client regression output includes the existing AuthProvider React `act(...)` warning.
- An initial Actions authentication regression returned an unexpected 404; its complete 207-case suite passed on rerun,
  and subsequent full server verification passed. It was not skipped or weakened.
