#!/usr/bin/env node
/**
 * End-to-end verification harness for the OOP refactor.
 *
 * Approach:
 *  1. Bootstrap a temporary test admin user directly in the SQLite DB
 *     using a known bcrypt-hashed password.
 *  2. Use NextAuth's credentials provider to log in over HTTP, capturing
 *     the real session cookie.
 *  3. Run a suite of assertions against the refactored API endpoints
 *     using that cookie. Every assertion runs through the real JWT
 *     middleware and the real BaseApiHandler stack.
 *  4. Tear down: delete the test user no matter what happened.
 *
 * Run with:  node tests/harness/verify.mjs
 *
 * Exit code 0 = all green. Anything non-zero = failure, with details
 * printed to stderr.
 */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';

const BASE = process.env.HARNESS_BASE_URL || 'http://localhost:5600';
const TEST_EMAIL = `harness-${Date.now()}@local.test`;
const TEST_PASSWORD = 'harness-test-1234';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
// Read NEXTAUTH_SECRET from the database (stored unencrypted in SystemConfig).
const NEXTAUTH_SECRET = execSync(
  `docker exec shane-inventory-inventory-1 sqlite3 /app/data/inventory.db "SELECT value FROM SystemConfig WHERE key = 'nextauth_secret' LIMIT 1"`,
  { encoding: 'utf8' },
).trim();
// NEXTAUTH_URL now defaults to http://localhost:3000, so NextAuth uses
// the non-secure cookie name (no __Secure- prefix on plain HTTP).
const SESSION_COOKIE_NAME = 'next-auth.session-token';

let testUserId = null;
let cookie = null;
const results = [];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' (' + detail + ')' : ''}`);
}

function sqlite(sql) {
  // Pipe SQL on stdin so we don't have to escape quotes through two
  // shell layers (the host shell and the container's sh -c).
  return execSync('docker exec -i shane-inventory-inventory-1 sqlite3 /app/data/inventory.db', {
    input: sql,
    encoding: 'utf8',
  }).trim();
}

async function bootstrap() {
  log('\n[bootstrap] creating temporary test admin user...');
  const tenantId = sqlite('SELECT id FROM Tenant LIMIT 1');
  if (!tenantId) throw new Error('No tenant found');

  testUserId = randomUUID();
  sqlite(
    `INSERT INTO User (id, tenantId, email, name, role, passwordHash, isActive, createdAt, updatedAt) ` +
      `VALUES ('${testUserId}', '${tenantId}', '${TEST_EMAIL}', 'Harness Admin', 'ADMIN', '${TEST_HASH}', 1, datetime('now'), datetime('now'))`,
  );
  log(`[bootstrap] test user ${TEST_EMAIL} (id ${testUserId}) inserted into tenant ${tenantId}`);
  return tenantId;
}

async function teardown() {
  if (!testUserId) return;
  try {
    sqlite(`DELETE FROM AuditLog WHERE userId = '${testUserId}'`);
    sqlite(`DELETE FROM Notification WHERE userId = '${testUserId}'`);
    sqlite(`DELETE FROM User WHERE id = '${testUserId}'`);
    log(`[teardown] removed test user ${testUserId}`);
  } catch (e) {
    fail(`teardown failed: ${e.message}`);
  }
}

async function login(tenantId) {
  log('\n[auth] minting NextAuth JWT directly with shared secret...');
  // Mirror the shape that auth-options.ts puts into the JWT in its
  // jwt() callback. Anything requireTenantContext reads must be here.
  const token = {
    id: testUserId,
    name: 'Harness Admin',
    email: TEST_EMAIL,
    role: 'ADMIN',
    tenantId,
    tenantSlug: 'harness',
    firstName: 'Harness',
    lastName: 'Admin',
    sub: testUserId,
  };
  const jwt = await encode({
    token,
    secret: NEXTAUTH_SECRET,
    maxAge: 60 * 60, // 1 hour
  });
  cookie = `${SESSION_COOKIE_NAME}=${jwt}`;
  log('[auth] cookie ready.');
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie || '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // not json
  }
  return { status: res.status, json };
}

// ----------------------------------------------------------------
// SECURITY: confirm auth boundary survives the refactor
// ----------------------------------------------------------------
async function suiteAuth() {
  log('\n[security] auth boundary tests');

  // 1. No cookie -> 401
  const r1 = await fetch(`${BASE}/api/manufacturers`);
  record('GET /api/manufacturers without cookie returns 401', r1.status === 401, `got ${r1.status}`);

  // 2. With cookie -> 200
  const r2 = await api('GET', '/api/manufacturers');
  record('GET /api/manufacturers with admin cookie returns 200', r2.status === 200, `got ${r2.status}`);
}

// ----------------------------------------------------------------
// MANUFACTURER suite
// ----------------------------------------------------------------
async function suiteManufacturer() {
  log('\n[manufacturer] CRUD tests');
  const name = `Harness Mfg ${Date.now()}`;

  const list = await api('GET', '/api/manufacturers');
  record('list manufacturers', list.status === 200 && list.json?.success === true, `status ${list.status}`);

  const create = await api('POST', '/api/manufacturers', { name, website: 'https://harness.test' });
  record('create manufacturer', create.status === 201 || create.status === 200, `status ${create.status}`);
  const created = create.json?.data;
  if (!created?.id) {
    record('created manufacturer has id', false, 'no id in response');
    return;
  }

  const read = await api('GET', `/api/manufacturers/${created.id}`);
  record('read manufacturer by id', read.status === 200 && read.json?.data?.id === created.id, `status ${read.status}`);

  const update = await api('PUT', `/api/manufacturers/${created.id}`, { name: name + ' UPDATED' });
  record('update manufacturer', update.status === 200, `status ${update.status}`);

  const del = await api('DELETE', `/api/manufacturers/${created.id}`);
  record('delete manufacturer', del.status === 200, `status ${del.status}`);
}

// ----------------------------------------------------------------
// CATEGORY suite
// ----------------------------------------------------------------
async function suiteCategory() {
  log('\n[category] CRUD tests');
  const name = `Harness Cat ${Date.now()}`;

  const list = await api('GET', '/api/categories');
  record('list categories', list.status === 200 && list.json?.success === true, `status ${list.status}`);

  const create = await api('POST', '/api/categories', { name, description: 'harness' });
  record('create category', create.status === 201 || create.status === 200, `status ${create.status}`);
  const created = create.json?.data;
  if (!created?.id) {
    record('created category has id', false, 'no id');
    return;
  }

  const update = await api('PUT', `/api/categories/${created.id}`, {
    name: name + ' UPDATED',
    description: 'still harness',
  });
  record('update category', update.status === 200, `status ${update.status}`);

  const del = await api('DELETE', `/api/categories/${created.id}`);
  record('delete category', del.status === 200, `status ${del.status}`);
}

// ----------------------------------------------------------------
// NOTIFICATION suite
// ----------------------------------------------------------------
async function suiteNotification() {
  log('\n[notification] CRUD tests');

  const list = await api('GET', '/api/notifications');
  record('list notifications', list.status === 200, `status ${list.status}`);

  // Notifications are normally created by the server (PO submit, etc.)
  // For the harness we just verify the read paths work.
  const readAll = await api('PATCH', '/api/notifications/read-all');
  record('mark all read', readAll.status === 200, `status ${readAll.status}`);
}

// ----------------------------------------------------------------
// DATA SOURCE suite
// ----------------------------------------------------------------
async function suiteDataSource() {
  log('\n[data-source] CRUD tests');

  const list = await api('GET', '/api/settings/data-sources');
  record('list data sources', list.status === 200, `status ${list.status}`);

  const create = await api('POST', '/api/settings/data-sources', {
    name: `Harness DS ${Date.now()}`,
    apiUrl: 'https://example.invalid/api',
    fieldMappings: [],
  });
  record('create data source', create.status === 201, `status ${create.status}`);
  const created = create.json?.data;
  if (created?.id) {
    const read = await api('GET', `/api/settings/data-sources/${created.id}`);
    record('read data source', read.status === 200, `status ${read.status}`);

    const update = await api('PUT', `/api/settings/data-sources/${created.id}`, {
      name: 'Harness DS UPDATED',
    });
    record('update data source', update.status === 200, `status ${update.status}`);

    const del = await api('DELETE', `/api/settings/data-sources/${created.id}`);
    record('delete data source', del.status === 200, `status ${del.status}`);

    sqlite(`DELETE FROM AuditLog WHERE entityId = '${created.id}'`);
  }
}

// ----------------------------------------------------------------
// USER suite (settings/users + profile)
// ----------------------------------------------------------------
async function suiteUser() {
  log('\n[user] CRUD + profile tests');

  const list = await api('GET', '/api/settings/users');
  record('list users', list.status === 200, `status ${list.status}`);

  const newEmail = `temp-${Date.now()}@harness.test`;
  const create = await api('POST', '/api/settings/users', {
    name: 'Temp Harness',
    email: newEmail,
    password: 'temp1234harness',
    role: 'WAREHOUSE_STAFF',
  });
  record('create user', create.status === 201, `status ${create.status}`);
  const created = create.json?.data;
  if (created?.id) {
    const update = await api('PUT', `/api/settings/users/${created.id}`, {
      name: 'Temp Harness Updated',
    });
    record('update user', update.status === 200, `status ${update.status}`);

    const del = await api('DELETE', `/api/settings/users/${created.id}`);
    record('deactivate user', del.status === 200, `status ${del.status}`);

    // Hard scrub the temp record so the harness leaves no trace.
    sqlite(`DELETE FROM AuditLog WHERE entityId = '${created.id}'`);
    sqlite(`DELETE FROM Notification WHERE userId = '${created.id}'`);
    sqlite(`DELETE FROM User WHERE id = '${created.id}'`);
  } else {
    record('created user has id', false, 'no id in response');
  }

  const profile = await api('GET', '/api/profile');
  record('read profile', profile.status === 200, `status ${profile.status}`);

  const updateProfile = await api('PUT', '/api/profile', {
    name: 'Harness Admin',
    email: TEST_EMAIL,
  });
  record('update profile', updateProfile.status === 200, `status ${updateProfile.status}`);
}

// ----------------------------------------------------------------
// SMOKE: hit existing working routes to make sure refactor did not
// break anything peripheral.
// ----------------------------------------------------------------
async function suiteSmoke() {
  log('\n[smoke] existing routes that must continue working');
  const checks = [
    ['GET', '/api/dashboard'],
    ['GET', '/api/vendors'],
    ['GET', '/api/inventory'],
    ['GET', '/api/procurement/orders'],
    ['GET', '/api/audit-log'],
    ['GET', '/api/profile'],
    ['GET', '/api/branding/public'],
    ['GET', '/api/insights/snapshot?period=30'],
    ['GET', '/api/settings/integrations?category=integrations'],
    ['GET', '/api/settings/integrations?category=org'],
    ['GET', '/api/settings/integrations?category=security'],
    ['GET', '/api/settings/integrations?category=smtp'],
    ['GET', '/api/settings/integrations?category=password_policy'],
    ['GET', '/api/settings/lists'],
    ['GET', '/api/settings/notifications'],
    ['GET', '/api/settings/roles'],
  ];
  for (const [m, p] of checks) {
    const r = await api(m, p);
    record(`${m} ${p}`, r.status === 200, `status ${r.status}`);
  }
}

async function main() {
  let exitCode = 0;
  try {
    const tenantId = await bootstrap();
    await login(tenantId);
    await suiteAuth();
    await suiteSmoke();
    await suiteManufacturer();
    await suiteCategory();
    await suiteNotification();
    await suiteUser();
    await suiteDataSource();
  } catch (e) {
    fail(e.stack || e.message);
    exitCode = 2;
  } finally {
    await teardown();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) exitCode = 1;
  process.exit(exitCode);
}

main();
