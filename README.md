# TokTickIT

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Testing**: Vitest, Supertest, React Testing Library

## Workspace Structure

```
toktickit/
├── client/          # Frontend React + Vite application
├── server/          # Backend Express + Prisma API
│   ├── prisma/      # Database schema, migrations, and seed scripts
│   ├── src/         # Express server source code
│   └── tests/       # Supertest & Vitest tests
├── docs/            # Lab documentation and peer review records
├── .gitignore
└── README.md
```

## Setup & Getting Started

### 1. Configure Environment Files

Copy the example environment files (`.env.example`) for both server and client:

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

Secrets, database credentials, and `node_modules/` are excluded via `.gitignore`.

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Database Setup & Seeding

Ensure your local PostgreSQL database service is running on port 5432, then run:

```bash
cd server
npx prisma migrate dev --name init
npm run prisma:seed
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

- **Run Server Integration Tests (Supertest)**:
  ```bash
  cd server
  npm test
  ```

- **Run Client Component Tests (Vitest)**:
  ```bash
  cd client
  npm test
  ```
