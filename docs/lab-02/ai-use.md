# Lab 2 — AI Use and Reflection

**LLM/agent used:** Antigravity AI Coding Agent (Google DeepMind) with Gemini 3.6 Flash (Medium thinking level)

## Selected key prompts (6–10)

| #   | Prompt (summarised)                                                                                                                           | What I did with the result                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Audit the implementation against every AC and tests. Report missing evidence, skipped tests, untested failure states, and UI-spec deviations. | Used the audit results to find anything still missing.                                                  |
| 2   | Implement the Create Ticket functionality according to the Lab 2 specification and planned tests.                                             | Use it as starting point. Then do the manual testing and asked LLM to act as reviewer.                  |
| 3   | Help draft the Lab 2 engineering contract and required specification documents.                                                               | Used the suggestions to prepare and review the docs files and check them against lab requirements.      |
| 4   | Implement the Create Ticket according to the docs file. Do not addthat are explicitely asked to excluded.                                     | Tested the feature against the acceptance criteria.                                                     |
| 5   | Audit the completed implementation against the acceptance criteria, planned tests, and Zen Green UI specification.                            | Used it to check colors, button hierarchy, overlap, and horizontal overflow across screen sizes.        |
| 6   | Read the Lab 2 requirements and create a step-by-step implementation plan before coding.                                                      | Used it to understand the requirements, issue dependencies, required branches and implementation order. |

## Reflection

Throughout Lab 2, I made it a habit to remind the LLM to check the relevant .md files and the Lab 2 requirement sheet whenever I asked it to work on an issue. I noticed that without this reminder, it could sometimes overlook certain requirements or over-engineer parts that were not necessary.
