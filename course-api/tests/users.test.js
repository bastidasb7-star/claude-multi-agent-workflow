const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const store = require('../db/store');

test.beforeEach(() => store.reset());

test('GET /users returns the seeded list', async () => {
  const res = await request(app).get('/users');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
});

test('GET /users/:id returns 404 for a missing user', async () => {
  const res = await request(app).get('/users/999');
  assert.equal(res.status, 404);
});

test('POST /users creates a user', async () => {
  const res = await request(app)
    .post('/users')
    .send({ name: 'Grace Hopper', email: 'grace@example.com' });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, 'Grace Hopper');
  assert.ok(res.body.id);
});

test('PUT /users/:id updates an existing user', async () => {
  const res = await request(app).put('/users/1').send({ name: 'Ada L.' });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Ada L.');
});

test('PUT /users/:id returns 404 for a missing user', async () => {
  const res = await request(app).put('/users/999').send({ name: 'Nobody' });
  assert.equal(res.status, 404);
});

// -- GET /health --------------------------------------------------------

test('GET /health returns 200 with status ok and a numeric uptime', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(typeof res.body.uptime, 'number');
});

// -- GET /users/:id -------------------------------------------------------

test('GET /users/1 returns the seeded Ada record with 200', async () => {
  const res = await request(app).get('/users/1');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' });
});

test(
  'GET /users/abc returns 400 for a non-numeric id',
  { todo: 'bug: routes/users.js:13 converts bad ids with Number(), so "abc" becomes NaN and returns 404 instead of 400' },
  async () => {
    const res = await request(app).get('/users/abc');
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  }
);

test(
  'GET /users/1.0 does not return user 1',
  { todo: 'bug: routes/users.js:13 converts ids with Number(), so "1.0" coerces to 1 and matches user 1 instead of returning 400' },
  async () => {
    const res = await request(app).get('/users/1.0');
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  }
);

// -- POST /users ----------------------------------------------------------

test('POST /users returns 400 when the body is empty', async () => {
  const res = await request(app).post('/users').send({});
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('POST /users returns 400 when name is missing', async () => {
  const res = await request(app).post('/users').send({ email: 'new@example.com' });
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('POST /users returns 400 when email is missing', async () => {
  const res = await request(app).post('/users').send({ name: 'New User' });
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('POST /users returns 400 when name is an empty string', async () => {
  const res = await request(app).post('/users').send({ name: '', email: 'new@example.com' });
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test(
  'POST /users returns 400 when name is whitespace only',
  { todo: 'bug: routes/users.js:23 only checks truthiness, so "   " passes validation and creates a user' },
  async () => {
    const res = await request(app).post('/users').send({ name: '   ', email: 'new@example.com' });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  }
);

test(
  'POST /users returns 400 when name is a number',
  { todo: 'bug: routes/users.js:23 only checks truthiness, so name: 123 passes validation and creates a user' },
  async () => {
    const res = await request(app).post('/users').send({ name: 123, email: 'new@example.com' });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  }
);

test('POST /users returns 201 with an id one higher than the last, and GET /users/:id then returns that user', async () => {
  const createRes = await request(app)
    .post('/users')
    .send({ name: 'Grace Hopper', email: 'grace@example.com' });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.id, 3);

  const getRes = await request(app).get('/users/3');
  assert.equal(getRes.status, 200);
  assert.deepEqual(getRes.body, { id: 3, name: 'Grace Hopper', email: 'grace@example.com' });
});

test(
  'POST /users with malformed JSON returns 400 with a JSON error body',
  { todo: 'bug: server.js has no JSON error handler, so a body-parser SyntaxError falls through to Express\'s default HTML error page instead of { error }' },
  async () => {
    const res = await request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send('{ invalid json');
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  }
);

// -- PUT /users/:id ---------------------------------------------------------

test('PUT /users/:id returns 400 when the body is empty', async () => {
  const res = await request(app).put('/users/1').send({});
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test(
  'PUT /users/1 with name: null returns 400 and leaves the record unchanged',
  { todo: 'bug: routes/users.js:33 only rejects undefined, so name: null passes and db/store.js writes null onto the record' },
  async () => {
    const res = await request(app).put('/users/1').send({ name: null });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');

    const getRes = await request(app).get('/users/1');
    assert.equal(getRes.body.name, 'Ada Lovelace');
  }
);

test(
  'PUT /users/1 with email: "" returns 400 and leaves the record unchanged',
  { todo: 'bug: routes/users.js:33 only rejects undefined, so email: "" passes and overwrites the record with an empty string' },
  async () => {
    const res = await request(app).put('/users/1').send({ email: '' });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');

    const getRes = await request(app).get('/users/1');
    assert.equal(getRes.body.email, 'ada@example.com');
  }
);

test('PUT /users/1 with only email changes only the email and keeps the name', async () => {
  const res = await request(app).put('/users/1').send({ email: 'ada.new@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Ada Lovelace');
  assert.equal(res.body.email, 'ada.new@example.com');
});

test(
  'PUT /users/abc returns 400 for a non-numeric id',
  { todo: 'bug: routes/users.js:36 converts bad ids with Number(), so "abc" becomes NaN and returns 404 instead of 400' },
  async () => {
    const res = await request(app).put('/users/abc').send({ name: 'Someone' });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
  }
);

// -- Error handling for unmatched routes ------------------------------------

test(
  'GET /nonexistent returns 404 with a JSON error body',
  { todo: 'bug: server.js has no catch-all 404 handler, so unknown routes get Express\'s default HTML page instead of { error }' },
  async () => {
    const res = await request(app).get('/nonexistent');
    assert.equal(res.status, 404);
    assert.equal(typeof res.body.error, 'string');
  }
);

// -- db/store.js internals ---------------------------------------------------

test(
  'editing the array returned by store.listUsers() does not change later GET /users responses',
  { todo: 'bug: db/store.js:17 returns the internal users array by reference, so callers can mutate stored state directly' },
  async () => {
    const leaked = store.listUsers();
    leaked.push({ id: 999, name: 'Intruder', email: 'intruder@example.com' });

    const res = await request(app).get('/users');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  }
);

test('store.reset() restores the two seeded users and the next created id is 3', () => {
  store.createUser({ name: 'Temp', email: 'temp@example.com' });
  store.reset();

  const users = store.listUsers();
  assert.deepEqual(users, [
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
  ]);

  const created = store.createUser({ name: 'New Person', email: 'newperson@example.com' });
  assert.equal(created.id, 3);
});
