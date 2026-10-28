# Issue 26 — Accessibility, responsive and visual verification

Date: 2026-10-23 (Asia/Bangkok). Scope: GitHub Issue #55, logical Issue 26.

## Ownership and verification boundary

Issue 26 supplies targeted frontend semantic, keyboard, focus, dialog, computed-style, contrast and responsive verification against FR-18 / BR-25 / AC-20 and AC-23. It preserves the approved dashboard arrangements and workflow/authorization contracts. Related inherited presentation fixes support AC-22 without claiming complete browser regression.

Issue 27 (#56) owns database-backed integrated journeys, metric/query reconciliation, backend role/gate/conflict proof, published canonical screenshots and the complete AC-24 manifest. Issue 28 owns final-main verification. Intercepted UI fixtures and screenshot presence are not proof of authorization, persistence or accessibility by themselves.

## Changes and reproduced findings

- Added named main navigation, active-page semantics, profile disclosure state/Escape behavior, role-appropriate brand navigation and navigation heading focus. Existing My Planned Actions focus is preserved.
- Restored missing Zen Green primary button and pale/secondary badge styles. Missing badge styles had rendered white text against white/page backgrounds. Editable focused fields stay white; read-only fields use `#F1F5F3`.
- Corrected measured text contrast: muted `#64748B` on page `#F5F7F6` was approximately 4.42:1; current muted text is `#5F6F85`. Amber `#D97706` on `#FEF3C7` was approximately 2.86:1; current amber text is `#92400E`. Red `#DC2626` on `#FEE2E2` was approximately 3.95:1; current text is the inherited destructive-hover shade `#B42318`. Badge backgrounds, labels and meanings are preserved, and the shared inherited ticket views use the same corrections.
- Long profile content and Admin card names/emails wrap instead of forcing page overflow. The Admin tablet case reproduced 1070px overflow before the flex child sizing correction. No overflow-hiding workaround was introduced.
- Status confirmation, Requester resolution indication, attachment removal and Admin create/edit/reset dialogs share focus entry/containment, Escape, inert background exclusion and opener restoration. Existing busy guards apply to Escape/close as well.
- Action forms expose required/invalid/described-by state, place errors below fields, focus the first invalid field and focus editable Result when correcting a completed Action. Completion/cancellation validation exposes Result requiredness. Saving is announced; Requester and terminal-Ticket read-only guidance and shared/private labels are explicit. Native list-item semantics are preserved around Action articles.
- Added missing control names/label associations in Staff queue/detail and Admin filters, plus a page heading for Staff detail and queue. Activity buttons expose selected state.

## Automated coverage and commands

`npm run test:a11y` uses `playwright.accessibility.config.ts`, not the historical E2E configuration. It starts only an owned Vite frontend on `127.0.0.1:5196`, with strict port ownership and no server reuse. All application API requests are intercepted regardless of host; unexpected requests are blocked and fail the test. Service workers are disabled. No API server, development database, migrations, seeds, uploads or real account mutations are used.

`e2e/lab-04/fixtures/accessibility.ts` supplies deterministic contract-shaped role/state responses, long content, controlled read failures and a controlled save conflict. These demonstrate frontend behavior only. Loading responses have explicit release gates, including cleanup in `finally`. No retries, skips, conditional visibility omissions or early-return passing tests are used. Each run has a separate timestamp/process output directory under `test-results/lab-04-accessibility/`.

The browser suite covers:

- Requester, IT Staff and Administrator shells/dashboards at 1280×720, 800×900 and 390×844; approved card columns and Staff breakdown stacking.
- All seven Requester and fourteen Staff metric controls reached by keyboard, with Enter/Space activation and focus-ring assertions. Matching destination scope is already covered in component/API tests and remains part of Issue 27 integration.
- Loading, successful zero and failed dashboard reads, explicit recovery, Action loading/read failure/retry and retained conflict drafts. Errors do not masquerade as empty successful data.
- Actual dialog entry, Tab/Shift+Tab wrapping, inert background exclusion, Escape/cancel and restoration; Requester and Admin inherited dialog entry/restoration.
- Computed primary/card/editable/read-only/focus styles, field/error geometry, accessible names, mobile button height and explicit private/shared/read-only/non-color cues.
- Rendered text contrast for dashboard, Action, validation, private-note and Requester warning/detail states. Foreground/background alpha and effective element/ancestor opacity are composited, including header text; inactive controls are exempt. This is targeted verification of these states, not a claim of whole-product WCAG certification.
- 320px reflow and 575/576, 767/768, 991/992 and 1199/1200px Staff dashboard breakpoint boundaries; long unbroken text, filenames and metadata; page overflow and control/content containment.
- Real browser zoom in a disposable full-Chromium profile. Chromium's own settings set 200% zoom, then measured CSS width and devicePixelRatio must change by a factor of two. All three roles' dashboards/detail/forms remain usable. At 400%, the measured CSS viewport is 320px. This does not use CSS transforms or pinch emulation. The disposable profile is deleted afterwards.

Component verification: `client/tests/lab-04/ZenGreenStyle.test.tsx` verifies semantic presentation contracts, conditional requiredness, validation/focus, immutable correction fields, saving/disabled state, real list semantics and private/shared/read-only cues. It makes no JSDOM layout or computed-browser-style claim. Existing component/navigation/workflow suites retain their assertions.

Commands:

- `npm test --prefix client -- --reporter=dot`
- `./client/node_modules/.bin/tsc --noEmit -p client/tsconfig.json`
- `npm run build --prefix client -- --outDir /private/tmp/issue26-fixes-build`
- `npm run test:a11y`
- `git diff --check`

Executed results and visual inspection are recorded below.

## Evidence policy and Issue 27 handoff

The browser suite asserts role/state and relevant styles/geometry before capture. Run-local dashboard and Actions screenshots include all three baseline viewports, retained-conflict forms and measured-200%-zoom states. Long-content fixtures deliberately exercise worst-case wrapping. These files are disposable verification output, not canonical submission evidence.

Issue 27 must publish validated real-journey evidence to:

- `artifacts/lab-04/screenshots/requester-dashboard/{desktop,tablet,mobile}.png`
- `artifacts/lab-04/screenshots/staff-dashboard/{desktop,tablet,mobile}.png`
- `artifacts/lab-04/screenshots/actions-taken/{desktop,tablet,mobile}.png`

Add behavioral captures where they demonstrate assignment, validation, completion/cancellation, Requester read-only state, blocked resolution, conflict or recovery. Each manifest entry must identify scenario, AC/test ID, role, viewport/zoom, fixture mode, tested revision, run and result. Do not substitute mocked UI captures for integrated backend proof. Supplementary inherited regression evidence belongs under Lab 4, not historical Lab 1–3 folders. Missing fixtures/controls must fail explicitly.

The historical Playwright suites still use reusable servers and historical screenshot destinations. Issue 26 does not run or endorse those scripts; their isolated integration and evidence destination corrections remain Issue 27 work. No new artifact-validator product feature is included.

## Acceptance mapping

| Issue 26 / handout requirement | Verification |
| --- | --- |
| No clipping/overlap/page overflow; narrow widths and zoom usable | Browser containment, overflow, breakpoint, target-size and measured-zoom assertions; visual inspection |
| Semantic labels, keyboard operation and visible focus | Named controls, all metric destinations, computed focus rings and actual browser keyboard assertions |
| Accessible dialogs | Entry, containment, Escape/cancel, background exclusion and restoration |
| Validation, private/shared and editable/read-only clarity | Component semantics, field/error geometry, rendered styles, textual cues and visual inspection |
| Completed visual/accessibility checklist | Recorded inspection and actual run results below |
| Handout §§7, 8.1–8.6 and submission Part 9 | STYLE-01 / RESP-A11Y-01; AC-20/23, inherited AC-22 support |
| Handout §10 and submission Part 3 traceability | Concrete test files, commands, results and source/run identity |
| AC-24 / screenshot submission completion | Issue 27 remains responsible; not claimed complete here |

## Verification history

The initial 78-case browser suite passed but missed five findings identified by independent review. The corrected 96-case complete run below supersedes those earlier results as the current Issue 26 evidence. Superseded raw logs and metadata are not part of the retained branch evidence; local copies may remain for reference.

Only the four final corrected evidence files linked below are retained. Screenshots remain run-local verification output, not canonical AC-24 submission evidence. Historical Lab 1–3 screenshots were neither regenerated nor edited. Server suites were not rerun for this frontend-only work; prior server results remain dated Issue 25 evidence.

## Visual inspection checklist

Visual inspection was performed by Codex on actual asserted browser captures; this is not a fabricated human reviewer approval or a screen-reader certification. The automated keyboard/focus/geometry/style checks above provide separate evidence.

- [x] **Hierarchy, density and layout:** Requester four/two/one-card arrangement, Staff operational summaries/breakdowns/previews and Actions list remain coherent at desktop/tablet/mobile. Long content wraps and essential fields remain readable. Ordinary profile pills retain their capsule shape; wrapped profiles cap the corner radius so text stays inside the border. Mobile ticket links retain left alignment.
- [x] **Focus, validation, zoom and obstruction:** visible green focus rings, invalid-field feedback directly below controls, dialog controls/footer inside the viewport, long forms and 200% zoom captures inspected. Fixed-overlay screenshots use viewport coordinates. No obvious clipping or overlapping controls observed in these scenarios.
- [x] **State clarity:** read-only shading versus editable white fields, automatic attribution, Action status/follow-up text, shared Actions and private-note cues remain distinguishable without color alone. Retained conflict forms preserve entered values and explain recovery.


## Independent-audit corrections (2026-10-23)

This follow-up is limited to the five independent-review findings and their regression coverage:

1. Successful attachment removal restores focus to the stable, programmatically focusable Attachments heading; Cancel still restores the original Remove button. The shared hook accepts an explicit restoration target for this successful-removal path.
2. Inactive header navigation uses full-opacity white text on the existing green background. Active-page bold/underline/aria-current treatment is unchanged. Contrast verification now includes the shell/header and composites element and ancestor opacity. Negative controls deliberately reintroduce 0.75 opacity on a navigation label and its parent and require the checker to detect the failure.
3. Create/Edit/Reset User Cancel buttons follow the existing busy guards on Escape and close. Three browser scenarios hold intercepted writes pending, verify all dismissal paths remain blocked, then return a controlled failure and verify dismissal becomes available again.
4. Create Ticket's Ticket Number and Created Date inputs are associated with their existing labels by IDs/htmlFor; browser assertions resolve both controls by accessible name and verify read-only state.
5. Create Ticket and its success view use focusable level-one headings with unchanged visual sizing. Browser assertions cover navigation into the form, successful mocked creation, and Create Another Ticket reset focus.

The saving-state component test now awaits the assignee response before finishing, rather than leaving an asynchronous state update after its assertions. No warning suppression was added.

All added browser mutations are intercepted frontend scenarios; they prove neither authentication/authorization nor database persistence. The separate development schema-drift repair was not an Issue 26 frontend correction. No development database access is part of this verification run.

The correction gate passed; its current results are recorded below. Human review of ordinary-content readability/visual density and assistive-technology speech remains separate from these targeted DOM/keyboard/style checks. No broader WCAG certification, spoken-screen-reader, integrated workflow, full Labs 1–4 regression or AC-24 completion is claimed.


### Current correction-run results

| Check | Executed result |
| --- | --- |
| Complete client suite | **28 files / 249 tests PASS**, zero React act warnings |
| Client TypeScript `--noEmit` | **PASS** |
| Browser/config TypeScript | **PASS**, with Vite environment declaration and existing server Node types |
| Production client build | **PASS**, isolated output `/private/tmp/issue26-fixes-build` |
| Complete expanded browser suite | **96 PASS**, zero skips, zero retries; run `1792701222453-79383` |
| Diff whitespace | **PASS** |
| Five independent-audit findings | **Closed by targeted frontend assertions** at desktop/tablet/mobile |
| Historical Lab 1–3 screenshots / development DB | **Untouched by this follow-up** |

Commands: `npm test --prefix client -- --reporter=dot`; `./client/node_modules/.bin/tsc --noEmit -p client/tsconfig.json`; `npm run build --prefix client -- --outDir /private/tmp/issue26-fixes-build`; `npm run test:a11y`; `git diff --check`. The extra browser typing command is recorded verbatim in the source/run JSON.

Six new scenarios produce eighteen additional browser cases. During test authoring the first focused run passed fifteen cases and timed out in three Create Ticket cases because label selectors omitted the existing required-marker text. Corrected accessible-label selectors passed all three focused cases; the final complete run above passed without retries. No product assertion was relaxed.

Fresh desktop Requester/tablet Admin captures and the mobile focused-dialog capture were inspected by Codex for preserved layout, active navigation treatment and focus visibility. This is not human reviewer sign-off. Final human judgment of ordinary-content density/readability and any claimed spoken screen-reader behavior remains separate.

Final retained evidence: [client.txt](../../artifacts/lab-04/regression/issue-26/audit-corrections/client.txt), [browser.txt](../../artifacts/lab-04/regression/issue-26/audit-corrections/browser.txt), [build.txt](../../artifacts/lab-04/regression/issue-26/audit-corrections/build.txt), and [verification-run.json](../../artifacts/lab-04/regression/issue-26/audit-corrections/verification-run.json). These are the corrected complete-run logs and source/run record; superseded intermediate artifacts are excluded. The correction fingerprint is `c8c8ba2a8cc3ff683c2786904f913b772cc37c2106459d70aba4cedbcdfff95b`. Screenshots remain run-local under `test-results/lab-04-accessibility/1792701222453-79383/`, not canonical AC-24 submission evidence. These results support only the stated frontend acceptance scope; integrated authorization, persistence, database workflows, canonical screenshots and final release remain later verification.
