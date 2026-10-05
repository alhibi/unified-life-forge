#!/usr/bin/env node
/**
 * Route smoke runner — shards `src/test/routes.smoke.test.tsx` across separate
 * Vitest processes.
 *
 * Why this exists instead of just `vitest run routes.smoke.test.tsx`
 *
 *   Mounting all 82 routes in one jsdom process wedges permanently. The first
 *   full run sat at route 34 of 83 for over fifteen minutes without advancing
 *   and without Vitest's own 30s per-test timeout ever firing. Stubbing the
 *   network did not help, and any individual route — including the one it
 *   stopped on, `/german-club/grammar` — passes in about five seconds when run
 *   alone.
 *
 *   So the failure is cumulative, not per-route. `cleanup()` unmounts the React
 *   tree, but the stores are module-level singletons: the intervals, polling
 *   loops and subscriptions they register on first import are never torn down,
 *   because nothing ever imagined a process mounting the whole app 80 times.
 *   After roughly three dozen mounts, enough of those are running concurrently
 *   to starve the event loop, at which point the timeout timer itself cannot
 *   be serviced.
 *
 *   That accumulation is a genuine finding about the app's teardown story and
 *   it is tracked as such. It is not something to fix underneath a safety net
 *   that does not exist yet — the net has to come first, which means working
 *   within the constraint instead of waiting on it.
 *
 *   Each shard is therefore a fresh process with a fresh module registry, so
 *   leaked timers die with it. Shards are small enough to stay well under the
 *   threshold.
 *
 * Usage
 *   node scripts/smoke-routes.mjs            all shards, sequentially
 *   node scripts/smoke-routes.mjs --shards 8 coarser split (faster, riskier)
 *   SMOKE_SHARD=3/12 bun run test:smoke      one shard, for debugging
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const args = process.argv.slice(2);
const shardsArgIndex = args.indexOf('--shards');
const SHARDS = shardsArgIndex !== -1 ? Number(args[shardsArgIndex + 1]) : 12;

if (!Number.isInteger(SHARDS) || SHARDS < 1) {
  console.error(`Invalid --shards "${args[shardsArgIndex + 1]}"`);
  process.exit(1);
}

// Honour an externally pinned shard so CI can fan out across runners and a
// developer can re-run just the slice that failed.
if (process.env.SMOKE_SHARD) {
  const { status } = spawnSync(
    'npx',
    ['vitest', 'run', 'src/test/routes.smoke.test.tsx', '--reporter=dot'],
    { stdio: 'inherit', env: process.env },
  );
  process.exit(status ?? 1);
}

console.log(`Route smoke: ${SHARDS} shards, one process each.\n`);

const failed = [];
const startedAt = Date.now();

for (let i = 1; i <= SHARDS; i += 1) {
  const label = `shard ${i}/${SHARDS}`;
  process.stdout.write(`▸ ${label} … `);
  const shardStart = Date.now();

  const { status } = spawnSync(
    'npx',
    ['vitest', 'run', 'src/test/routes.smoke.test.tsx', '--reporter=dot'],
    {
      // Captured, not inherited: each shard emits a few thousand lines of
      // jsdom and React `act()` warnings that would bury the actual result.
      // Output is replayed in full only for shards that fail.
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: { ...process.env, SMOKE_SHARD: `${i}/${SHARDS}` },
      // A shard that wedges should fail the run, not hang CI forever. This is
      // the backstop that Vitest's own timeout could not provide.
      timeout: 5 * 60 * 1000,
    },
  );

  const seconds = ((Date.now() - shardStart) / 1000).toFixed(1);

  if (status === 0) {
    console.log(`ok (${seconds}s)`);
  } else {
    console.log(`FAILED (${seconds}s, exit ${status})`);
    failed.push(i);
  }
}

const total = ((Date.now() - startedAt) / 1000).toFixed(1);

if (failed.length > 0) {
  console.error(`\n✗ ${failed.length}/${SHARDS} shard(s) failed: ${failed.join(', ')}`);
  console.error(`Re-run one with:  SMOKE_SHARD=${failed[0]}/${SHARDS} bun run test:smoke`);
  process.exit(1);
}

console.log(`\n✓ all ${SHARDS} shards passed in ${total}s — every declared route mounts.`);
