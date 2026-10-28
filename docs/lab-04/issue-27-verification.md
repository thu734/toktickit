# Issue 27 — Integrated E2E and submission Parts 5–9 candidate evidence

**Status: candidate gate PASS; ready for independent audit.** This is not final-main, release/startup certification, deployment smoke or a rendered submission PDF. Those remain Issue 28. GitHub [#56](https://github.com/thu734/toktickit/issues/56), logical Issue 27.

Work is in the original repository on `feature/27-lab4-e2e-artifacts`. Baseline HEAD `a8902031f23d6e1fc52a17dea69904dfa6e5c426` includes merged Issue 26; Issue 27 changes remain uncommitted. The baseline commit alone is not the tested implementation: the source fingerprint identifies the actual uncommitted source, tests, configuration and three contract documents. No commit/push/merge/PR was performed.

- Run: `issue-27-2026-10-23T12-37-24-458Z-3f77c2bd` (2026-10-23, Asia/Bangkok).
- Source/contract SHA-256: `0c82a24059d6c6238c259edbd489183c33a83058aa51605a6e7681e3a871d4f8`.
- Production build SHA-256: `dd90da4e1349ff6f9e1d57e3bef7ba87f3dd6c6ad05b4d664cbce9804ad903fe`.
- [Manifest](../../artifacts/lab-04/manifest.json): 18 captures, all AC-01–24 mappings, submission parts, roles, viewports, source/build/run identity and hashes; current `ui-spec.md` hash.
- [Structured results](../../artifacts/lab-04/regression/issue-27/integration-results.json): exact executed argument vectors and exit codes, every schema-readiness/reconciliation/disposal record.
- [Artifact validation and preservation map](../../artifacts/lab-04/regression/issue-27/artifact-validation.json).
- [DB/API/visible-UI table](../../artifacts/lab-04/regression/issue-27/dashboard-reconciliation.md) and [42 machine-readable observations](../../artifacts/lab-04/regression/issue-27/dashboard-reconciliation.json).

## Executed gate and isolation

Run `npm run test:lab4:integrated` from the repository root with the existing root/client/server dependencies, Chromium and the dedicated PostgreSQL `toktickit_test` database available. The exact commands are retained in structured results. The sequence is Prisma generation, separate production server/client builds, complete client suite, complete server suite including migration/data tests, client/server/integration TypeScript checks, the three integrated specs, the separate accessibility suite, whitespace/history/build-output checks, artifact validation, archival and publication.

| Check | Fresh result |
| --- | --- |
| Client regression | 28 files / **259 tests PASS**, no React act warnings |
| Server API/unit regression | 33 files / **662 tests PASS** |
| Migration/data/seed/recovery | 3 files / **26 tests PASS**; server aggregate 36 files / **688 tests** |
| Client/server production builds | PASS, run-specific output; existing `client/dist` and `server/dist` unchanged |
| Client/server/integration TypeScript `--noEmit` | PASS |
| Integrated browser | **21 PASS**: seven journeys × desktop/tablet/mobile, one worker, zero retries/skips/flaky/unexpected cases |
| Issue 26 frontend browser suite | **102 PASS**, zero skips/retries; explicitly intercepted frontend evidence |
| API-process readiness / independent disposal | **21/21 PASS** each; generated schema absent after each test |
| Selected metric comparisons | **42/42 PASS** across three viewports: database-derived = API = visible UI |
| Canonical capture metadata/hashes | **18/18 PASS** |
| Historical Labs 1–3 / existing build outputs | Unchanged |
| `git diff --check` | PASS; repeated after report updates |

Successful logs: [client](../../artifacts/lab-04/regression/issue-27/client-regression.txt), [server/data](../../artifacts/lab-04/regression/issue-27/server-regression.txt), [integrated browser](../../artifacts/lab-04/regression/issue-27/browser.txt), [frontend accessibility](../../artifacts/lab-04/regression/issue-27/accessibility.txt), [server build](../../artifacts/lab-04/regression/issue-27/server-build.txt), [client build](../../artifacts/lab-04/regression/issue-27/client-build.txt).

Every integrated case owns a random `lab4_test_*` schema in **toktickit_test**, replayed from all eight checked-in migrations with `migrate deploy`. No `db push`, development database, migration-history baseline/reset, existing-account credential or shared upload directory is used. A fresh built API/session store and temporary upload directory are owned per test; an independent Prisma client reconciles persisted state. Before binding the API, its own built Prisma client verifies database/schema identity, migration history/checksums, empty Prisma diff, eight SQL-only checks, three enabled triggers and both Ticket retry columns plus their unique index. Fresh replay and representative earlier-Lab upgrade/data preservation/seed/file recovery are separately exercised by the server data gate, not inferred from screenshot creation.

The frontend is a production build for the owned API `127.0.0.1:3107`, previewed at `127.0.0.1:5207`; `reuseExistingServer:false`, strict ports and a private test-process run header reject unidentified reuse. API process lifetime and schema disposal are asserted. Source/contract files must remain unchanged throughout the run. Canonical publication requires all integrated cases and the complete separate frontend suite to pass without skips or retries, complete capture metadata, matching hashes and metric reconciliation. Run-local traces, extra screenshots and partial logs stay under ignored `test-results/`; they are not canonical submission evidence.

The first resumed attempt stopped at a new login transport test that hardcoded the development API URL. It now checks the configured API URL, preserving credential/header/status assertions, so the isolated API origin is tested correctly. No evidence was published from that failed attempt. Earlier authoring/migration runs are historical; only the run above is current candidate evidence. `migration-verification.json` left locally at the regression root describes an earlier worktree-transfer check, not this execution; current migration proof is the complete server log and per-case readiness in structured results.

## Journeys and acceptance coverage

| Test / actual path | Current real integration proof |
| --- | --- |
| E2E-ACT-01 — `e2e/lab-04/actions-taken-flow.spec.ts` | Real Staff list/create/assign; distinct creator/assignee/Ticket Owner; Description/conditional Note validation and no insert; exact browser request replay without duplication; two Actions present while a normal PLANNED edit succeeds and persists; displayed ordering retained; completion/cancellation require Result and persist; authorized completed correction retains creation identity; existing events retained and new minimal events appended. Inactive/Requester assignees are absent from the browser lookup, invalid direct writes return 400 without Action/event/revision changes, Requester view is read-only and writes/private Notes are denied. |
| E2E-WF-01 — `e2e/lab-04/ticket-resolution.spec.ts` | Real Requester login/session, Ticket create 201 and reference/identity/priority/retry persistence, My Tickets/detail, idempotent replay and changed-payload conflict, Public Comment, advisory Problem Appears Resolved with formal NEW status retained, upload/download bytes, soft removal/actor/file preservation/focus, reload persistence, safe foreign/missing 404s and role denials. Existing fixture Tickets remain field-identical. |
| E2E-WF-02 — same file | Staff claim/reassign/priority; no permanent warning; selecting blocked resolution gives contextual guidance and disabled Save, while direct API returns 409 without mutation. PLANNED and completed-follow-up gates, one-click stale refresh/explicit review/no overwrite, permitted completed correction clearing follow-up, resolve/close/reopen/cancel and zero-Action legacy behavior persist. Terminal parents reject Action writes. |
| E2E-DASH-01 — `e2e/lab-04/dashboards.spec.ts` | Seven Requester-owned metrics and recent-five order reconcile independently; every metric drill-down matches actual response totals; attention-required work uses approved Waiting for Requester/Resolved destinations; foreign Ticket excluded and forged ownership parameter ignored. |
| E2E-DASH-02-staff/admin — same file | All fourteen operational metrics reconcile; current-user PLANNED Action IDs and recent order match independent SQL; status, priority and both assignment drill-down totals match; Action destination focuses the correct section. Role restrictions and forged performer/time handling are directly asserted. Admin additionally creates and edits a User through the browser; persisted role/active/password-change flags and unchanged password hash on ordinary edit are verified. Staff cannot access Admin APIs/navigation. |
| E2E-DASH-03 — same file | Genuine empty Requester and Staff/Admin datasets are distinct from actual expired-session 401s. Error hides misleading zero cards; reauthentication plus Retry recovers for all roles. Only known fixture Tickets in that case's isolated schema are removed. |

The common login helper checks the actual session cookie and `/api/auth/me` account, not just a visible profile. Core journeys do not intercept or mock API responses. This continuation adds no product behavior; the previously approved conflict-refresh, contextual workflow feedback, raw Ticket ID removal and startup corrections remain in the candidate source.

Append-only evidence refers to **audit events and immutable creation identity/time**, not editable Action fields. `server/tests/lab-04/actions-data-integrity.test.ts` additionally rejects audit UPDATE/DELETE and identity mutation. `actions-taken.contract.api.test.ts` covers the full lifecycle/validation/authorization matrix and timestamp ties before/after edits; `ticket-workflow.api.test.ts` and `ticket-transition.unit.test.ts` cover exhaustive Ticket transitions. These are supplemental real API/database assertions, not invented browser coverage.

## Submission Parts 5–9

The official handout section 14, pages 10–11, is the evidence contract. Issue 27 prepares candidate evidence; Issue 28 owns final-main verification and final rendered submission assembly.

| Part / points | Evidence status and exact boundary |
| --- | --- |
| **5 / 5** — approved metrics, current-user Actions, recent or urgent Tickets, accurate counts, drill-down, loading/empty/forbidden/safe-failure/responsive behavior, selected DB matching | **Candidate evidence complete.** DASH-02 proves recent Tickets (the handout permits recent **or** urgent), metrics, preview scope, status/priority/assignment/Action destinations and DB/API/UI agreement. DASH-03 proves real empty/session-error/retry. Requester→Staff Dashboard 403 and other direct role denials are real API evidence. Loading, permission-feedback rendering, generic 500/network presentation and retry remain explicitly controlled frontend evidence in `client/tests/lab-04/StaffDashboard.test.tsx` and the current Issue 26 suite; no transport fault injection claim. Staff baselines cover all viewports. |
| **6 / 10** — list/create/assign/edit/status/complete/cancel/validation/inactive assignee/roles/safe failures/responsive/multiple Actions | **Candidate evidence complete.** ACT-01 now includes normal successful edit with two rendered lines, persisted outcomes, inactive-option absence and real rejection/no mutation. WF-02 provides real stale failure and recovery; controlled generic read/save failures remain `ActionsTaken.test.tsx`/frontend evidence. Three-viewport list, validation form and Requester read-only captures supply visual evidence. Completed/cancelled lines share one capture per viewport; no duplicate outcome screenshots are needed. |
| **7 / 5** — permitted transitions, stable ordering, append-only behavior, role visibility | **Candidate evidence complete.** WF-02 and full API transition matrices prove gates/clearance and permitted outcomes; ACT-01 proves stable displayed order after editing and retained prior audit events. API/data suites prove timestamp ties, immutable identity and audit write protection. Shared/read-only versus private Notes is tested with a second real Requester context and direct HTTP denials. |
| **8 / 5** — owned Requester metrics/recent/attention/drill-down/ownership plus auth, My Tickets, detail, Attachments, Comments, Staff, Notes and Admin regression | **Representative candidate evidence complete.** DASH-01 and WF-01 cover Requester concerns; the advisory action remains advisory. ACT/WF cover Staff and private Notes; DASH-02-admin now proves actual account Create/Edit rather than navigation alone. Complete current server/client suites supplement the representative browser journeys. Full historical browser and final-main regression completion are not claimed. |
| **9 / 5** — rendered ui-spec plus desktop/tablet/mobile major-screen captures and completed visual/accessibility checklist | **Issue 27 candidate captures/checklist/source linkage complete.** Eighteen asserted current-source PNGs and the checked checklist below; detailed keyboard/contrast/geometry/breakpoint/zoom/dialog checks remain the fresh separate 102-case frontend suite. Current `ui-spec.md` hash is recorded in the manifest. **Rendered specification, final human submission-scale review and PDF assembly remain Issue 28**, so the final submission Part 9 is not declared complete. |

DB evidence is not a screenshot inference. DASH-01 reads owned SQL rows ordered by updatedAt/id; DASH-02 independently reads all Ticket rows and PLANNED assigned Actions ordered by createdAt/id. Counts are derived from those query results without importing production calculation helpers, then compared with API values and visible text. In the reconciliation table, active means NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER or REOPENED. Selected values include Requester active **5**, Staff unassigned active **4**, Staff assigned active **2**, Admin assigned active **0**, NEW **2**, URGENT **2**, and five current-user planned previews. All 42 observations match.

## Canonical captures and preservation

All captures follow scenario assertions plus expected alert/busy/font/overflow checks. Screenshot presence is not proof of accessibility, authorization, counts or persistence. Viewports are desktop **1280×720**, tablet **800×900**, mobile **390×844**. Fourteen existing canonical files were refreshed for current source and complete-run provenance; four useful narrow-screen files were added. No image manipulation or screenshot-only assertions were introduced.

The superseded run `issue-27-2026-10-23T07-53-05-007Z-90b5a178` is preserved locally, not tracked in the feature branch or included as current submission evidence. Its 25 files (14 PNGs, prior manifest/report, eight regression files and the archive warning README) were backed up and hash-verified under `.git/issue27-evidence-backups/historical-cleanup-20261023T140241Z-5e232593/archive` before removal from Git tracking. The original archive files also remain locally. The preservation map records former tracked paths, local backup locations and hashes; it does not claim that the archive is available in a fresh clone. Current Staff Ticket Detail captures remove the raw ID and permanent warning, with contextual guidance only for a selected blocked target. Exact screenshot old/new hashes remain in artifact-validation.json. Historical Lab 1–3 artifacts remain untouched.

Packaging correction after scoped staging: only extra blank lines at EOF were removed from `client-regression.txt`, `server-build.txt` and `server-regression.txt` in the current evidence folder and the now-local-only previous-run archive (six logs total). Log content, results and timestamps are unchanged. All six original byte streams remain backed up under `.git/issue27-evidence-backups/eof-20261023T134103Z-75de989e`. The preservation map retains the three normalized historical log hashes alongside original hashes and local-only locations. `artifact-validation.json` records the normalization and subsequent archive removal. No suites were rerun and no captures or source/build identities were changed.

| Current artifact | Role | Submission parts | Change |
| --- | --- | --- | --- |
| [actions-taken/baseline-desktop.png](../../artifacts/lab-04/screenshots/actions-taken/baseline-desktop.png) | IT_STAFF | 6, 7, 9 | Refreshed |
| [actions-taken/baseline-mobile.png](../../artifacts/lab-04/screenshots/actions-taken/baseline-mobile.png) | IT_STAFF | 6, 7, 9 | Refreshed |
| [actions-taken/baseline-tablet.png](../../artifacts/lab-04/screenshots/actions-taken/baseline-tablet.png) | IT_STAFF | 6, 7, 9 | Refreshed |
| [actions-taken/blocked-resolution-desktop.png](../../artifacts/lab-04/screenshots/actions-taken/blocked-resolution-desktop.png) | IT_STAFF | 6, 7, 9 | Refreshed |
| [actions-taken/requester-read-only-desktop.png](../../artifacts/lab-04/screenshots/actions-taken/requester-read-only-desktop.png) | REQUESTER | 6, 7, 8, 9 | Refreshed |
| [actions-taken/requester-read-only-mobile.png](../../artifacts/lab-04/screenshots/actions-taken/requester-read-only-mobile.png) | REQUESTER | 6, 7, 8, 9 | Added |
| [actions-taken/requester-read-only-tablet.png](../../artifacts/lab-04/screenshots/actions-taken/requester-read-only-tablet.png) | REQUESTER | 6, 7, 8, 9 | Added |
| [actions-taken/stale-conflict-desktop.png](../../artifacts/lab-04/screenshots/actions-taken/stale-conflict-desktop.png) | IT_STAFF | 6, 7, 9 | Refreshed |
| [actions-taken/validation-desktop.png](../../artifacts/lab-04/screenshots/actions-taken/validation-desktop.png) | IT_STAFF | 6, 9 | Refreshed |
| [actions-taken/validation-mobile.png](../../artifacts/lab-04/screenshots/actions-taken/validation-mobile.png) | IT_STAFF | 6, 9 | Added |
| [actions-taken/validation-tablet.png](../../artifacts/lab-04/screenshots/actions-taken/validation-tablet.png) | IT_STAFF | 6, 9 | Added |
| [requester-dashboard/baseline-desktop.png](../../artifacts/lab-04/screenshots/requester-dashboard/baseline-desktop.png) | REQUESTER | 8, 9 | Refreshed |
| [requester-dashboard/baseline-mobile.png](../../artifacts/lab-04/screenshots/requester-dashboard/baseline-mobile.png) | REQUESTER | 8, 9 | Refreshed |
| [requester-dashboard/baseline-tablet.png](../../artifacts/lab-04/screenshots/requester-dashboard/baseline-tablet.png) | REQUESTER | 8, 9 | Refreshed |
| [staff-dashboard/administrator-desktop.png](../../artifacts/lab-04/screenshots/staff-dashboard/administrator-desktop.png) | ADMINISTRATOR | 5, 9 | Refreshed |
| [staff-dashboard/baseline-desktop.png](../../artifacts/lab-04/screenshots/staff-dashboard/baseline-desktop.png) | IT_STAFF | 5, 9 | Refreshed |
| [staff-dashboard/baseline-mobile.png](../../artifacts/lab-04/screenshots/staff-dashboard/baseline-mobile.png) | IT_STAFF | 5, 9 | Refreshed |
| [staff-dashboard/baseline-tablet.png](../../artifacts/lab-04/screenshots/staff-dashboard/baseline-tablet.png) | IT_STAFF | 5, 9 | Refreshed |

## Exact files changed in this continuation

The existing three-spec design is retained. This continuation changed the following source/test/documentation files; `ticket-resolution.spec.ts`, the detailed frontend suite and previously approved product/startup corrections were exercised without further product edits:

- `e2e/lab-04/actions-taken-flow.spec.ts`
- `e2e/lab-04/dashboards.spec.ts`
- `e2e/lab-04/fixtures/integration.ts`
- `e2e/lab-04/fixtures/integration-server.mts`
- `playwright.integration.config.ts`
- `scripts/lab4-e2e.mjs`
- `client/tests/lab-04/api-error-safety.test.tsx`
- `docs/lab-04/ui-spec.md`
- `docs/lab-04/tests.md`
- `docs/lab-04/issue-27-verification.md`

Generated current evidence is `artifacts/lab-04/manifest.json`, the 18 PNG paths listed above, and these files under `artifacts/lab-04/regression/issue-27/`:

- `browser.txt`, `accessibility.txt`, `server-build.txt`, `client-build.txt`, `server-regression.txt`, `client-regression.txt`.
- `integration-results.json`, `dashboard-reconciliation.json`, `dashboard-reconciliation.md`, `artifact-validation.json`.
- Superseded historical evidence is excluded from tracked submission files. Its 25-file local-only backup inventory and hashes are recorded in `artifact-validation.json`; no current screenshot links depend on that archive.

Unrelated existing dirty documentation, generated JavaScript, cookie files and the temporary worktree were not moved, cleaned, staged or changed by this continuation. Current run build output is ignored/run-specific; existing dist outputs were checked unchanged. No separate authorization spec, new product route or further helper family was added.

## Current candidate visual/accessibility checklist

Codex inspected all 18 actual current-run PNGs. Checked items record targeted inspection and automated evidence, not a human reviewer's approval, general WCAG certification or spoken screen-reader testing.

- [x] Zen Green buttons, forms, cards, badges and navigation remain consistent; no redesign/new visual feature.
- [x] Both dashboards retain readable metric hierarchy, responsive columns/stacks, previews and clear labels across desktop/tablet/mobile.
- [x] Actions list/create-validation/Requester read-only surfaces wrap; completed/cancelled states, creator/assignee and shared/private cues are textual.
- [x] Editable/read-only fields, automatic attribution, first-invalid feedback and validation placement are clear; focused invalid fields remain visible.
- [x] Keyboard focus, header contrast with effective opacity, dialog entry/trap/Escape/inert background/restoration, busy Admin dismissal, attachment-removal focus and Create Ticket headings/names pass the current separate frontend suite.
- [x] Current contextual resolution guidance appears after target selection with disabled Save; ordinary OPEN viewing has neither the permanent warning nor a raw Ticket ID.
- [x] No obvious clipping/overlap observed in the 18 captures; each canonical capture asserts no horizontal page overflow. Detailed long-content, breakpoint and real zoom/reflow checks remain in the separate frontend suite, not inferred from PNG dimensions.
- [x] Stale conflict screenshot retains the draft and explains refresh/review; real browser/DB assertions, rather than another screenshot, prove successful recovery and no overwrite.

Human review of ordinary-content readability/density and final PDF-scale excerpts remains separate. Long mobile full-page PNGs should be displayed at native width for review and excerpted/readably arranged by Issue 28 rather than squeezed into unreadable PDF thumbnails.

## AC mapping and Issue 28 handoff

The manifest maps every AC-01–24 to the executed integrated journey and supplemental test IDs. AC-01–20 have real representative integration plus boundary matrices; AC-21 has the separately executed migration/data gate; AC-22 has complete current server/client regression and representative inherited browser evidence; AC-23 has separate frontend plus integrated viewport evidence; **AC-24 candidate artifact/traceability work passes**. Final-main/release versions of those claims remain pending Issue 28.

Do not run the historical Labs 2–3 Playwright defaults for canonical evidence: they reuse servers, allow CI retries and contain environment/visibility-conditioned scenarios with historical screenshot destinations. They were preserved, not refactored or rerun. No new authorization spec or family of fixture scripts was needed; the existing three specs/two fixtures/config/runner were extended.

The previously approved development/startup correction explicitly loads development configuration and points production start at `dist/src/index.js`; its focused smoke is documented in README. This gate uses the real built app in owned test processes and **does not certify final production startup or deployment**. Issue 28 must verify the actual final entrypoint, deployment environment and schema before release smoke. No new product change or startup/release work was added during this evidence continuation.

Issue 28 remaining work: approved integration; complete final-main regression and source/run reconciliation; actual startup/deployment/fresh-setup smoke with intended schema/migrations; human final visual review; rendered current ui-spec and final PDF Parts 1–9 with readable screenshots/working links; reviewer/final submission assembly. None is silently marked complete here.
