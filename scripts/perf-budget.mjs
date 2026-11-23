#!/usr/bin/env node
/**
 * `pnpm test:perf`: build web/, serve it, open City at each tier in headless Chrome
 * (scripts/perf-run.mjs) and check the result against web/src/core/perf-budget.json.
 * Fails on any ceiling; prints how far each figure is from its target. Needs Chrome and the
 * staged data (`pnpm data`). Pass --no-build to reuse web/dist.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
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
  if (b.status !== 0) process.exit(b.status ?? 1);
}
const port = 4700 + Math.floor(Math.random() * 200);
const server = spawn('npx', ['vite', 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: web, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await sleep(250); } }

let failed = false;
try {
  for (const [tier, b] of Object.entries(budget).filter(([k]) => !k.startsWith('_'))) {
    const json = join(tmp, `${tier}.json`);
    const url = `http://127.0.0.1:${port}/?view=city&q=${tier}&t=2026-11-20T14:00:00-05:00&perf=run`;
    const r = spawnSync('node', [join(root, 'scripts/perf-run.mjs'), ...(b.viewport === 'desktop' ? ['--desktop'] : []), url],
      { env: { ...process.env, PERF_JSON: json }, stdio: 'inherit' });
    if (r.status !== 0) { failed = true; continue; }
    const s = JSON.parse(readFileSync(json, 'utf8'))[0]?.summary;
    if (!s) { console.error(`${tier}: no result`); failed = true; continue; }
    if (s.areas < 12) console.warn(`${tier}: only ${s.areas} areas mounted; figures are partial`);
    console.log(`\n${tier.toUpperCase()}            measured     ceiling      target`);
    for (const [k, ceil] of Object.entries(b.ceiling)) {
      const v = s[k];
      const over = typeof v !== 'number' || v > ceil;
      if (over) failed = true;
      const tgt = b.target[k];
      console.log(`  ${k.padEnd(14)} ${String(v).padStart(10)} ${String(ceil).padStart(11)} ${String(tgt ?? '').padStart(11)}  ${over ? 'OVER CEILING' : typeof tgt === 'number' && v > tgt ? `${Math.round((v / tgt - 1) * 100)}% over target` : 'at target'}`);
    }
  }
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
