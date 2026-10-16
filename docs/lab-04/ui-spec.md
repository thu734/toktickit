# Lab 4 - Zen Green UI Specification

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** D-01 through D-16 explicitly approved by the user on 2026-10-15; documentation review and baseline verification remain separate; no Lab 4 implementation.
**Source:** CPE 334 Lab 4 handout, SE+Lab+4.pdf, all 11 pages, reviewed 2026-10-15.

**Provenance:** R = required by Lab 4; I = inherited from Labs 1-3; A = user-approved implementation choice, not a handout mandate.
A combined label separates the required capability from its user-approved implementation details.
Approval evidence: the user explicitly approved the final D-01 through D-16 choices in this session on 2026-10-15. This approval does not authorize implementation, database changes or release.

## 1. Inherited Design and Scope

I: reuse Lab 2/3 color tokens, cards, badges, buttons, fields, tabs, feedback, form conventions and responsive layouts from [Lab 2 UI](../lab-02/ui-spec.md) and [Lab 3 UI](../lab-03/ui-spec.md). R: final screens must form one coherent product and remain usable by keyboard on desktop/tablet/mobile.
This file specifies future screens only. It does not implement components, images, CSS or test code.

## 2. Application Shell

R: add role-appropriate Dashboard navigation and a clear active-page indication; retain permitted My Tickets, Create Ticket, Ticket Queue and User Management destinations (I).
D-13: preserve each role's existing initial landing page; add Dashboard links with active-page indication. Admin keeps User Management and gains approved Staff behavior (R). Remove obsolete/duplicate UI only when its replacement is explicitly required; preserve historical documentation and screenshots (I).

## 3. Requester Dashboard

R: summarize authenticated ownership only; concise attention/recent/resolved information and practical detailed-view links. A/D-12 originally used active, waiting and currently-resolved cards; the explicitly approved 2026-10-16 D-12-R1 revision in §3.2 defines the current layout. Up to five recently updated Tickets remain.
Cards require a descriptive label, visible value and keyboard-operable drill-down. Backend failure is a retryable error, not zero. An empty account displays zero/empty feedback and keeps Create Ticket/My Tickets reachable. Current-status resolved information must not be labelled a dated resolution metric without a trustworthy approved timestamp.
Desktop uses concise card/list grouping; smaller screens stack sections without page overflow (R). Current-state cards and recent-five previews have no date-window cutoff; recent ordering is updatedAt DESC, id DESC and query/drill-down scopes match the specification.

### 3.1 Initial Issue 23 Integration (history; presentation superseded by §3.2)

The Requester Dashboard adds a Requester-only navigation button with `aria-current="page"` when active.
My Tickets remains the initial landing screen. Three labelled cards show current Active Tickets,
Waiting for Requester, and Resolved Tickets; each has a keyboard-operable View tickets control.
Recent Tickets show at most five ticket numbers, summaries, textual statuses and last-updated times,
with direct actions opening existing owned Ticket Detail. My Tickets and Create Ticket remain available.

Cards stack below the existing medium breakpoint and use inherited Zen Green/Bootstrap card/button styles.
Long preview text wraps. UTC API timestamps are displayed with inherited locale date/time formatting
and an explicit local-timezone cue. The As of label describes the common backend read transaction,
not a date cutoff or a resolution date metric.

Loading renders no invented count values. A valid empty response shows three zeros and an empty list.
A failed request or failed refresh shows a retryable error, without stale-success counts or a false empty state.
401, forbidden role and first-password-lock messages are distinct. Account changes/unmount abort the old read;
late old-account results are ignored. Cards apply matching server-side list filters, starting at page one
with unrelated filters cleared. Ordinary My Tickets navigation clears dashboard filters; existing Clear Filters
also removes the active group. The list exposes Active Tickets as a filter grouping, not a new Ticket status.

### 3.2 D-12-R1 Requester Layout (approved 2026-10-16)

This approval follows the initial implemented design; §3.1 is retained as historical decision context.
Preserve the heading, navigation, initial landing pages, As of timestamp and Refresh dashboard control.
Show a compact Active Tickets total with View All Active and the explanation:
“Includes New, Open, In Progress, Waiting for Requester, and Reopened.”
Below it, four primary cards appear in order: Open, In Progress, Waiting for Requester, Resolved.
Use four columns on wide screens, two on tablets, and one on narrow screens.
Then show smaller New and Reopened status links, always present in successful responses including zero counts.
Recent Tickets remains below these controls without changing its five-item bound or detail navigation.

Each of the seven metrics has an accessible, keyboard-operable drill-down. Open means exactly OPEN.
The six status-specific controls use corresponding currentStatus filters; View All Active uses statusGroup=active.
All counts come from the backend. Their presentation never changes workflow or auto-transitions a Ticket.
Loading and error states do not invent counts; successful empty data renders all seven zeros.
Existing ownership/session safety, retry behavior, Zen Green styles, status text and long-content wrapping remain unchanged.

## 4. Staff/Admin Dashboard

R: concise operational starting point with approved metrics, recent/urgent Tickets and current-user Actions. A/D-12 uses unassigned active Tickets, current-owner active Tickets, status/priority groups and one My Actions preview: PLANNED Actions assigned to the authenticated Staff/Admin, excluding historical performed work.
Each actionable item opens a matching queue, Ticket Detail or approved Action panel. D-12 fixes recent-five ordering and assigned-PLANNED My Actions; D-13 preserves landing pages and omits optional Admin counts. Admin retains user management (I/R). Do not build an advanced BI or SLA product.

### Issue 24 final operational arrangement (D-12/D-13)

The same **Staff Dashboard** is available to IT Staff and Administrators. Dashboard navigation indicates
its active page. Staff still initially land on Ticket Queue; Administrators still land on User Management,
which remains available. Optional Administrator account counts are deliberately omitted (D-13).

- Two primary cards: **Unassigned Tickets** and **My Tickets**. Both count only NEW, OPEN, IN_PROGRESS,
  WAITING_FOR_REQUESTER and REOPENED. Unassigned means no primary owner; My Tickets means the session
  user is primary Ticket Owner, independent of Action performer/assignee. Explain this active set below the cards.
- **Tickets by Status**: all eight statuses, with zeros; **Tickets by IT Priority**: LOW, MEDIUM, HIGH, URGENT,
  with zeros. Both cover all operational Tickets, including terminal Tickets, and say so explicitly.
- **Recently Updated Tickets**: at most five, updatedAt DESC/id DESC, showing number, summary, status,
  priority and local updated time. Each number opens existing Staff Ticket Detail.
- **My Actions**: at most five PLANNED Actions assigned to the current user, createdAt ASC/id ASC.
  Show description, parent number/status and planned label. Each opens/focuses the parent's existing
  Actions Taken heading. A terminal parent remains listed and shows read-only guidance; workflow is unchanged.

All fourteen counts are native keyboard-operable buttons, including zero counts. Two summary destinations
use active + unassigned/me filters. Eight status and four priority buttons use their exact single predicates.
The queue starts at page one, sorted by updatedAt DESC/id DESC, visibly selects those filters and applies them
on the backend before pagination. Ordinary Ticket Queue navigation/clear restores existing defaults. A Ticket
Queue shortcut opens the full list. Previews reuse existing detail permissions; no dashboard mutation controls.

Desktop: two equal summary cards, status/priority sections at 8/4 columns, recent/My Actions side by side.
Tablet: two summary cards; breakdowns and previews stack below the large breakpoint. Mobile: all primary
sections stack, status entries stack below the small breakpoint and priorities use two columns. Long preview
text wraps; navigation wraps on narrow Staff/Admin screens. Use Bootstrap/Zen Green, semantic headings,
explicit labels, native focus/activation and text status cues.

Session check and request loading are announced without zero cards. Successful empty responses retain all
zero buckets and destinations, with separate no-Tickets/no-assigned-planned-Actions messages. Show snapshot
asOf in local time and a Refresh control. Refresh clears old metrics while loading. Recoverable errors use
safe feedback and Retry, without fabricated counts; distinguish expired session, forbidden role and password
lock. Abort/ignore superseded requests and remount data on account change. Administrator reuse does not
expose extra user-account information. Browser/accessibility final campaigns remain later-issue work.

## 5. Actions Taken on Ticket Detail

### 5.1 List / View Mode

R: list/table of all applicable Action lines with Date/Time, Description, Result, automatic Performed by, Follow-Up Required, conditional Follow-up Note and Attachment Notes. Assignment/status controls follow required submission operations, with exact semantics D-01/D-02/D-03.
Requester sees current Action items on owned Tickets, with no write controls; Internal Notes remain a separate private facility (I/R). D-05 uses minimal append-only audit events without a visible history browser; never place private note content into shared Action data.
A/D-16: oldest creation timestamp then ID; editing does not move a line. Desktop may use a readable table; narrow screens use stacked labelled cards without dropping required fields.

### 5.2 Create Mode

R: clear labels, automatic attribution, conditional note requirement, validation feedback, busy state and duplicate-click protection. D-03/D-04 show immutable authenticated creator and server creation time as read-only fields; no editable work date. D-06 enforces trimmed nonblank Description <=2000, Result <=2000 and required on completion/cancellation, conditional trimmed Follow-up Note <=1000 and optional Attachment Notes <=1000. D-02 permits null assignment or an active Staff/Admin target.
A/D-11: retain a logical operation key across retries; do not clear a valid entered form on a recoverable network failure. Implementation and payload mechanics are not part of Issue 18.

### 5.3 Edit / Transition Mode

R: support editing, assignment, status transition, completion and cancellation. Only approved transitions are shown; backend remains authoritative.
A/D-05: editing appends a minimal audit event, without full revision snapshots; authorized Staff/Admin may correct Result, Follow-Up Required, Follow-up Note and Attachment Notes on COMPLETED Actions while retaining COMPLETED status, performer and creation time. Later acting users appear only in minimal audit events. Each audit event records Action ID, actor, timestamp, event type and changed fields; no history browser, full snapshots or separate actor-history system. Result is required on cancellation. D-09 makes all Action write controls unavailable on RESOLVED/CLOSED/CANCELLED Tickets; reopen RESOLVED/CLOSED before any new work or correction. Action COMPLETED/CANCELLED statuses do not reopen; more work needs a new Action. Conflict UI explains that newer work exists, retains input and provides refresh/review rather than silently overwriting (R/A D-10).

## 6. Ticket Workflow Feedback

R/I: retain the eight status labels and advisory Requester resolution action. Show only approved transitions and refresh summary status after a successful operation (R).
A/D-07: when outstanding work blocks resolution, show a permitted explanation and route to relevant Actions; disclose no private/unowned data. An authorized completed-Action follow-up correction can clear the blocker without reopening the Action; use current validated fields when refreshing gate feedback. D-07 applies the same gate to both resolution and closure: any PLANNED or COMPLETED-with-follow-up Action blocks. CANCELLED Actions and zero Actions do not block. Completed corrections require a writable parent Ticket under D-09. D-08 governs zero-action legacy Tickets. Do not auto-complete/cancel Actions or change Ticket status merely from editing fields unless explicitly approved.

## 7. Meaningful Screen States

For each dashboard and Action/Ticket mode define: loading, saving, success, field validation, empty/no-results, unauthenticated/locked, forbidden, missing resource, conflict, recoverable API failure and retry (R/I). Accessible feedback must distinguish empty data from failed retrieval. Record field retention, focus movement, disabled controls and recovery expectations in the relevant ACs.

## 8. Accessibility and Responsive Verification Plan

R/I: semantic labels/headings; keyboard-operable links/buttons; visible focus; no color-only statuses; understandable validation; clear private/shared labels; readable long text; no clipping/overlap/horizontal page scroll; accessible modal dialogs.
A verification choices: desktop 1280x720, tablet 800x900, mobile 390x844 inherited evidence sizes; additional narrow-width/zoom checks. Test focus entry/trapping/Escape/restoration where dialogs are used and announce meaningful status/error feedback. Record computed styles and geometry in browser tests; screenshot presence alone is not proof of accessibility or overflow correctness.

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

R minimum future folders: artifacts/lab-04/screenshots/staff-dashboard/, requester-dashboard/, actions-taken/. A: desktop.png, tablet.png and mobile.png per folder, plus behavioral captures for assignment, validation, complete/cancel, Requester read-only view, blocked resolution, conflict, zero/error and drill-down.
A capture policy: deterministic scenarios; assert state before capture; no visibility-conditioned silent skips; manifest with AC, scenario, viewport, tested code revision and run. Routine output is isolated; publish validated Lab 4 evidence explicitly. Extra workflow/regression folders may supplement, never replace, the minimum structure. Do not regenerate Lab 1-3 artifacts in Issue 18.

## 10. Traceability and Approval

FR-01..FR-18 and FR-21 are exercised by AC-01..AC-20 and AC-23..AC-24. [tests.md](tests.md) lists planned UI/style/responsive/E2E paths. D-01 through D-16 are explicitly user-approved; implementation and visual verification remain unexecuted.
