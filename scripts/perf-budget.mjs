#!/usr/bin/env node
/**
 * `pnpm test:perf`: build web/, serve it, open City at each tier in headless Chrome
 * (scripts/perf-run.mjs) and check the result against web/src/core/perf-budget.json.
 * Fails on any ceiling; prints how far each figure is from its target, and flags figures inside
 * an entry's `reserve` (above ceiling − reserve), which fail review, not this check. Needs Chrome and the
 * staged data (`pnpm data`). Pass --no-build to reuse web/dist.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'web');
const budget = JSON.parse(readFileSync(join(web, 'src/core/perf-budget.json'), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'perf-budget-'));
const outDir = join(tmp, 'dist');
const noBuild = process.argv.includes('--no-build');
const dist = noBuild ? join(web, 'dist') : outDir;

if (!noBuild) {
  const b = spawnSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { cwd: web, stdio: 'inherit' });
  if (b.status !== 0) { rmSync(tmp, { recursive: true, force: true }); process.exit(b.status ?? 1); }
}
const port = 4700 + Math.floor(Math.random() * 200);
// The vite binary itself, not npx, so kill() stops the server and not just a wrapper.
const server = spawn(join(web, 'node_modules/.bin/vite'), ['preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: web, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// --strictPort makes vite exit if the port is taken; never measure another worktree's server.
let exited = false;
server.on('exit', () => { exited = true; });
let up = false;
for (let i = 0; i < 120 && !up && !exited; i++) { try { up = (await fetch(`http://127.0.0.1:${port}/`)).ok; } catch { await sleep(250); } }
if (!up || exited) { server.kill(); rmSync(tmp, { recursive: true, force: true }); console.error(`vite preview did not answer on :${port}`); process.exit(1); }

let failed = false;
let retries = 0;
const inReserve = [];
try {
  for (const [tier, b] of Object.entries(budget).filter(([k]) => !k.startsWith('_'))) {
    const json = join(tmp, `${tier}.json`);
    // An entry may name its tier and clock (high-night is the high tier at 22:00).
    // An entry may also name a camera motion and a CPU throttle (the moving long-task checks).
    // PERF_QUERY appends A/B switches to every run (e.g. PERF_QUERY='&placeholder=off'), for a
    // same-build A/B; such a run is a measurement, not the budget check.
    const url = `http://127.0.0.1:${port}/?view=city&q=${b.tier ?? tier}&t=2026-11-20T${b.time ?? '14:00:00'}-05:00&perf=run${b.motion ? `&motion=${b.motion}` : ''}${process.env.PERF_QUERY ?? ''}`;
    // One retry on a run that failed or was invalid (another agent's load can stall a headless GPU),
    // with the reason printed either way; a second failure fails the check.
    let s = null;
    for (let attempt = 1; attempt <= 2 && !s; attempt++) {
      const r = spawnSync('node', [join(root, 'scripts/perf-run.mjs'), ...(b.viewport === 'desktop' ? ['--desktop'] : b.viewport === 'a16' ? ['--viewport', '384x692@1'] : []), ...(b.cpu ? ['--cpu', String(b.cpu)] : []), url],
        { env: { ...process.env, PERF_JSON: json }, stdio: 'inherit' });
      let res = null;
      try { res = JSON.parse(readFileSync(json, 'utf8'))[0]; } catch { /* no result file */ }
      const why = r.status !== 0 ? `perf-run exited ${r.status ?? r.signal}${res?.error ? ': ' + res.error : ''}` : !res?.summary ? 'no result' : null;
      // Only an invalid run retries (perf-run failed: nonce mismatch, nothing drawn, timeout, not
      // settled; or no result). A valid run over a ceiling is judged below and fails at once.
      if (why) { console.error(`${tier}: retry: ${why}${attempt === 2 ? ' (second failure: giving up)' : ''}`); if (attempt === 1) retries++; }
      else s = res.summary;
    }
    if (!s) { failed = true; continue; }
    // A partial board comes in under every ceiling, so it must fail rather than pass quietly.
    // An entry whose route mounts R16 needs all 13, with R16 built inside the sample.
    const areas = b.areas ?? 12;
    if (s.areas < areas) { console.error(`${tier}: only ${s.areas} of ${areas} areas mounted; check the staged data`); failed = true; continue; }
    if (b.r16InSample && s.r16BuiltInSample !== true) { console.error(`${tier}: R16 did not finish mounting inside the sample, so its long tasks were not measured`); failed = true; continue; }
    console.log(`\n${tier.toUpperCase()}            measured     ceiling      target`);
    const keys = [...new Set([...Object.keys(b.ceiling), ...Object.keys(b.target).filter(k => k in s)])];
    for (const k of keys) {
      const ceil = b.ceiling[k] ?? null;
      const v = s[k];
      const over = ceil !== null && (typeof v !== 'number' || v > ceil);
      if (over) failed = true;
      const tgt = b.target[k];
      const reserve = b.reserve?.[k];
      const reserved = !over && ceil !== null && typeof reserve === 'number' && v > ceil - reserve;
      if (reserved) inReserve.push(`${tier} ${k} ${v} (ceiling ${ceil}, reserve ${reserve}: room ends at ${ceil - reserve})`);
      console.log(`  ${k.padEnd(14)} ${String(v).padStart(10)} ${String(ceil ?? '-').padStart(11)} ${String(tgt ?? '').padStart(11)}  ${over ? 'OVER CEILING' : reserved ? 'IN RESERVE' : typeof tgt === 'number' && v > tgt ? `${Math.round((v / tgt - 1) * 100)}% over target` : 'at target'}`);
    }
  }
  // Late compiles: a quick clock and weather sweep per tier after ready (scripts/program-sweep.mjs).
  const allow = budget._lateCompiles?.allow ?? [];
  for (const tier of ['low', 'high']) {
    const json = join(tmp, `sweep-${tier}.json`);
    const r = spawnSync('node', [join(root, 'scripts/program-sweep.mjs'), '--url', `http://127.0.0.1:${port}`, '--q', tier, '--quick', '--json', json], { stdio: ['ignore', 'ignore', 'inherit'] });
    if (r.status !== 0) { console.error(`${tier} sweep: failed to run (program-sweep exited ${r.status ?? r.signal}; its error is above)`); failed = true; continue; }
    const sweep = JSON.parse(readFileSync(json, 'utf8'));
    const late = sweep.rows.flatMap(row => row.newPrograms.map(p => ({ step: row.label, text: `${p.owners.map(o => `${o.path} ${o.type}`).join('; ')} ${p.key}`, owners: p.owners })));
    const unexplained = late.filter(p => !allow.some(a => p.text.includes(a.match)));
    console.log(`\n${tier.toUpperCase()} SWEEP     ${sweep.atReady} programs at ready, ${sweep.max} max; ${late.length} compiled after ready (${late.length - unexplained.length} known), worst step frame ${sweep.worstStepFrameMs} ms`);
    for (const p of unexplained) console.log(`  LATE COMPILE at ${p.step}: ${p.owners.map(o => o.path || o.type).join('; ') || 'no owner found'}`);
    if (unexplained.length) failed = true;
  }
} finally {
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
if (inReserve.length) {
  console.log(`\nInside the reserve (docs/review-charter.md, Budget reserves): a PR that adds to these must offset it in the same PR.`);
  for (const line of inReserve) console.log(`  ${line}`);
}
console.log(`\ntest:perf ${failed ? 'FAILED' : 'passed'}; ${retries} retr${retries === 1 ? 'y' : 'ies'}.`);
if (failed) console.error('test:perf FAILED: see the reasons above (OVER CEILING, LATE COMPILE, or a run that failed twice).');
process.exit(failed ? 1 : 0);
