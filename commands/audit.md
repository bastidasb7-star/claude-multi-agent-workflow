---
description: Run the quality workflow on an Express API — review and coverage mapping in parallel, then write the missing tests.
argument-hint: "[path to the API, default: course-api]"
---

Run the **quality-flow** workflow on the API at `$ARGUMENTS`. If no path was given, use `course-api`. Every subagent below must be told this path and must work inside it.

## Step 1 — Review and map coverage (in parallel)

These two jobs are independent and read-only, so start them **at the same time, in a single message with two Agent calls**:

- **code-reviewer** subagent: review the routes and data store at the API path and return its findings table plus "Behaviours worth a test".
- **coverage-mapper** subagent: map every route + status code against the existing tests and return the coverage table, the gaps, the test file to extend and the test style.

Wait until **both** have returned before moving on. If either fails, stop and report which one and why.

## Step 2 — Write the missing tests (depends on Step 1)

Start the **test-writer** subagent only after Step 1 is complete. Pass it, verbatim:

1. the API path;
2. the coverage-mapper's "Gaps", "Test file to extend" and "Test style";
3. the code-reviewer's "Behaviours worth a test" and any high/medium findings.

Tell it to remove duplicates between the two lists, add the tests, and run the suite until it is green (using `todo` for tests that expose real application bugs).

## Step 3 — Report

Do this yourself, without another subagent. Combine the three results into one short report:

```
# quality-flow audit — <path>

## Review findings      (from code-reviewer)
## Coverage before → after   (gaps from coverage-mapper, tests added by test-writer)
## Suite result          (from test-writer)
## Bugs to fix next      (reviewer findings confirmed by a todo test first)
```

Do not modify application code in this workflow — only the test-writer changes files, and only test files.
