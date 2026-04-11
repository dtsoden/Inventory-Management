#!/usr/bin/env node
// One-off migration script: replace raw fetch() with apiFetch() across the
// remaining client React files. Adds the import if missing. Idempotent.
// Run with:  node tests/harness/migrate-fetch.mjs
// Delete after merge.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILES = [
  'src/app/(authenticated)/assistant/page.tsx',
  'src/app/(authenticated)/audit-log/page.tsx',
  'src/app/(authenticated)/insights/page.tsx',
  'src/app/(authenticated)/inventory/categories/page.tsx',
  'src/app/(authenticated)/inventory/items/[id]/page.tsx',
  'src/app/(authenticated)/inventory/manufacturers/page.tsx',
  'src/app/(authenticated)/inventory/page.tsx',
  'src/app/(authenticated)/inventory/[id]/page.tsx',
  'src/app/(authenticated)/notifications/page.tsx',
  'src/app/(authenticated)/procurement/catalog/page.tsx',
  'src/app/(authenticated)/procurement/create/page.tsx',
  'src/app/(authenticated)/procurement/orders/[id]/edit/page.tsx',
  'src/app/(authenticated)/procurement/orders/[id]/page.tsx',
  'src/app/(authenticated)/procurement/page.tsx',
  'src/app/(authenticated)/profile/page.tsx',
  'src/app/(authenticated)/receiving/page.tsx',
  'src/app/(authenticated)/receiving/[id]/page.tsx',
  'src/app/(authenticated)/settings/data-sources/new/page.tsx',
  'src/app/(authenticated)/settings/data-sources/page.tsx',
  'src/app/(authenticated)/settings/integrations/page.tsx',
  'src/app/(authenticated)/settings/lists/page.tsx',
  'src/app/(authenticated)/settings/notifications/page.tsx',
  'src/app/(authenticated)/settings/page.tsx',
  'src/app/(authenticated)/settings/sample-data/page.tsx',
  'src/app/(authenticated)/settings/security/page.tsx',
  'src/app/(authenticated)/settings/users/page.tsx',
  'src/app/(authenticated)/vendors/page.tsx',
  'src/app/(authenticated)/vendors/vendor-form-sheet.tsx',
  'src/app/(authenticated)/vendors/[id]/page.tsx',
];

const IMPORT_LINE = "import { apiFetch } from '@/lib/client/BaseApiClient';";

let totalCalls = 0;
let totalFiles = 0;
let skipped = [];

for (const rel of FILES) {
  const path = `C:/REPO/Shane-Inventory/${rel}`;
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch (e) {
    skipped.push({ file: rel, reason: 'read failed: ' + e.message });
    continue;
  }

  // Count fetch( calls. Only function calls, not inside identifiers like
  // window.fetch, prefetch, etc. Use a word-boundary regex.
  const fetchPattern = /(?<![A-Za-z0-9_$.])fetch\(/g;
  const matches = src.match(fetchPattern);
  if (!matches || matches.length === 0) {
    skipped.push({ file: rel, reason: 'no fetch() calls found' });
    continue;
  }

  let updated = src;

  // Add import if not already present.
  if (!updated.includes(IMPORT_LINE)) {
    // Find the last import line. We insert AFTER it on a new line.
    const importLines = updated.matchAll(/^import .*?$/gm);
    let lastImportEnd = -1;
    for (const m of importLines) {
      lastImportEnd = m.index + m[0].length;
    }
    if (lastImportEnd < 0) {
      skipped.push({ file: rel, reason: 'no import lines found, cannot insert' });
      continue;
    }
    updated =
      updated.slice(0, lastImportEnd) +
      '\n' +
      IMPORT_LINE +
      updated.slice(lastImportEnd);
  }

  // Replace every word-boundary fetch( with apiFetch(.
  updated = updated.replace(fetchPattern, 'apiFetch(');

  writeFileSync(path, updated, 'utf8');
  totalFiles += 1;
  totalCalls += matches.length;
  console.log(`  migrated ${rel}: ${matches.length} call(s)`);
}

console.log(`\n=== migrated ${totalCalls} fetch() calls across ${totalFiles} files ===`);
if (skipped.length > 0) {
  console.log('\nskipped:');
  for (const s of skipped) console.log(`  ${s.file}: ${s.reason}`);
}
