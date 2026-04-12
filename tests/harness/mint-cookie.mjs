#!/usr/bin/env node
// Bootstrap a temp admin user and print a NextAuth session cookie value
// to stdout for browser injection during mobile/UI inspection.

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';

const TEST_EMAIL = `qa-${Date.now()}@local.test`;
const TEST_PASSWORD = 'qa-1234';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
const NEXTAUTH_SECRET = execSync(
  `docker exec shane-inventory-inventory-1 sqlite3 /app/data/inventory.db "SELECT value FROM SystemConfig WHERE key = 'nextauth_secret' LIMIT 1"`,
  { encoding: 'utf8' },
).trim();

function sqlite(sql) {
  return execSync(
    'docker exec -i shane-inventory-inventory-1 sqlite3 /app/data/inventory.db',
    { input: sql, encoding: 'utf8' },
  ).trim();
}

const tenantId = sqlite('SELECT id FROM Tenant LIMIT 1');
const tenantSlug = sqlite(`SELECT slug FROM Tenant WHERE id = '${tenantId}'`) || 'qa';
const userId = randomUUID();
sqlite(
  `INSERT INTO User (id, tenantId, email, name, role, passwordHash, isActive, createdAt, updatedAt) ` +
    `VALUES ('${userId}', '${tenantId}', '${TEST_EMAIL}', 'QA Admin', 'ADMIN', '${TEST_HASH}', 1, datetime('now'), datetime('now'))`,
);

const token = {
  id: userId,
  name: 'QA Admin',
  email: TEST_EMAIL,
  role: 'ADMIN',
  tenantId,
  tenantSlug,
  firstName: 'QA',
  lastName: 'Admin',
  sub: userId,
};
const jwt = await encode({ token, secret: NEXTAUTH_SECRET, maxAge: 60 * 60 });
process.stdout.write(JSON.stringify({ userId, jwt, email: TEST_EMAIL }));
