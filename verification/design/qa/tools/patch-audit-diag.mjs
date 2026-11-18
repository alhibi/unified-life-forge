import fs from 'node:fs';
import crypto from 'node:crypto';
const srcPath = 'scripts/audit-routes.mjs';
const src = fs.readFileSync(srcPath, 'utf8');
let out = src
  .replace("const ROOT = path.resolve(import.meta.dirname, '..');", "const ROOT = path.resolve(import.meta.dirname, '../../../..');")
  .replace("from './lib/session-fixture.mjs';", "from '../../../../scripts/lib/session-fixture.mjs';")
  .replace('if (row.pageErrors.length > 0) failures.push', 'if ((row.pageErrors ?? []).length > 0) failures.push');
if (out === src) throw new Error('patch failed');
const header = '/** QA DIAGNOSTIC COPY of scripts/audit-routes.mjs (source sha256 ' + crypto.createHash('sha256').update(src).digest('hex').slice(0,16) + ').\n * ONLY change: one-line guard for the closure-branch crash (finishRow dereferences row.pageErrors before it is assigned -> TypeError on every route), plus tool-relative paths.\n * This is NOT the gate; it proves what the shipped script would report modulo that bug. */\n';
const lines = out.split('\n');
out = lines[0] + '\n' + header + lines.slice(1).join('\n');
fs.mkdirSync('verification/design/qa/tools', { recursive: true });
fs.writeFileSync('verification/design/qa/tools/audit-routes.closure-diag.mjs', out);
console.log('diagnostic copy written; guard present:', out.includes('(row.pageErrors ?? [])'));
