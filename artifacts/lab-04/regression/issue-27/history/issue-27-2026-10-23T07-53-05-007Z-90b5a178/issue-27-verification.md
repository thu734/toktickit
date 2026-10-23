# Issue 27 — Integrated E2E and canonical evidence

GitHub [#56](https://github.com/thu734/toktickit/issues/56), logical Issue 27. Candidate implementation on `feature/27-lab4-e2e-artifacts`, based on merged staging `a8902031f23d6e1fc52a17dea69904dfa6e5c426`. No commit or push is part of this implementation.

Status: implementation and the complete candidate gate PASS; ready for independent audit, with release-startup and final-main boundaries noted below. The final run identity, source fingerprint, results and artifact hashes are recorded in [manifest.json](../../artifacts/lab-04/manifest.json) and [integration-results.json](../../artifacts/lab-04/regression/issue-27/integration-results.json). HEAD is the baseline revision; the fingerprint identifies the uncommitted implementation and tests. It covers checked-in/untracked non-ignored client, server, E2E, scripts, Playwright configs and root package files. A source change during execution blocks publication. Documentation and generated artifacts are outside that fingerprint.

## Reproduce and isolation

Install the three existing dependency sets with `npm ci`, `npm ci --prefix client`, `npm ci --prefix server`, and install Chromium with `npx playwright install chromium` if absent. PostgreSQL must provide the dedicated `toktickit_test` database and the test role must be allowed to manage generated schemas there. `TEST_DATABASE_URL` is optional; the existing guarded helper's default is used otherwise. A different database name is rejected before connecting or mutating data. No development `.env` or development API is needed.

Run `npm run test:lab4:integrated`. It executes, in order:

1. `npm exec --prefix server -- prisma generate --schema server/prisma/schema.prisma`.
2. `npm run build --prefix server`.
3. `VITE_API_URL=http://127.0.0.1:3107 npm run build --prefix client`.
4. `npm test --prefix client`.
5. `npm test --prefix server` — the complete API/unit suite, then `test:data` for real fresh replay, representative earlier-Lab upgrade/preservation, idempotent seed, data integrity and backup/file-byte recovery.
6. `npm exec --prefix client -- tsc --noEmit --project client/tsconfig.json`.
7. Explicit TypeScript `--noEmit` for the new specs, fixture/process and config using the existing server TypeScript and Node types; the full argument vector is in `integration-results.json`.
8. `node node_modules/@playwright/test/cli.js test --config playwright.integration.config.ts`.
9. Validate 21 single-attempt results, zero skips/failures/flaky results, required readiness/reconciliation/cleanup attachments, unchanged source fingerprint, nine baseline captures, and artifact SHA-256 hashes; publish only this complete successful run.

`npm run test:a11y` is run separately to recheck Issue 26. It is explicitly **intercepted frontend evidence**, not an integrated backend/database check. `git diff --check` is the final whitespace check.

The new config starts an owned production Vite preview on `127.0.0.1:5207` with `reuseExistingServer:false` and strict port binding. It rejects a frontend bundle not built for `127.0.0.1:3107`. Each test starts its own API child on that API port, checks its private run header through the existing health route, and owns a fresh random schema plus upload directory. A port collision fails rather than using an unidentified service. One worker and a new schema/API/session store per test prevent cross-test mutation. The fixed ports also prevent concurrent runs from accidentally sharing services.

The test-only process reuses `server/tests/lab-04/migrationTestDatabase.ts`. It replays the eight unchanged checked-in migrations with `migrate deploy`, then uses **the built API's own Prisma client** to check database/schema identity, exact completed migration history and SQL checksums, empty Prisma schema diff, SQL-only check constraints and enabled triggers, both Ticket retry columns and their unique index. Only after readiness passes does it bind the API port. No `db push`, migration-history baselining, reset, development database mutation, or product diagnostic endpoint is introduced. The previous development P2022 incident was schema drift, not an Issue 26 frontend regression.

Test accounts and representative current-state Tickets are inserted only into that owned schema. Passwords are known, hashed test credentials with no fallback to personal/development accounts. Browser login, cookies, UI reads/writes, direct HTTP denials and subsequent independent Prisma/SQL observations use the real application. Core requests are neither mocked nor intercepted. Only known fixture Tickets are removed in the empty-operational-data scenario, before exercising actual zero-data responses. Teardown closes the owned API, disconnects Prisma, disposes its random schema/temp files and independently asserts the schema is gone. No public/shared schema is dropped.

## Minimal implementation and one reproduced defect

| File | Purpose |
| --- | --- |
| `e2e/lab-04/actions-taken-flow.spec.ts` | Staff create/assign/edit/complete/cancel/correct, validation, inactive/ineligible assignment, retry/conflict, immutable attribution/order/events, shared Requester read-only and private-note exclusion. |
| `e2e/lab-04/ticket-resolution.spec.ts` | Requester creation/retry/persistence/comments/advisory/attachment bytes/removal/ownership; Staff claim/reassign/priority/gates/stale recovery/resolution/closure/reopen/cancel and zero-Action policy. |
| `e2e/lab-04/dashboards.spec.ts` | Requester/Staff/Admin SQL reconciliation and browser drill-downs, current-user planned Actions, Admin navigation, role denials, genuinely empty data and expired-session/retry for all three roles. |
| `e2e/lab-04/fixtures/integration.ts` | Shared process lifecycle, independent query client, browser login/navigation and asserted run-local capture; no separate authorization helper/spec is needed. |
| `e2e/lab-04/fixtures/integration-server.mts` | Private child-process bridge to the existing migration helper and the built API. Required because API Prisma and session-store singletons must use exactly one isolated database per process. Adds no product route. |
| `playwright.integration.config.ts` | Separates real integration from the intercepted Issue 26 config and unsafe historical server-reuse defaults. Three projects, one worker, zero retries, no skips. |
| `scripts/lab4-e2e.mjs`; root `package.json` | One reproducible build/regression/integration/publication command, complete-run gate, fingerprints, manifest and durable results. No parallel family of setup/seed/reset/manifest scripts. |
| `client/src/components/ActionsTaken.tsx`; `client/tests/lab-04/ActionsTaken.test.tsx` | Narrow existing-behavior correction and one regression test, described below. |
| This report; `docs/lab-04/tests.md` | Current execution/AC traceability and explicit evidence boundaries. |

The real stale-update test exposed a race that isolated component mocks had missed: `refreshConflict()` refreshes the parent Ticket; the parent's new revision then starts an automatic Action read, superseding the explicit recovery read. The first click remains in the locked refresh state. The correction gives the explicit refresh ownership of both reads, while retaining authoritative reloads, mandatory review, draft retention and server revision checks. The added parent-component harness reproduces the failure before the correction and passes afterward; the browser asserts one click reaches review, the draft survives, newer attachment notes survive and the reviewed completion persists. No workflow/role/business rule changed. The regression test awaits asynchronous updates; it does not suppress React warnings.

## Executed results

Final run: `issue-27-2026-10-23T07-53-05-007Z-90b5a178`, browser start `2026-10-23T07:54:39.332Z`; browser duration 115.586 seconds. Baseline revision: `a8902031f23d6e1fc52a17dea69904dfa6e5c426`; source SHA-256: `31baae96e4c348abd8e7b44b29aa6c9e00287bd1ac2cf139ef38a295895a9490`. The fingerprint was independently recomputed after publication and matched; all 14 copied PNG hashes also matched.

| Check | Fresh result |
| --- | --- |
| Integrated browser | **21 PASS**, zero skipped, unexpected, flaky or retried results; configuration verified at one worker / zero retries |
| Complete client | **28 files / 250 tests PASS**; one additional conflict-refresh regression compared with Issue 26; no React `act(...)` warning |
| Complete server API/unit | **33 files / 662 tests PASS** |
| Separate migration/data/seed/recovery | **3 files / 26 tests PASS** — server aggregate **36 files / 688 tests** |
| Server/client production builds | **PASS / PASS** |
| Client and integration TypeScript `--noEmit` | **PASS / PASS** |
| API-process schema readiness | **21/21 PASS**: database/schema identity, eight migrations/checksums, empty schema diff, SQL constraints/triggers, retry columns/index |
| Independent reconciliation / schema disposal | **21/21 observations each**; all 21 owned schemas independently confirmed absent after teardown |
| Canonical artifacts / AC mapping | **14 PNG hashes PASS**; nine baselines plus five behaviors; **24 AC mappings** |
| Final `git diff --check` | **PASS** |
| Historical artifacts / development database | Historical diffs empty; development database not used or mutated |

Separate fresh Issue 26 rerun: **96 passing**, zero skips/retries, approximately two minutes, recorded in [accessibility.txt](../../artifacts/lab-04/regression/issue-27/accessibility.txt). This remains frontend-only evidence.

The first authoring attempts failed on new test assumptions: Staff Search requires submitting the form, pagination totals are under `pagination.totalItems`, the Attachments heading includes spaced counts, soft-removed downloads return the inherited documented HTTP 410, and a Staff success banner is an alert. Those assertions were corrected to the existing contract. The real conflict race above was separately reproduced and corrected; no second-click workaround, silent skip, broad catch, assertion removal or visibility-conditioned pass was used. Failed/partial runs remain under ignored `test-results/` and are not current canonical evidence.

## Journeys and independent reconciliation

- **E2E-ACT-01:** Staff Action performer, assignee and Ticket Owner differ. Browser validation causes no DB insert. Exact browser-create replay returns the original result without another Action, event or revision. Changed-payload key reuse is 409. Completion/cancellation require Result; permitted completed correction preserves actor/time/state. Persisted events are CREATED/COMPLETED/CORRECTED; list IDs remain ordered. Inactive/Requester assignees, forged immutable edits and cancelled-state transitions fail without revision changes. A real second Requester browser sees shared fields, no mutations and no private Internal Note; direct writes/Note access are 403.
- **E2E-WF-01:** A Requester logs in and creates a Ticket through the UI with 201; SQL/Prisma verifies owned Category/System IDs, initial priority and retry hash. Replay is one Ticket; changed key payload is 409. My Tickets/detail, public comment, advisory comment without formal status change, upload/download byte equality, soft-removal audit actor/file preservation and heading focus are asserted. Reload retrieves persisted content. Missing/unowned resources share safe 404 behavior, identity headers cannot authenticate, Staff/Admin operations are denied, dashboard drill-down sees the new Ticket, and pre-existing fixture Tickets remain field-identical.
- **E2E-WF-02:** Claim/reassign/priority and permitted transitions use the UI. A PLANNED Action blocks both the UI option and direct API resolution atomically; completed follow-up also blocks. Two real sessions produce a stale 409; the UI retains, refreshes and explicitly reviews the draft before completion. Audited correction clears follow-up while preserving COMPLETED identity/time. Resolution/closure/reopen, terminal Action write denial, Ticket cancellation and zero-Action resolution are asserted against persistence.
- **E2E-DASH-01:** Seven owned counts and recent-five ordering are computed from independent SQL rows, without importing production dashboard calculations. All seven browser drill-down responses reconcile with expected totals. Another owner's Ticket stays absent; a forged requester query does not change scope.
- **E2E-DASH-02-staff/admin:** All fourteen metric values reconcile to SQL. Status/priority drill-down browser responses reconcile to SQL totals; active-owner filters and current-user Action focus destinations are asserted. Planned assigned preview IDs/order/bounds are independently queried, excluding completed and other-assignee/performer-only work. Create requests cannot forge performer/time. Admin can use Staff APIs and User Management; Staff cannot use Admin APIs and these roles cannot use the Requester Dashboard.
- **E2E-DASH-03:** Real empty Requester and operational datasets are distinct from a real expired-session 401. All three roles show an error rather than fabricated zero metrics, then recover through real reauthentication and Retry. No response interception is used.

The durable structured results retain each test's own schema-readiness, database-reconciliation and schema-disposal observations. The fresh migration/representative earlier-Lab upgrade/recovery tests are a **separate server gate**, not a claim that every browser test runs against every historical schema version. Browser tests always use the current replayed schema. Complete lifecycle/race/maximum-boundary matrices remain API/unit coverage rather than being duplicated in browser specs.

## Canonical capture and AC-24

[manifest.json](../../artifacts/lab-04/manifest.json) records every capture's scenario, role, ACs/test title, viewport, baseline revision, implementation fingerprint, run ID, result and SHA-256. It also maps all AC-01–24 to integrated and supplemental evidence, with AC-22's release boundary explicit.

Nine baseline captures, each at desktop **1280×720**, tablet **800×900**, mobile **390×844**:

- `artifacts/lab-04/screenshots/requester-dashboard/baseline-{desktop,tablet,mobile}.png`
- `artifacts/lab-04/screenshots/staff-dashboard/baseline-{desktop,tablet,mobile}.png`
- `artifacts/lab-04/screenshots/actions-taken/baseline-{desktop,tablet,mobile}.png`

Five desktop behavioral captures add nonredundant evidence:

- `staff-dashboard/administrator-desktop.png`
- `actions-taken/validation-desktop.png`
- `actions-taken/requester-read-only-desktop.png`
- `actions-taken/blocked-resolution-desktop.png`
- `actions-taken/stale-conflict-desktop.png`

Each screen is captured only after its specific state and relevant database/API assertions. The capture helper additionally checks exact expected alert state, completed busy state, font readiness and no horizontal page overflow. Intentional validation/conflict alerts are asserted by message, not ignored. A capture does not establish accessibility or backend correctness by itself. Run-local sidecars, traces and duplicate interim logs stay ignored; the manifest and successful structured observations are durable. Historical Lab 1–3 files are untouched.

AC-24's **Issue 27 candidate artifact/traceability work is complete for the successful run above**. These are canonical Lab 4 candidate captures, not evidence of a tested final-main commit or deployment. Issue 28 must rerun/reconcile final-main/release evidence after approved integration.

## Acceptance and handout mapping

| Acceptance criteria | Evidence and limit |
| --- | --- |
| AC-01, 02, 04–09, 11 | E2E-ACT-01; E2E-DASH-02 actor/retry checks; complete Actions API/contract/data tests for full boundary/transition matrices. |
| AC-03 | E2E-ACT-01 and E2E-WF-01 direct role/ownership denials; server authorization suite. |
| AC-10, 12–14 | E2E-WF-02 real stale recovery and gate/lifecycle/legacy policy; API workflow/race/transition tests supply exhaustive concurrency/pair coverage. |
| AC-15 | E2E-WF-01 persisted advisory comment with unchanged formal status. |
| AC-16 | E2E-DASH-02-admin actual Staff API operations and User Management navigation; existing server/client Admin suites cover account operations. |
| AC-17–19 | E2E-DASH-01/02 independent SQL, observed browser responses, preview ordering and metric destinations. |
| AC-20 | E2E-DASH-03 genuine empty/error/retry and E2E-WF-02 retained stale draft; separate frontend component/Issue 26 tests supply controlled loading/read failures. |
| AC-21 | Existing migration-regression/data-integrity/seed tests freshly rerun as a prerequisite; per-browser API-process schema readiness and cleanup. |
| AC-22 | Complete current server/client regression plus representative inherited browser journeys. **Not a claim that all historical Lab 2/3 browser specs ran or that release regression is complete.** |
| AC-23 | Fresh separate Issue 26 96-case frontend suite plus integrated geometry at required viewports. No WCAG certification or spoken screen-reader validation claim. |
| AC-24 / #56 acceptance | All seven journeys at all three viewports, nine required baselines, five useful behaviors, strict asserted capture/publication and complete manifest traceability. Final-main verification remains #57. |
| Handout Part 5 | Operational SQL metrics, My Actions, drill-downs, role restrictions, real empty/session-error/retry and three baseline viewports; controlled loading states remain separate frontend evidence. |
| Handout Part 6 | Real Action operations, field validation, inactive-assignee rejection, role denials, retry/conflict and shared read-only evidence. |
| Handout Part 7 | Ticket transitions/gates, stable Action ordering, immutable identity and persisted append-only events. |
| Handout Part 8 | Owned Requester dashboard and real representative auth/My Tickets/detail/attachment/comment/Staff/Note/Admin-navigation regression. Full account-management operations are separate server/client checks. |
| Handout Part 9 | Nine baseline captures, behavioral states and fresh Issue 26 checks; human visual checklist/sign-off and final PDF are separate release tasks. |

## Review and release remainder

Codex inspected the nine baseline layouts and five behavioral states for obvious clipping, overlap, wrapping and state clarity. This is not human reviewer sign-off. Human review should judge ordinary-content readability/density and the usefulness/readability of the 14 captures at submission scale. Automated label/keyboard/style/geometry assertions are not spoken assistive-technology testing. No screen-reader claim is made.

The old `playwright.config.ts` and Lab 2/3 specs remain unchanged: their default server reuse, environment-dependent accounts, conditional visibility branches and historical output paths are not suitable for this isolated canonical gate. They were not executed against the development database. The new specs cover the approved representative inherited journeys; Issue 28 must handle full release-browser/fresh-setup/final-main/staging smoke coverage explicitly, without treating this candidate report as that result.

One existing release-startup issue was confirmed without changing it: `server/package.json` runs `node dist/index.js`, but the current TypeScript build emits `server/dist/src/index.js` and no `server/dist/index.js`. This suite deliberately imports the real built `dist/src/app.js` in its owned test process; it does **not** prove `npm start --prefix server` or a deployment command works. Issue 28 must reconcile that startup command and verify the actual deployment entrypoint. This is separate from the repaired stale-conflict interaction and the earlier development schema drift.

A link check also found one inherited documentation gap: the historical Issue 25 section of `tests.md` links to an untracked/absent `issue-25-verification.md` in the staging baseline. That older section is unchanged; no missing Issue 25 report was invented or copied from unrelated carryover. All local links in this Issue 27 report and its new `tests.md` supplement resolve. Issue 28's complete-document review must reconcile the older reference.

Before release: independently review this diff and evidence; integrate approved dependencies; rerun the isolated gate and separate frontend suite on the intended release source; verify the deployment's migration history/current schema before a real smoke; record final-main commit/run and final submission/reviewer links. No development/staging smoke, deployment mutation, commit, push, merge or PR creation is performed here.


## Staging synchronization and main-repository review copies

On 2026-10-23, `git fetch origin` confirmed `origin/lab4-staging` is still `a8902031f23d6e1fc52a17dea69904dfa6e5c426` (Issue 26 merge PR #67). Issue 27 already has that exact HEAD, including the Issue 26 implementation and artifact-cleanup commits; ahead/behind is 0/0. No merge, rebase, reset, stash or history rewrite was needed. Existing Issue 27 code/tests remain unchanged.

The complete isolated integration/build/regression/type gate and the separate 96-case frontend suite were rerun successfully. No baseline was invalidated by newly fetched UI changes because there were none. All 14 canonical PNGs were recaptured as fresh evidence; the nine baseline layouts remain valid. The prior 34-file implementation/evidence set was preserved outside the repository in `/private/tmp/toktickit-issue27-before-sync-20261023-145304.tar.gz`.

Only the 14 decoded/manifest-hash-verified PNGs were copied, with exclusive no-overwrite file creation, into `/Users/thuthuwai/Documents/toktickit/artifacts/lab-04/screenshots/` under the same three role/feature directories. That destination did not exist beforehand. The originals remain in this Issue 27 worktree. No JavaScript, cookies, temporary output, manifest, other implementation files or `.DS_Store` were copied into the main repository. Main-repository copies are for review; the worktree manifest remains the authoritative provenance record. No files were staged and no commit, push, staging merge or PR was created.


## Primary checkout after migration (2026-10-23)

Issue 27 is now developed directly in `/Users/thuthuwai/Documents/toktickit` on `feature/27-lab4-e2e-artifacts` at `a8902031f23d6e1fc52a17dea69904dfa6e5c426`. The earlier temporary-worktree descriptions above record historical execution locations. `/private/tmp/toktickit-issue27` is retained at detached HEAD with its original uncommitted implementation/evidence unchanged; it is a safety copy, not the primary development location. No worktree was deleted, no reset/clean/force operation or stash was used, and no history was rewritten.

The destination's pre-existing `docs/lab-04/tests.md` edits were preserved verbatim as the file prefix and the Issue 27 status/supplement appended. Three checked code patches and sixteen exclusively created new files transferred the implementation; fourteen identical existing PNGs were retained without overwriting them. Other unrelated tracked/untracked/ignored files remain intact. Hash verification confirmed 58 original ignored JavaScript files and 8 cookie files unchanged. Both working trees were privately backed up under `.git/issue27-migration-backups/20261023-154754/`.

Fresh verification was executed from the original repository: 28 client files / 250 tests; 33 server API/unit files / 662 tests plus 3 data files / 26 tests; 21 real integrated browser cases with zero skips/retries and 21 schema-disposal checks; 96 separate frontend accessibility cases; server/client builds and client/integration TypeScript checks all PASS. React act warnings were absent. Source fingerprint remains `31baae96e4c348abd8e7b44b29aa6c9e00287bd1ac2cf139ef38a295895a9490`. Existing build directories were moved aside and then restored byte-for-byte; the newly verified builds are retained separately in the backup. Canonical screenshots, manifest and prior evidence were not overwritten; fresh captures/logs remain in the new ignored test run.

The durable migration result and exact command vectors are in [migration-verification.json](../../artifacts/lab-04/regression/issue-27/migration-verification.json). Existing unrelated carryover remains unstaged and must be kept separate from any later Issue 27 commit, including selective treatment of the combined tests document. No commit, push, merge into staging or PR was made. Continue development and independent review in the original repository.
