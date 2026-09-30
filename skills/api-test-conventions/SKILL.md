---
name: api-test-conventions
description: Conventions for writing HTTP tests for a small Express API with node:test and supertest. Use when adding or fixing API tests, covering 400/404 error paths, or when asked "how should I test this route?".
---

# API test conventions

Apply these whenever you write or change tests for an Express API (for example `course-api/`).

## Setup

- Runner: Node's built-in `node:test` with `node:assert`. No Jest/Mocha.
- HTTP: `supertest` against the exported app — `const app = require('../server')`. Never call `app.listen()` in tests.
- State: call `store.reset()` in `test.beforeEach` so every test starts from the seed data.

```js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const store = require('../db/store');

test.beforeEach(() => store.reset());
```

## Writing a test

- Name it `'<METHOD> <path> <expected outcome>'`, e.g. `'POST /users returns 400 when email is missing'`.
- One behaviour per test. Assert the status code first, then the body.
- For errors, assert the documented shape: `assert.equal(typeof res.body.error, 'string')`.
- Use seed ids (`1`, `2`) for existing records and `999` for a missing one.
- For every route, cover the happy path, each `400` validation branch, and the `404` branch.

## When a test exposes a real bug

Don't change application code while writing tests. Keep the test and mark it so the suite stays green and the bug stays visible:

```js
test('GET /users/abc returns 400 for a non-numeric id', { todo: 'bug: returns 404' }, async () => { ... });
```

## Running

From the API folder: `npm test`. If npm fails because of special characters in the path, run `node --test` directly.
