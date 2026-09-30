# NOTES — quality-flow

## What the plugin does

`quality-flow` packages a code-quality workflow for Express APIs. One command, `/quality-flow:audit [path]`, runs three subagents:

- **code-reviewer** — reads routes and the data store and reports bugs, missing validation and convention breaks;
- **coverage-mapper** — matches every route + status code against the existing tests and lists the gaps;
- **test-writer** — writes the missing tests in the project's style and runs the suite until it is green, marking tests that expose real bugs as `todo`.

It also ships the `api-test-conventions` skill (how tests are written: `node:test`, `supertest`, `store.reset()`, naming) and a `PostToolUse` hook that lints every JS file Claude writes or edits with the project's own ESLint.

## How to install

From any Claude Code session:

```text
/plugin marketplace add bastidasb7-star/claude-multi-agent-workflow
/plugin install quality-flow@quality-flow-marketplace
```

Then open the API you want to check and run `/quality-flow:audit <path>` (default `course-api`).

For local development, from the repo root: `cd course-api && npm install && cd .. && claude --plugin-dir .`, and use `/reload-plugins` after editing.

## Scoping decision — why each subagent got its tools and model

- **code-reviewer: `Read, Grep, Glob` + `opus`.** Reviewing is the hardest reasoning in the flow — spotting a `NaN` id, a leaked mutable array or a missing `400` branch means understanding intent, not just matching text — so it gets the strongest model. It gets *only* read-and-search tools because a reviewer that can edit tends to "fix" things silently; keeping it read-only makes its output a report you can trust and lets it run in parallel with no risk of conflicting writes.
- **coverage-mapper: `Read, Grep, Glob` + `haiku`.** Its job is mechanical: list routes, list tests, match them. A small, fast model is enough and keeps the parallel step cheap. No Bash — it doesn't need to run anything to read `res.status(...)` calls.
- **test-writer: `Read, Grep, Glob, Edit, Write, Bash` + `sonnet`.** It's the only agent that changes files, so it's the only one with `Edit`/`Write`, and it needs `Bash` to run `npm test` and iterate. Writing tests in an existing style is well-defined work, so `sonnet` balances quality and cost. Its prompt also limits it to test files — application fixes stay a human decision.

## Orchestration decision — parallel vs. sequential

- **Parallel: code-reviewer + coverage-mapper.** Neither needs the other's output and neither writes anything, so running them together is safe and roughly halves the wall-clock time of the first step. They look at the same code from two angles ("what is wrong?" vs. "what is untested?").
- **Sequential: test-writer waits for both.** Its input *is* their output: the gaps tell it what to cover, the review tells it which behaviours are likely broken and deserve a test. Starting it earlier would mean guessing, duplicating existing tests or missing the bugs the reviewer found. It is also the only step that writes files, so running it alone avoids edits happening while other agents are still reading.
- **Report in the main session.** Merging three short reports doesn't need a fresh context, so it's done by the orchestrator instead of a fourth agent.

## Things I found while building it

- The validator (and Claude Code) parse frontmatter that starts with `---\n`; on Windows with `core.autocrlf=true` files check out with CRLF. `.gitattributes` forces LF so the plugin behaves the same everywhere.
- `npm run lint` fails on Windows when the folder path contains `&` (npm's `.cmd` shim breaks). The hook script calls `node node_modules/eslint/bin/eslint.js` directly without a shell to avoid that, and exits silently if the project has no ESLint.
