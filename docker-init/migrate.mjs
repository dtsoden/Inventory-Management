// Idempotent runtime migrations for existing inventory.db files.
// New deployments get the latest schema via inventory.db.template;
// existing databases need ALTER TABLE statements applied here so we
// never delete user data.

import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/inventory.db' });

async function columnExists(table, column) {
  const res = await db.execute(`PRAGMA table_info("${table}")`);
  return res.rows.some((r) => r.name === column);
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await columnExists(table, column))) {
    console.log(`[migrate] Adding ${table}.${column}`);
    await db.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
  }
}

try {
  await addColumnIfMissing('User', 'avatarUrl', 'TEXT');
  console.log('[migrate] Done.');
} catch (err) {
  console.error('[migrate] Error:', err);
  process.exit(1);
}
