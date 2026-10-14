# Lab 4 - Zen Green UI Specification

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** Documentation prepared for review; product decisions pending approval; no Lab 4 feature implementation.
**Source:** CPE 334 Lab 4 handout, SE+Lab+4.pdf, all 11 pages, reviewed 2026-10-15.

**Provenance:** R = required by Lab 4; I = inherited from Labs 1-3; P = proposed decision requiring approval.
A combined label separates the required capability from its proposed implementation details.
Authorization to draft these documents does not approve every P decision.

## 1. Inherited Design and Scope

I: reuse Lab 2/3 color tokens, cards, badges, buttons, fields, tabs, feedback, form conventions and responsive layouts from [Lab 2 UI](../lab-02/ui-spec.md) and [Lab 3 UI](../lab-03/ui-spec.md). R: final screens must form one coherent product and remain usable by keyboard on desktop/tablet/mobile.
This file specifies future screens only. It does not implement components, images, CSS or test code.

## 2. Application Shell

R: add role-appropriate Dashboard navigation and a clear active-page indication; retain permitted My Tickets, Create Ticket, Ticket Queue and User Management destinations (I).
P/D-13: decide whether Dashboard becomes each role's initial landing page; do not silently replace existing destinations. Admin keeps User Management and gains approved Staff behavior (R). Remove obsolete/duplicate UI only when its replacement is explicitly required; preserve historical documentation and screenshots (I).

## 3. Requester Dashboard

R: summarize authenticated ownership only; concise attention/recent/resolved information and practical detailed-view links. P/D-12 proposes active, waiting and currently-resolved cards plus up to five recently updated Tickets.
Cards require a descriptive label, visible value and keyboard-operable drill-down. Backend failure is a retryable error, not zero. An empty account displays zero/empty feedback and keeps Create Ticket/My Tickets reachable. Current-status resolved information must not be labelled a dated resolution metric without a trustworthy approved timestamp.
Desktop uses concise card/list grouping; smaller screens stack sections without page overflow (R). Exact card count, limits, layouts and windows remain P/D-12.

## 4. Staff/Admin Dashboard

R: concise operational starting point with approved metrics, recent/urgent Tickets and current-user Actions. P/D-12 proposes unassigned active Tickets, current-owner active Tickets, status/priority groups and distinct assigned/performed Action information.
Each actionable item opens a matching queue, Ticket Detail or approved Action panel. D-12 settles filters and action panel pagination/preview behavior; D-13 settles optional Admin counts and landing behavior. Admin retains user management (I/R). Do not build an advanced BI or SLA product.

## 5. Actions Taken on Ticket Detail

### 5.1 List / View Mode

R: list/table of all applicable Action lines with Date/Time, Description, Result, automatic Performed by, Follow-Up Required, conditional Follow-up Note and Attachment Notes. Assignment/status controls follow required submission operations, with exact semantics D-01/D-02/D-03.
Requester sees current Action items on owned Tickets, with no write controls; Internal Notes remain a separate private facility (I/R). D-05 decides revision visibility; never place private note content into shared Action history.
P/D-16: oldest creation timestamp then ID; editing does not move a line. Desktop may use a readable table; narrow screens use stacked labelled cards without dropping required fields.

### 5.2 Create Mode

R: clear labels, automatic attribution, conditional note requirement, validation feedback, busy state and duplicate-click protection. P/D-04/D-06 decides date editability, bounds, defaults and Result requiredness. P/D-02 decides active assignee choices/unassigned behavior.
P/D-11: retain a logical operation key across retries; do not clear a valid entered form on a recoverable network failure. Implementation and payload mechanics are not part of Issue 18.

### 5.3 Edit / Transition Mode

R: support editing, assignment, status transition, completion and cancellation. Only approved transitions are shown; backend remains authoritative.
P/D-05: editing appends a revision; terminal-state amendments and cancellation result confirmation remain unresolved. P/D-09 defines availability on Resolved/Closed/Cancelled Tickets. Conflict UI explains that newer work exists, retains input and provides refresh/review rather than silently overwriting (R/P D-10).

## 6. Ticket Workflow Feedback

R/I: retain the eight status labels and advisory Requester resolution action. Show only approved transitions and refresh summary status after a successful operation (R).
P/D-07: when outstanding work blocks resolution, show a permitted explanation and route to relevant Actions; disclose no private/unowned data. D-07 also determines closure checks. D-08 governs zero-action legacy Tickets. Do not auto-complete/cancel Actions or change Ticket status merely from editing fields unless explicitly approved.

## 7. Meaningful Screen States

For each dashboard and Action/Ticket mode define: loading, saving, success, field validation, empty/no-results, unauthenticated/locked, forbidden, missing resource, conflict, recoverable API failure and retry (R/I). Accessible feedback must distinguish empty data from failed retrieval. Record field retention, focus movement, disabled controls and recovery expectations in the relevant ACs.

## 8. Accessibility and Responsive Verification Plan

R/I: semantic labels/headings; keyboard-operable links/buttons; visible focus; no color-only statuses; understandable validation; clear private/shared labels; readable long text; no clipping/overlap/horizontal page scroll; accessible modal dialogs.
P verification choices: desktop 1280x720, tablet 800x900, mobile 390x844 inherited evidence sizes; additional narrow-width/zoom checks. Test focus entry/trapping/Escape/restoration where dialogs are used and announce meaningful status/error feedback. Record computed styles and geometry in browser tests; screenshot presence alone is not proof of accessibility or overflow correctness.

Visual checklist (all pending future execution):

- [ ] Zen Green tokens and existing component conventions consistent.
- [ ] Dashboard labels/counts/drill-downs agree with the API contract.
- [ ] Action attribution, assignment, follow-up and editable/read-only fields clear.
- [ ] Private Internal Notes visually distinct from shared Action content.
- [ ] Keyboard navigation and focus/validation announcements verified.
- [ ] Dialog focus and recoverable form data verified.
- [ ] Desktop/tablet/mobile long-content states free of clipping, overlap and overflow.
- [ ] Loading/zero/error/conflict states inspected; no unfinished controls or console errors.

## 9. Screenshot Evidence Plan

R minimum future folders: artifacts/lab-04/screenshots/staff-dashboard/, requester-dashboard/, actions-taken/. P: desktop.png, tablet.png and mobile.png per folder, plus behavioral captures for assignment, validation, complete/cancel, Requester read-only view, blocked resolution, conflict, zero/error and drill-down.
P capture policy: deterministic scenarios; assert state before capture; no visibility-conditioned silent skips; manifest with AC, scenario, viewport, tested code revision and run. Routine output is isolated; publish validated Lab 4 evidence explicitly. Extra workflow/regression folders may supplement, never replace, the minimum structure. Do not regenerate Lab 1-3 artifacts in Issue 18.

## 10. Traceability and Approval

FR-01..FR-18 and FR-21 are exercised by AC-01..AC-20 and AC-23..AC-24. [tests.md](tests.md) lists planned UI/style/responsive/E2E paths. D-01..D-13/D-15/D-16 remain pending where applicable; this UI document does not silently approve them.
