#!/usr/bin/env node
/**
 * `pnpm test:perf`: build web/, serve it, open City at each tier in headless Chrome
 * (scripts/perf-run.mjs) and check the result against web/src/core/perf-budget.json.
 * Fails on any ceiling; prints how far each figure is from its target. Needs Chrome and the
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
try {
  for (const [tier, b] of Object.entries(budget).filter(([k]) => !k.startsWith('_'))) {
    const json = join(tmp, `${tier}.json`);
    // An entry may name its tier and clock (high-night is the high tier at 22:00).
    const url = `http://127.0.0.1:${port}/?view=city&q=${b.tier ?? tier}&t=2026-11-20T${b.time ?? '14:00:00'}-05:00&perf=run`;
    const r = spawnSync('node', [join(root, 'scripts/perf-run.mjs'), ...(b.viewport === 'desktop' ? ['--desktop'] : []), url],
      { env: { ...process.env, PERF_JSON: json }, stdio: 'inherit' });
    if (r.status !== 0) { failed = true; continue; }
    const s = JSON.parse(readFileSync(json, 'utf8'))[0]?.summary;
    if (!s) { console.error(`${tier}: no result`); failed = true; continue; }
    // A partial board comes in under every ceiling, so it must fail rather than pass quietly.
    if (s.areas < 12) { console.error(`${tier}: only ${s.areas} of 12 areas mounted; check the staged data`); failed = true; continue; }
    console.log(`\n${tier.toUpperCase()}            measured     ceiling      target`);
    const keys = [...new Set([...Object.keys(b.ceiling), ...Object.keys(b.target).filter(k => k in s)])];
    for (const k of keys) {
      const ceil = b.ceiling[k] ?? null;
      const v = s[k];
      const over = ceil !== null && (typeof v !== 'number' || v > ceil);
      if (over) failed = true;
      const tgt = b.target[k];
      console.log(`  ${k.padEnd(14)} ${String(v).padStart(10)} ${String(ceil ?? '-').padStart(11)} ${String(tgt ?? '').padStart(11)}  ${over ? 'OVER CEILING' : typeof tgt === 'number' && v > tgt ? `${Math.round((v / tgt - 1) * 100)}% over target` : 'at target'}`);
    }
  }
} finally {
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
