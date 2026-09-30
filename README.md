# quality-flow

A Claude Code plugin that runs a **code-quality workflow** on an Express API: two read-only subagents review the code and map test coverage in parallel, then a test-writing subagent turns their findings into passing tests.

This repository is both the plugin and the marketplace that offers it. `course-api/` is a small Express API included to test the plugin against.

## Install

```text
/plugin marketplace add bastidasb7-star/claude-multi-agent-workflow
/plugin install quality-flow@quality-flow-marketplace
```

Or load it straight from a clone, without installing:

```bash
cd course-api && npm install && cd ..
claude --plugin-dir .
```

## What's inside

| Component | Name (namespaced) | What it does |
|-----------|-------------------|--------------|
| Command | `/quality-flow:audit [path]` | Runs the whole workflow on an API (default `course-api`). |
| Subagent | `quality-flow:code-reviewer` | Read-only (`Read, Grep, Glob`, opus). Finds bugs, missing validation and broken conventions. |
| Subagent | `quality-flow:coverage-mapper` | Read-only (`Read, Grep, Glob`, haiku). Lists every route + status code and whether a test covers it. |
| Subagent | `quality-flow:test-writer` | Writer (`Read, Grep, Glob, Edit, Write, Bash`, sonnet). Adds the missing tests and runs the suite until green. |
| Skill | `quality-flow:api-test-conventions` | How tests are written here: `node:test` + `supertest`, `store.reset()`, naming, `todo` for real bugs. |
| Hook | `PostToolUse` on `Write\|Edit\|MultiEdit` | Runs the project's own ESLint on any JS file Claude changes and feeds errors back (`scripts/lint-on-edit.js`). |

## The workflow

```text
/quality-flow:audit course-api

  Step 1 (parallel)   code-reviewer ─┐
                      coverage-mapper ┘─► Step 2 (dependent) test-writer ─► Step 3 report
```

1. **Review + coverage map** run at the same time — both only read the code.
2. **Test writer** starts only after both return, using their gaps and findings as its input.
3. The main session merges everything into one report: findings, coverage before/after, suite result, bugs to fix next.

## Layout

```text
.claude-plugin/
  plugin.json          # manifest (name, version)
  marketplace.json     # marketplace catalog, source "./"
agents/                # code-reviewer, coverage-mapper, test-writer
commands/audit.md      # the workflow command
skills/api-test-conventions/SKILL.md
hooks/hooks.json       # uses ${CLAUDE_PLUGIN_ROOT}/scripts/lint-on-edit.js
scripts/lint-on-edit.js
course-api/            # sample API to run the plugin against
NOTES.md               # design notes
```

## Versioning

The version lives in `.claude-plugin/plugin.json` (and is mirrored in the marketplace entry). Bump it on every release so installed copies pick up the update with `/plugin marketplace update quality-flow-marketplace`.

See [NOTES.md](NOTES.md) for the design decisions.
