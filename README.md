# TokTickIT

An end-user facing IT support ticketing system built with a unified Zen Green design system and Spec-Driven Development (Spec DD).

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (with `bcrypt` password hashing & session management)
- **Testing**: Vitest, Supertest, React Testing Library, Playwright E2E

## Key Features (Lab 3 Increment)

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

## Workspace Structure

```
toktickit/
├── client/          # Frontend React + Vite application
├── server/          # Backend Express + Prisma API
│   ├── prisma/      # Database schema, migrations (0_init_lab03_users), and seed scripts
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

*Secrets, database credentials, uploaded attachments, and `node_modules/` are strictly excluded via `.gitignore`.*

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Database Migration & Idempotent Seeding

Ensure local PostgreSQL service is running on port 5432, then execute:

```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

### 4. Running Development Servers

- **Backend Express Server**:
  ```bash
  cd server
  npm run dev
  ```
  API starts at `http://localhost:3000`.

- **Frontend React Application**:
  ```bash
  cd client
  npm run dev
  ```
  Vite server starts at `http://localhost:5173`.

### 5. Running Automated Tests

- **Run Server Unit & API Test Suites (Vitest)**:
  ```bash
  cd server
  npm test
  ```

- **Run Client Component & Style Test Suites (Vitest)**:
  ```bash
  cd client
  npm test
  ```

- **Run Playwright End-to-End (E2E) Test Suite**:
  ```bash
  npx playwright test
  ```
