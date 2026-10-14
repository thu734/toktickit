# Lab 4 - REST API Contract

**Issue:** Issue 18 [Lab 4] Engineering Contract and Baseline Gate
**Status:** Documentation prepared for review; product decisions pending approval; no Lab 4 feature implementation.
**Source:** CPE 334 Lab 4 handout, SE+Lab+4.pdf, all 11 pages, reviewed 2026-10-15.

**Provenance:** R = required by Lab 4; I = inherited from Labs 1-3; P = proposed decision requiring approval.
A combined label separates the required capability from its proposed implementation details.
Authorization to draft these documents does not approve every P decision.

## 1. Contract Status and Inherited Conventions

This is a future API contract, not an implemented API. All new paths, shapes, validation codes and compatibility choices below are PENDING APPROVAL under D-15. D-10/D-11 also gate version/request-key semantics.

I: retain session-cookie authentication, first-login password change lock, current account activity/role checks, CSRF treatment and existing Public Comment/Internal Note/Attachment rules. R: all writes are authorized by the backend; Admin receives IT Staff behavior in Lab 4. Do not change the authentication scheme or introduce external notification services.

## 2. Authorization Matrix

| Operation | Requester | IT Staff | Administrator | Basis / condition |
| --- | --- | --- | --- | --- |
| Read current Action lines | Owned Tickets only | Accessible Tickets | Accessible Tickets | R; all current lines visible, including cancellation under approved lifecycle |
| Create/edit Actions | Forbidden | Allowed | Allowed | R; validation/lifecycle P |
| Assign/complete/cancel Actions | Forbidden | Allowed | Allowed | R submission Part 6; target/state policy D-01/D-02 |
| Read Action revisions/events | D-05 pending | D-05 pending | D-05 pending | P; never expose Internal Notes through shared history |
| Requester Dashboard | Own metrics | Proposed forbidden | Proposed forbidden | R ownership; role exclusion P |
| Staff Dashboard | Forbidden | Allowed | Allowed | R role-appropriate scope; formulas P |
| Ticket operational writes | Forbidden | Allowed | Allowed | I Staff; R Lab 4 Admin extension; D-10 compatibility |
| Public Comments/resolution indication | Inherited owned behavior | Inherited permitted behavior | Inherited permitted behavior | I; Requester indication remains advisory |
| Internal Notes | Forbidden | Allowed | Allowed | I |
| User Management | Forbidden | Forbidden | Allowed | I |

Unauthenticated protected requests remain 401; first-password-locked requests remain subject to MUST_CHANGE_PASSWORD; authenticated role violations remain 403 (I). Missing/unowned protected-resource behavior and new error shapes require D-15 approval. The matrix does not claim that every existing route already matches it.

## 3. Proposed Actions Endpoints (P/D-15)

| Method | Candidate path | Purpose |
| --- | --- | --- |
| GET | `/api/tickets/:ticketId/actions-taken` | Read authorized Action lines in approved stable order |
| POST | `/api/tickets/:ticketId/actions-taken` | Create one Action with server-derived attribution |
| PATCH | `/api/tickets/:ticketId/actions-taken/:actionId` | Apply approved field/assignment/status changes |

No deletion endpoint is proposed (P/D-05). Validate that actionId belongs to ticketId and that the caller can access the parent. Reject or ignore forged actor fields according to approved D-03/D-15; never trust them for identity (I/R).

### 3.1 Field Responsibilities

| Field | Required concept | Ownership / unresolved semantics |
| --- | --- | --- |
| ticketId / Action ID | Parent-child relationship R | Server validates relation; parameter naming P |
| actionDateTime | Date/time R | Server creation time proposed; editable work date pending D-04 |
| description | Action Description R | Bounds/trim D-06 |
| result | Result R | Completion/cancellation requiredness D-06 |
| performedBy | Automatic performer R | Server-controlled; creator versus completion actor D-03 |
| assignedTo | Assignment evidence R | Active eligibility/unassigned policy D-02 |
| followUpRequired | Follow-up flag R | Boolean payload/default choice D-15 |
| followUpNote | Conditional note R | Nonblank when flag true; bounds D-06 |
| attachmentNotes | Attachment Notes R | Text references existing files; optionality/bounds D-06 |
| status | Lifecycle operations R | Enum/transitions D-01 |
| version / workflowVersion | Conflict control R | Candidate tokens, scope/requiredness D-10 |
| requestKey | Safe retries R | Candidate idempotency field/location/retention D-11 |
| createdAt / updatedAt / revisions | Stable/auditable behavior R | Representation and public visibility D-05/D-16 |

Current fields and proposed fields must be clearly distinguished in the final approved payload examples. Return safe, bounded actor/assignee data, never credential hashes or private note content (I/R).

### 3.2 Validation and Lifecycle

Required conditional note is fixed (R). Recommended lengths, terminal amendments, result requiredness and status changes remain P; see D-01/D-05/D-06/D-09 in [specification.md](specification.md#111-proposed-decisions-requiring-approval).
Do not silently add Action attachment uploads, deletion, owner-only performer restrictions or administrative approval workflows.

## 4. Ticket Workflow Extension

Continue existing Ticket endpoints (I). Lab 4 expands Staff operations to Administrator (R) and adds the approved resolution/conflict rule (R/P). Existing request fields and response shapes should be preserved where compatible; whether new version tokens are mandatory is unresolved D-10.
Proposed race protocol (P): parent Ticket serialization/version validation, then Action gate check and workflow update in the same transaction, with atomic audit writes. An Action update simultaneously becoming unfinished must not slip past resolution. Exact mechanism is not implemented here.
Requester Problem Appears Resolved retains its existing Public Comment behavior and cannot set RESOLVED/CLOSED (I/R).

## 5. Dashboard Endpoints and Payload Candidates

| Method | Candidate path | Scope |
| --- | --- | --- |
| GET | `/api/dashboard/requester` | Authenticated Requester-owned data |
| GET | `/api/dashboard/staff` | Permitted Staff/Admin operational scope |

P/D-12/D-15 response envelope: asOf, documented counts, bounded Ticket/Action previews, and approved drill-down filters/destinations. Exact property names remain pending. Never return full Ticket collections or calculate authoritative counts in the browser (R).
Calculate each response using a documented consistency policy and the approved common asOf. Candidate calculations/windows appear in [specification.md](specification.md#54-dashboard-calculation-candidates).
Zero results return zero counts/empty lists; failures return safe errors, not false zero totals (R). D-12 must settle current-user assignment versus performer metrics, urgency scope, recent time bounds and deterministic tie ordering.

## 6. Safe Error and Conflict Plan

| Condition | Inherited / proposed behavior | Basis |
| --- | --- | --- |
| No authenticated session | 401 | I |
| Must change initial password | Existing MUST_CHANGE_PASSWORD lock | I |
| Forbidden role | 403 before disclosing protected contents | I/R |
| Invalid input | Existing validation convention; candidate 400 and field errors | I/P |
| Missing/unowned resource | Uniform safe outcome; candidate 404 for ownership-sensitive resources | I/R/P D-15 |
| Stale version | Candidate 409 with safe refresh guidance | R/P D-10 |
| Resolution blocked | Candidate 409 with permitted blocking-work summary | R/P D-07/D-15 |
| Same retry key, changed payload | Candidate 409 | R/P D-11 |
| Unexpected error | Generic safe server failure, no stack/SQL/secret details | I/R |

Do not expose a private Internal Note, credential hash or another Requester's resource existence in any error. Specific codes/payload examples await approval; no sample is a promise of current implementation.

## 7. Planned Verification and Compatibility

AC-01 through AC-22 map to API/security/workflow/migration/regression tests in [tests.md](tests.md). Existing Lab 3 Admin operational-denial expectations change only where Lab 4 explicitly grants the operation. Existing attachment, comment, note, login and user-management contracts remain inherited. Version-token compatibility and safe-error corrections require explicit acceptance examples before implementation.
