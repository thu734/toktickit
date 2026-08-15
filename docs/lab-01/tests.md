# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| #   | Tool      | Test                                                        | Result |
| --- | --------- | ----------------------------------------------------------- | ------ |
| 1   | Supertest | GET /api/health returns 200, status=ok                      | PASS   |
| 2   | Supertest | GET /api/categories returns 4 seeded categories in id order | PASS   |
| 3   | Vitest    | Heading renders                                             | PASS   |
| 4   | Vitest    | Success state shows Online + category list                  | PASS   |
| 5   | Vitest    | Error state shows Offline + message                         | PASS   |

Paste your passing terminal output / screenshot below.

```text
✓ tests/lab-01/categories.test.ts (1)
✓ tests/lab-01/health.test.ts (1)
Test Files  2 passed (2)
Tests       2 passed (2)

✓ tests/lab-01/App.test.tsx (3)
 ✓ App (3)
  ✓ renders the TokTickIT heading
  ✓ shows Online and the seeded categories on success
  ✓ shows an Offline error message when the API is unavailable
Test Files  1 passed (1)
Tests       3 passed (3)
```
