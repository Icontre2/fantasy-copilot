#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [contentId, decision, actor = 'human'] = process.argv.slice(2);

if (!contentId || !['approve', 'reject'].includes(decision)) {
  console.error('Usage: npm run marketing:approve -- <contentId> <approve|reject> [actor]');
  process.exit(1);
}

const match = /^LL-(\d{8})-\d{3}$/.exec(contentId);
if (!match) throw new Error(`Invalid contentId: ${contentId}`);

const compactDate = match[1];
const date = `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
const packagePath = path.join(process.cwd(), 'marketing', 'generated', date, contentId, 'package.json');
const pkg = JSON.parse(await readFile(packagePath, 'utf8'));

if (pkg.status !== 'pending_approval') {
  throw new Error(`Refusing transition: ${contentId} is '${pkg.status}', expected 'pending_approval'`);
}

if (!pkg.qa || pkg.qa.pass !== true) {
  throw new Error(`Refusing approval: ${contentId} has not passed QA`);
}

const now = new Date().toISOString();
pkg.status = decision === 'approve' ? 'approved' : 'rejected';
pkg.approval = {
  ...(pkg.approval ?? {}),
  required: true,
  status: pkg.status,
  decidedAt: now,
  decidedBy: actor
};

await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`${contentId}: ${pkg.status} by ${actor}`);
