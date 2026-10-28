# Lab 4 - AI Use and Reflection

**LLM/agent used:** Codex (6.1 Sol Medium) 

## Selected key prompts (6-10)



| # | Prompt (summarised) | What I did with the result |
| --- | --- | --- |
| 1 | Read the complete Lab 4 handout and inspect main/staging, propose Sprint 4 order, issues, dependencies, tests, migration and evidence; do not implement. | I reviewed through the implemenation plan and decided on what kanban issues be created and its dependences. |
| 2 | Draft Kanban Issues starting at Issue 18, reference the given github workflow and issue. | Choose the must follow plan and add some other issues as necessary. |
| 3 | Plan only Issue 18's six documents, label required, inherited and approval-dependent choices and do not silently resolve ambiguity. |Reviewed the planned six documents, checked which decisions were required, inherited, or optional, and approved the final choices before implementation. |
| 4 | Review the Actions Taken data model and migration plan for preservation of Labs 1–3 data, migration safety, audit integrity, and unnecessary schema additions. | Used the review to verify that the migration remained preserved without fabricating Actions or audit history. |
| 5 | Audit the proposed Issue 18 Lab 4 contract for overengineering. Identify which decisions are required by the handout, inherited from earlier Labs, or optional design choices, and recommend the smallest compliant scope. | Reviewed the flagged decision and removed unnecessary complexity. |
| 6 |Audit the Actions API against the Lab 4 business rules for authorization, assignment, lifecycle transitions, optimistic concurrency, idempotency, and rollback behavior. | Compared the findings with the implementation and added missing tests |

## Reflection

It is that I do not need to read every line of generated code. Instead, I should focus more closely on risky or important parts and verify the rest with automated tests and manual testing. I also learned that passing tests do not always mean the real application works, so manual testing is still necessary. Therefore, I used a combination of code review, automated tests, manual verification, and integrated E2E testing depending on the risk of each feature.
