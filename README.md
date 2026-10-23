# TokTickIT

An end-user facing IT support ticketing system built with a unified Zen Green design system and Spec-Driven Development (Spec DD).

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (with `bcrypt` password hashing & session management)
- **Testing**: Vitest, Supertest, React Testing Library, Playwright E2E

## Key Features (Labs 1–4)

- **Authentication & Migration**:
  - Prisma database migration from legacy `DevelopmentRequester` to `User` model.
  - Email/password authentication (`POST /api/auth/login`), `bcrypt` password hashing, and session management (`toktickit_session` cookie).
  - Public `/api/auth/me` and `/api/auth/logout` endpoints.

- **Mandatory First-Login Password Change**:
  - Mandatory password change lock (`mustChangePassword = true`) for initial accounts (`BR-02`).
  - Dynamic password complexity validation checklist (≥8 chars, uppercase, lowercase, numeric, symbol, match confirmation).
  - `HTTP 403 MUST_CHANGE_PASSWORD` protection on non-auth endpoints until password updated (`POST /api/auth/change-password`).

- **Server-Side RBAC & Application Shell**:
  - Role-based authorization middleware (`requireRole`) enforcing `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR` access permissions (`BR-04`).
  - Role-based navigation in Application Shell with profile dropdown and role badges (Green for Requester, Blue for Staff, Purple for Admin).

- **Public Comments & Problem Appears Resolved**:
  - Threaded public comments on tickets with role badges (`AC-08`).
  - Requester "Problem Appears Resolved" indication triggering public comment without changing status (`AC-09`).

- **IT Staff Ticket Queue & Ticket Operations**:
  - Multi-criteria queue search, status & IT priority dropdown filters, column header sorting, persistent pagination controls (`AC-10`, `AC-11`).
  - Ticket claiming, staff reassignment, IT priority management (`itPriority`), and state-machine status transitions capturing optional resolution summary (`AC-12`–`AC-16`).
  - Private Internal Notes tab visible and writable ONLY by IT Staff and Administrator (`AC-17`, `BR-04`).

- **Administrator User Management**:
  - User account listing with name/email search, role filtering, creation with mandatory first-login flag, editing, status toggling, and initial password reset (`AC-18`–`AC-24`).
  - Strict Admin safety rules: self-deactivation prevention (`BR-09`) and last active Administrator protection (`BR-10`).
  - `HTTP 409 Conflict` duplicate email handling (`BR-07`).

- **Responsive Verification & Accessibility**:
  - Multi-viewport layout scaling across Desktop (1280px), Tablet (800px), and Mobile (390px) without horizontal scrollbars (`AC-26`).

---

## Lab 4 functionality and hardening status

- Actions Taken: Staff/Admin create, assign, edit, complete/cancel and make approved completed corrections. Requesters read all current Actions on owned Tickets. Creator/time are immutable; minimal audit events are append-only.
- Workflow: the approved eight Ticket statuses remain. One workflow revision protects competing writes; outstanding Actions gate resolution and closure. Creation request keys support safe Action retries.
- Dashboards: backend-owned Requester counts/recent Tickets and shared Staff/Admin operational counts/My Planned Actions, with matching drill-downs. Existing role landing pages remain unchanged.
- Issue 25: ownership-safe 404s, fail-closed password locks, safe invalid-input responses, recoverable feed/logout handling, configured download origins and disposable test files are implemented. **NOT READY TO PUSH:** earlier intermittent workflow 404 and dashboard socket failures still lack a verified cause despite passing subsequent runs. See [Issue 25 verification](docs/lab-04/issue-25-verification.md).
- Final accessibility/visual verification, integrated browser screenshots and final release evidence remain Issues 26–28.

## Workspace Structure

```
toktickit/
├── client/          # Frontend React + Vite application
├── server/          # Backend Express + Prisma API
│   ├── prisma/      # Versioned SQL migrations, Prisma schema and preservation-oriented seeds
│   ├── src/         # Express server source code & RBAC middleware
│   └── tests/       # Vitest unit, API, authorization, and migration tests
├── e2e/             # Playwright End-to-End multi-viewport test suites
├── docs/            # Lab documentation contract files (specification, api-spec, ui-spec, tests, reviewer, ai-use)
├── artifacts/       # Verification screenshot evidence and artifacts
├── .gitignore
└── README.md
```

---

## Setup & Getting Started

### 1. Configure Environment Files

Copy the example environment files (`.env.example`) for both server and client:

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

*Secrets, database credentials, uploaded attachments, and `node_modules/` are excluded via `.gitignore`. Existing local cookie/generated files must not be staged.*

Use Node 24 (verification used 24.14.0), npm 11, and PostgreSQL. For local development export a private `SESSION_SECRET` in the server process environment; do not commit or share it. Keep the existing development database URL separate from `TEST_DATABASE_URL`.

Server tests require an existing dedicated `toktickit_test` database and a role able to create/drop schemas within it. The default test target is local `postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public`; optionally export `TEST_DATABASE_URL` for that database. The harness checks the database name before mutation and creates only random `lab4_test_*` schemas. It does not create, reset, migrate or reseed the development database.

### 2. Install Dependencies

```bash
# Run these commands from the repository root, using the checked-in lockfiles.
npm ci
npm ci --prefix server
npm ci --prefix client
```

### 3. Database Migration & Idempotent Seeding

Issues 19–24 implement the Actions foundation, API/UI, workflow and dashboards. Issue 25 hardens the integrated application; it adds no migration or seed change.

The historical chain creates `Category` but the schema maps `categories`. The forward prerequisite migration `20261015090000_reconcile_lab3_schema` renames that table, its index/sequence and aligns the existing `users.updatedAt` default without rewriting data. The separate `20261015090100_lab4_actions_foundation` adds Actions, minimal audit events, creation-retry records and a Ticket workflow revision.

For a **new empty database**, deliberately configure its `DATABASE_URL`, then apply the checked-in chain:

```bash
cd server
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

For an **existing database**, verify schema and migration history first. If it already has `categories`, has both table names, or lacks `_prisma_migrations`, stop and prepare a separate baseline reconciliation with backups. Do not reset it, replay the old User migration over existing data, edit historical migrations, or blindly mark migrations applied. Issue 19 rehearses repairs only on disposable test schemas; the development database is not reconciled automatically.

The default seed includes Labs 1–4. Existing accounts, password hashes, activity, ownership, Ticket/Action state and timestamps are preserved. Newly created demonstration accounts use `Initial123!` and require a password change; this password does not replace an existing user's password. Stable new fixture identities supply all eight Ticket states, zero/one/multiple Actions, all three Action states, assigned/unassigned work, different creators/owners and an empty Requester dashboard. Seed insertion events describe only new fixture creation, never fabricated legacy work.

`TOKTICKIT_SEED_SCOPE=baseline` is an explicit fixture profile used by earlier-lab regression suites. It creates the original Lab 1–3 examples without Action fixtures so their Ticket cleanup remains valid. The separate Lab 4 seed suite always runs the full seed. Both profiles preserve existing records; neither is a reset command.

### 4. Running Development Servers

- **Backend Express Server**:
  ```bash
  cd server
  npm run dev
  ```
  API starts from current TypeScript source at `http://localhost:3000`. `npm run dev` explicitly loads `server/.env`; an already exported variable takes precedence. A missing `.env` or `DATABASE_URL` fails clearly. Port-in-use errors identify an existing server; do not launch a second API or kill an unidentified process.

- **Frontend React Application**:
  ```bash
  cd client
  npm run dev
  ```
  Vite starts at `http://localhost:5173` with a strict port: it fails rather than silently selecting another port. `client/.env` must set `VITE_API_URL=http://localhost:3000`. Use `localhost` consistently for frontend and API so the Strict session cookie stays same-site.

**Existing account credentials:** `Initial123!` is only the initial password for a newly created seeded account. After first-login password change, use that account's current password. Seeding preserves existing hashes (`update: {}`); it does not restore the initial password. Never reset/reseed as a response to a connection error. Unknown current credentials must be reported, not replaced automatically.

**Failure distinction:** an unreachable API shows “Unable to reach the sign-in service”; a server/configuration failure shows “Sign-in service unavailable”; a rejected current credential remains “Invalid email or password.” `/api/health` alone does not prove database readiness.

**Startup smoke, from the repository root:**

```bash
npm run test:startup
npm run smoke:startup -- --connectivity-only
```

The smoke owns separate source API/frontend services on localhost ports 3300/5300, never reuses an unidentified server, and stops them afterward. It loads the existing server configuration, checks the normal development frontend/API configuration, queries the API's own Prisma connection for `toktickit/public` and Ticket retry columns, verifies health plus a database-backed read, and checks the actual served frontend API origin. It performs no database writes, seed, migration or password change. Override `SMOKE_API_PORT`/`SMOKE_FRONTEND_PORT` for free smoke ports; `SMOKE_EXPECTED_DATABASE`/`SMOKE_EXPECTED_SCHEMA` explicitly select a different intended target. Normal development services on 3000/5173 can keep running. Do not run it against an unapproved deployment.

For authentication verification, securely supply `SMOKE_EMAIL`, `SMOKE_PASSWORD` and `SMOKE_ROLE` (`REQUESTER`, `IT_STAFF` or `ADMINISTRATOR`) for an explicitly controlled current account, then run `npm run smoke:startup`. Repeat for each role as needed. Chromium must be installed for the existing Playwright dependency. The smoke verifies real browser login, the localhost HttpOnly session cookie, matching `/api/auth/me` identity/role and reload. It never logs the password, session value, secret or database URL. Without credentials the authenticated command fails; `--connectivity-only` explicitly reports **AUTH NOT VERIFIED**. This is a startup/session smoke, not migration replay, integrated workflow regression, or screenshot evidence.

**Production entrypoint:** after `npm run build --prefix server`, run `npm start --prefix server`. TypeScript currently emits `server/dist/src/index.js` because the compilation includes `src`, `prisma` and `tests`; `npm start` targets that entrypoint. It optionally loads `server/.env`, preserving exported deployment values. Provide the intended deployment `DATABASE_URL` and private `SESSION_SECRET`; build/start does not migrate or seed. Final deployment and schema-readiness verification remains Issue 28.

### 5. Running Automated Tests

- **Run Server Unit & API Test Suites (Vitest)**:
  ```bash
  cd server
  npm test
  ```

  This runs all existing server tests followed by `npm run test:data` (migration, seed and persistence integrity). Each file owns a randomly named schema in the dedicated `toktickit_test` database. The URL is validated before any mutation; actual migrations replace `db push` in the active test setup. No test may target the development database or drop `public`. PostgreSQL's `pg_dump` and `psql` must be on `PATH` for the disposable recovery rehearsal. Action/workflow APIs are covered by the default suite; data tests separately prove persistence/migration behavior. Test uploads and attachment fixtures live inside each disposable harness directory and are removed with it; development uploads are not cleaned.

  `npm run test:data` runs only the new data suites. Migration tests replay the historical chain, separately verify the prerequisite repair, compare the migrated schema with Prisma and restore a disposable dump plus a referenced attachment-file copy. Normal database backups must include uploads separately; database dumps do not contain file bytes.

- **Run Client Component & Style Test Suites (Vitest)**:
  ```bash
  cd client
  npm test
  ```

- **Run Playwright End-to-End (E2E) Test Suite**:
  ```bash
  npx playwright test
  ```

  First verify that both application servers use isolated test data. The current Playwright config reuses existing servers, so setting a test URL alone is not sufficient. Issue 19 does not run or implement Lab 4 E2E; the root `npm run test:e2e` still selects only Lab 2.


### 6. TypeScript and production builds

From the repository root:

```bash
(cd server && npx tsc --noEmit)
(cd client && npx tsc --noEmit)
npm run build --prefix server
npm run build --prefix client
```

Builds normally write ignored `dist/` directories. To preserve existing generated output, pass an unused temporary output path: `npm run build --prefix server -- --outDir /private/tmp/toktickit-server-review` and `npm run build --prefix client -- --outDir /private/tmp/toktickit-client-review`. Client compilation has `noEmit`; Vite resolves local TypeScript before sibling JavaScript. Do not delete existing generated source siblings or cookies as part of verification.

### 7. Demonstrating current behavior

Use deliberately prepared demonstration data, with permission before changing any existing database. Newly seeded demonstration accounts start with mandatory password change. Requesters land on My Tickets; Staff on Ticket Queue; Administrators on User Management. Each role can open its Dashboard. Staff/Admin can open Ticket Detail and Actions Taken; Requesters have owned read-only Actions. Test planned work, completed follow-up, resolution blocking, refreshed conflict review and identical Action-create replay through the documented APIs.

Current Playwright configuration is not an isolated E2E harness. It can reuse development servers, mutate account passwords and replace earlier screenshots. Do not execute browser suites until service/data isolation and separate evidence destinations are verified under Issue 27. `npm run test:e2e` at the root still selects only Lab 2.
