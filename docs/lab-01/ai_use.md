# Lab 1 — AI Use and Reflection (fill this in)

**LLM/agent used:** Antigravity AI Coding Agent (Google DeepMind) with Gemini 3.6 Flash (Medium thinking level)

## Selected key prompts (6–10)

| #   | Prompt (summarised)                                                                                                                                                                                  | What I did with the result                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Plan Lab 1 Implementation**: Read enclosed TokTickIT Lab 1 requirements. Summarize 4 GitHub Issues, dependencies, outputs, automated tests, and propose implementation order without writing code. | Reviewed the overall architecture walkthrough, file responsibilities, and step-by-step implementation order before coding.     |
| 2   | **Set Up Full-Stack Project**: Setup TokTickIT tech stack using React, TypeScript, Vite, Bootstrap, Node.js, Express, PostgreSQL, and Prisma with required folder structure.                         | Verified installed packages, created server and client `.env` files, and updated setup instructions in `README.md`.            |
| 3   | **Implement Health Check**: Add `GET /api/health` to existing Express backend returning HTTP 200 with `status=ok` and `service="TokTickIT API"`.                                                     | Implemented the endpoint in `server/src/app.ts` and verified it passed Supertest integration tests (`health.test.ts`).         |
| 4   | **Implement Category Feature**: Create Prisma `Category` model with `id`, `name`, `createdAt`, create database migration, and seed categories idempotently.                                          | Defined schema in `schema.prisma`, generated database migration SQL files, and verified idempotent seeding script (`seed.ts`). |
| 5   | **Build and Test Check System UI**: Create a Bootstrap-based page with `[Check System]` button, loading state, health and categories API calls, and status display.                                  | Built responsive UI in `App.tsx` and `api.ts`, handling `Online` status, category list rendering, and `Offline` error states.  |
| 6   | **Review Final Lab 1 Work**: Review completed TokTickIT Lab 1 implementation against all acceptance criteria.                                                                                        | Audited all acceptance criteria across Issues 1, 2, 3, and 4 to ensure 100% compliance and verified Git Flow branch setup.     |

## Reflection

Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.

I improved my prompts by asking for a clear plan before generating code and keeping my Git commits small and focused. I got better results by strictly telling the AI what not to do, and I rejected suggestions whenever it tried to add unneeded dependencies or extra software.
