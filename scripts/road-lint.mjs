#!/usr/bin/env node
/**
 * `pnpm lint:roads`: the road-kit lint (docs/road-kit.md) over the assembled City, all boards,
 * both tiers, in a private headless Chrome. Runs window.__roadLint() (web/src/terrain/road-lint.ts)
 * and holds every count to web/src/core/road-kit-budget.json:
 *
 *   - a violation count (stacked tread, open edges, paint overlaps, …) fails above its ceiling;
 *   - a coverage floor (tread and elevated m²) fails more than 2% below it, so a renamed mesh or
 *     a changed tread colour cannot pass by measuring nothing;
 *   - fewer mounted areas than the budget names fails.
 *
 *   pnpm lint:roads [--url http://localhost:5173] [--q high,low] [--json out.json] [--write]
 *
 * Without --url it starts its own Vite dev server (the lint hook is dev-only). --write stores the
 * measured counts as the new budget; lower ceilings only, and say why in the PR. Needs Chrome and
 * the staged data (`pnpm data`). Not part of `pnpm test`: it takes several minutes.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './chrome-cdp.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'web');
const budgetPath = join(web, 'src/core/road-kit-budget.json');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const tiers = arg('q', 'high,low').split(',');
const jsonOut = arg('json', null);
const write = process.argv.includes('--write');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Coverage floors: these fall only when the lint stops seeing something. */
const FLOORS = ['treadM2', 'elevatedM2'];
/** Reported, not held: a parapet raises it, an abutment lowers it. */
const INFO = ['edgeM', 'walledM'];

let server = null, base = arg('url', null);
if (!base) {
  const port = 4900 + Math.floor(Math.random() * 200);
  // The vite binary itself, so kill() stops the server and not a wrapper; strictPort so we never
  // lint another worktree's server.
  server = spawn(join(web, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: web, stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`;
  let up = false, exited = false;
  server.on('exit', () => { exited = true; });
  for (let i = 0; i < 160 && !up && !exited; i++) { try { up = (await fetch(base)).ok; } catch { await sleep(250); } }
  if (!up) { server.kill(); console.error(`vite did not answer on :${port}`); process.exit(1); }
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = ev => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const ready = new Promise(r => ws.onopen = r);
  const send = async (method, params = {}) => {
    await ready;
    const n = ++id;
    ws.send(JSON.stringify({ id: n, method, params }));
    const msg = await new Promise(r => pending.set(n, r));
    if (msg.error) throw Error(method + ': ' + msg.error.message);
    return msg.result;
  };
  return { send, close: () => ws.close() };
}
async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}

const measured = {};
const browser = await launchChrome('road-lint-', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800']);
try {
  const cdp = connect(browser.wsUrl);
  await cdp.send('Runtime.enable');
  for (const q of tiers) {
    await cdp.send('Page.navigate', { url: `${base}/?view=city&q=${q}&t=2026-11-20T14:00:00-05:00` });
    const start = Date.now();
    for (;;) {
      await sleep(2000);
      const state = await evaluate(cdp, `({ ready: typeof window.__roadLint === 'function',
        loaded: window.__cityDev?.areas()?.size ?? 0, expected: window.__cityDev?.areaCount() ?? 0 })`).catch(() => ({ ready: false, loaded: 0, expected: 0 }));
      if (state.ready && state.expected > 0 && state.loaded === state.expected) break;
      // The default view leaves the northernmost row unloaded; the lint covers the whole board.
      if (state.expected > 0 && state.loaded === state.expected - 1)
        await evaluate(cdp, `[...document.querySelectorAll('#city-info button')].find(b => b.textContent.startsWith('Show full board'))?.click()`).catch(() => undefined);
      if (Date.now() - start > 900_000) throw Error(`${q}: ${state.loaded}/${state.expected} areas loaded`);
    }
    // Settled means two passes agree: a board still building (sliced builds) changes the counts.
    let last = null;
    for (let pass = 0; ; pass++) {
      const t0 = Date.now();
      const r = await evaluate(cdp, 'window.__roadLint()');
      r.ms = Date.now() - t0;
      r.areas = Object.keys(r.boards).length;
      if (last && JSON.stringify(last.boards) === JSON.stringify(r.boards)) { measured[q] = r; break; }
      if (pass >= 6) throw Error(`${q}: counts still changing after ${pass + 1} passes`);
      last = r;
      await sleep(5000);
    }
    console.log(`${q}: ${measured[q].areas} areas, ${measured[q].ms} ms per pass`);
  }
  cdp.close();
} finally {
  await browser.close();
  server?.kill();
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(measured, null, 1));

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
if (write) {
  for (const q of tiers) {
    budget[q] = { areas: measured[q].areas, boards: {} };
    for (const [id, counts] of Object.entries(measured[q].boards))
      budget[q].boards[id] = Object.fromEntries(Object.entries(counts).filter(([k]) => !INFO.includes(k)));
  }
  writeFileSync(budgetPath, JSON.stringify(budget, null, 1) + '\n');
  console.log(`wrote ${budgetPath}`);
}

let failed = false;
for (const q of tiers) {
  const b = budget[q], m = measured[q];
  if (!b) { console.error(`${q}: no budget; run with --write`); failed = true; continue; }
  if (m.areas < b.areas) { console.error(`${q}: only ${m.areas} of ${b.areas} areas measured`); failed = true; }
  const keys = Object.keys(Object.values(b.boards)[0] ?? {});
  const total = (src, k) => Object.values(src).reduce((n, c) => n + (c[k] ?? 0), 0);
  console.log(`\n${q.toUpperCase()}`.padEnd(22) + 'measured'.padStart(10) + 'budget'.padStart(10));
  for (const k of keys) {
    const got = total(m.boards, k), want = total(b.boards, k);
    console.log(`  ${k.padEnd(20)}${String(got).padStart(10)}${String(want).padStart(10)}${FLOORS.includes(k) ? '  floor' : got < want ? `  -${want - got} (lower the budget)` : ''}`);
  }
  for (const [id, ceil] of Object.entries(b.boards)) {
    const got = m.boards[id];
    if (!got) { console.error(`  ${q} ${id}: board not measured`); failed = true; continue; }
    for (const [k, v] of Object.entries(ceil)) {
      const over = FLOORS.includes(k) ? got[k] < v * 0.98 : got[k] > v;
      if (over) { console.error(`  ${q} ${id} ${k}: ${got[k]} ${FLOORS.includes(k) ? 'below floor' : 'over budget'} ${v}`); failed = true; }
    }
  }
}
console.log(`\nlint:roads ${failed ? 'FAILED' : 'passed'}`);
process.exit(failed ? 1 : 0);
