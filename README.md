# TokTickIT

An IT Service Desk ticketing and system management application built for Lab 1.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Testing**: Vitest, Supertest, React Testing Library

## Workspace Structure

```
toktickit/
├── client/          # Frontend React + Vite application
├── server/          # Backend Express + Prisma API
│   ├── prisma/      # Database schema and seed scripts
│   ├── src/         # Express server source code
│   └── tests/       # Supertest & Vitest tests
├── docs/            # Lab documentation and peer review records
├── .gitignore
└── README.md
```

## Setup & Getting Started

### 1. Configure Environment Files

Copy the example environment files for both server and client:

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

### 2. Install Dependencies

Install dependencies for both backend and frontend:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Running Development Servers

- **Backend Server**:
  ```bash
  cd server
  npm run dev
  ```
  API starts at `http://localhost:3000`.

- **Frontend Client**:
  ```bash
  cd client
  npm run dev
  ```
  Vite server starts at `http://localhost:5173`.

### 4. Running Tests

- **Run Server Tests**:
  ```bash
  cd server
  npm test
  ```

- **Run Client Tests**:
  ```bash
  cd client
  npm test
  ```