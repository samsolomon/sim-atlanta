#!/usr/bin/env node
// Headless ground-contact audit of the full City board at both terrain tiers.
//
//   pnpm dev &   # any running dev server
//   pnpm audit:ground [--url http://localhost:5173] [--out audit.json] [--q high,low] [--step 0.5]
//
// Drives the system Chrome over the DevTools protocol (no extra dependency), waits
// for every board to mount, and runs window.__groundAudit() (web/src/terrain/ground-audit.ts).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg('url', 'http://localhost:5173');
const out = arg('out', null);
const tiers = arg('q', 'high,low').split(',');
const step = Number(arg('step', '0.5'));
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const profile = mkdtempSync(join(tmpdir(), 'ground-audit-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw Error('Chrome did not start');
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
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

const report = {};
const ground = l => !/^(landmark|building) ·|^unnamed/.test(l);
const cm = d => (d * 100).toFixed(0).padStart(4) + ' cm';
function print(q, r) {
  const sum = (rows, key) => rows.reduce((a, l) => a + l[key], 0);
  const byLayer = new Map();
  for (const l of r.layers) {
    const k = l.layer.split(':')[0];
    const g = byLayer.get(k) ?? { layer: k, samples: 0, penetrating: 0, sites: 0, hist: [0, 0, 0, 0], worst: 0 };
    g.samples += l.samples; g.penetrating += l.penetrating; g.sites += l.sites;
    l.histogram.forEach((n, i) => g.hist[i] += n);
    g.worst = Math.max(g.worst, l.worst?.depth ?? 0);
    byLayer.set(k, g);
  }
  console.log(`\n== ${q} tier (${r.ms} ms, step ${step} m)`);
  console.log('layer'.padEnd(44) + 'samples'.padStart(10) + 'penetr.'.padStart(9) + 'sites'.padStart(7) + '   3-10cm 10-30 30-100 >1m'.padEnd(28) + 'worst');
  for (const g of [...byLayer.values()].sort((a, b) => Number(ground(b.layer)) - Number(ground(a.layer)) || b.penetrating - a.penetrating)) {
    if (!ground(g.layer) && g.penetrating < 500) continue;
    console.log(g.layer.slice(0, 43).padEnd(44) + String(g.samples).padStart(10) + String(g.penetrating).padStart(9) + String(g.sites).padStart(7)
      + '   ' + g.hist.map(n => String(n).padStart(6)).join('') + '  ' + cm(g.worst));
  }
  console.log('\nground layers by sublayer and board:');
  for (const l of r.layers.filter(l => ground(l.layer) && l.penetrating))
    console.log('  ' + l.board.padEnd(18) + l.layer.padEnd(34) + String(l.penetrating).padStart(8) + String(l.sites).padStart(6) + ' sites  worst' + cm(l.worst.depth));
  console.log('\nz-fight risk (samples within ±3 cm of terrain, no polygonOffset):');
  for (const l of r.layers.filter(l => l.coplanar > 50).sort((a, b) => b.coplanar - a.coplanar).slice(0, 15))
    console.log('  ' + l.board.padEnd(18) + l.layer.slice(0, 40).padEnd(42) + String(l.coplanar).padStart(8) + ' of ' + l.samples);
  console.log('\nboards (ground layers only):');
  const boards = [...new Set(r.layers.map(l => l.board))];
  for (const b of boards) {
    const rows = r.layers.filter(l => l.board === b && ground(l.layer));
    const w = Math.max(0, ...rows.map(l => l.worst?.depth ?? 0));
    console.log('  ' + b.padEnd(18) + String(sum(rows, 'penetrating')).padStart(8) + ' samples' + String(sum(rows, 'sites')).padStart(6) + ' sites  worst' + cm(w));
  }
  console.log('\nworst 10 ground-layer sites:');
  for (const h of r.worst.filter(h => ground(h.layer)).slice(0, 10))
    console.log(`  ${cm(h.depth)}  ${h.board.padEnd(17)} ${h.layer.padEnd(30)} /?view=city&q=${q}&cam=${h.x.toFixed(0)},${h.z.toFixed(0)},30,55,40`);
}
try {
  const cdp = connect(await target());
  await cdp.send('Runtime.enable');
  // Fail fast when no dev server answers, instead of polling for ten minutes.
  try { await fetch(base, { signal: AbortSignal.timeout(5000) }); } catch { throw Error(`No dev server at ${base}; pass --url`); }
  for (const q of tiers) {
    await cdp.send('Page.navigate', { url: `${base}/?view=city&q=${q}&t=2026-11-20T14:00:00-05:00` });
    const start = Date.now();
    // Use the same board extent as City, including future rows.
    for (;;) {
      await sleep(2000);
      const state = await evaluate(cdp, `({
        auditReady: typeof window.__groundAudit === 'function',
        loaded: window.__cityDev?.areas()?.size ?? 0,
        expected: window.__cityDev?.areaCount() ?? 0
      })`).catch(() => ({ auditReady: false, loaded: 0, expected: 0 }));
      if (state.auditReady && state.expected > 0 && state.loaded === state.expected) break;
      if (Date.now() - start > 600_000)
        throw Error(`${q}: ${state.loaded}/${state.expected} areas loaded, audit ready: ${state.auditReady}`);
    }
    const t0 = Date.now();
    report[q] = await evaluate(cdp, `window.__groundAudit({ step: ${step} })`);
    report[q].ms = Date.now() - t0;
    print(q, report[q]);
  }
  cdp.close();
} finally {
  proc.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
if (out) writeFileSync(out, JSON.stringify(report, null, 1));
