#!/usr/bin/env node
/**
 * Route smoke runner — mounts every route declared in src/App.tsx in a fresh
 * process, one route per process by default.
 *
 * Why one process per route
 *   Mounting several routes in one jsdom process accumulates module-level
 *   timers, subscriptions and polling loops that are never torn down. The
 *   accumulation is a real (documented) teardown finding in the app, not a
 *   bug in this runner: after a few mounts the process can stop settling and
 *   the shard hits its wall-clock timeout even though each route mounts fine
 *   on its own. Per-route isolation costs process startup but is deterministic
 *   — which is the only property a safety net needs.
 *
 * Usage
 *   node scripts/smoke-routes.mjs                82 shards, 4 in parallel
 *   node scripts/smoke-routes.mjs --shards 20     coarser split (faster, riskier)
 *   node scripts/smoke-routes.mjs --parallel 1    serial, for debugging
 *   SMOKE_SHARD=3/82 bun run test:smoke           one shard, verbose-friendly
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
function numberArg(name, fallback) {
  const index = args.indexOf('--' + name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error('Invalid --' + name + ' "' + args[index + 1] + '"');
    process.exit(1);
  }
  return value;
}

const SHARDS = numberArg('shards', 82);
const PARALLEL = Math.min(numberArg('parallel', 4), SHARDS);
const SHARD_TIMEOUT_MS = 5 * 60 * 1000;

// Resolve Vitest from node_modules instead of shelling out to npx: a quality
// gate must not depend on a package runner being on PATH (CI has bitten us).
const VITEST = path.resolve(
  import.meta.dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest',
);

function runShard(index) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(VITEST, ['run', 'src/test/routes.smoke.test.tsx', '--reporter=dot'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SMOKE_ROUTES: '1', SMOKE_SHARD: index + '/' + SHARDS },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      // A wedged shard must fail the run, not hang it.
      child.kill('SIGKILL');
    }, SHARD_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        index,
        code,
        seconds: ((Date.now() - startedAt) / 1000).toFixed(1),
        stdout,
        stderr,
      });
    });
  });
}

console.log('Route smoke: ' + SHARDS + ' shards, ' + PARALLEL + ' in parallel, one route per process.\n');

const startedAt = Date.now();
const failed = [];
let next = 1;
let finished = 0;

async function worker() {
  for (;;) {
    const index = next;
    next += 1;
    if (index > SHARDS) return;
    const result = await runShard(index);
    finished += 1;
    const label = 'shard ' + index + '/' + SHARDS;
    if (result.code === 0) {
      console.log('▸ ' + label + ' … ok (' + result.seconds + 's) [' + finished + '/' + SHARDS + ']');
    } else {
      console.log('▸ ' + label + ' … FAILED (' + result.seconds + 's, exit ' + result.code + ')');
      failed.push({ index, ...result });
    }
  }
}

await Promise.all(Array.from({ length: PARALLEL }, () => worker()));

const total = ((Date.now() - startedAt) / 1000).toFixed(1);

if (failed.length > 0) {
  failed.sort((a, b) => a.index - b.index);
  for (const result of failed) {
    console.error('\n──── shard ' + result.index + '/' + SHARDS + ' output ────');
    console.error((result.stdout + result.stderr).slice(-4000));
  }
  console.error('\n✗ ' + failed.length + '/' + SHARDS + ' shard(s) failed: ' + failed.map((item) => item.index).join(', '));
  console.error('Re-run one with:  SMOKE_SHARD=' + failed[0].index + '/' + SHARDS + ' bun run test:smoke');
  process.exit(1);
}

console.log('\n✓ all ' + SHARDS + ' shards passed in ' + total + 's — every declared route mounts.');
