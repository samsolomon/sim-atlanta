#!/usr/bin/env node
/**
 * Find what a streamed area leaves behind: fly ?stream=1 City between Five Points and Brookwood,
 * take a heap snapshot at Five Points after cycle A and after cycle B, and list the constructors whose
 * live count and retained self size grew. Needs a server already serving the build.
 *   node scripts/heap-diff.mjs --url http://127.0.0.1:PORT [--a 2] [--b 5] [--q low] [--out dir]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { activePort } from './chrome-cdp.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const base = opt('--url', null);
const A = Number(opt('--a', 2)), B = Number(opt('--b', 5));
const q = opt('--q', 'low');
const out = opt('--out', null);
if (!base) { console.error('usage: heap-diff.mjs --url http://127.0.0.1:PORT [--a 2] [--b 5]'); process.exit(2); }
if (out) mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'heapdiff-chrome-'));
const chrome = spawn(CHROME, ['--remote-debugging-port=0', `--user-data-dir=${profile}`, '--headless=new', '--no-first-run',
  '--enable-precise-memory-info', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
try {
  let wsUrl;
  for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${await activePort(profile)}/json`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch { await sleep(200); } }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  let chunks = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'HeapProfiler.addHeapSnapshotChunk') chunks.push(m.params.chunk);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  await send('Runtime.enable');
  await send('HeapProfiler.enable');
  if (q === 'low') await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
  else await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: `${base}/?view=city&q=${q}&t=2026-11-20T14:00:00-05:00&perf=1&stream=1` });
  for (let i = 0; i < 240; i++) { await sleep(500); try { if (await evaluate('__perf.phases.some(p => p.name === "ready")')) break; } catch { /* loading */ } }
  const settle = async () => {
    let quiet = 0, last = -1;
    for (let i = 0; i < 240 && quiet < 6; i++) {
      await sleep(500);
      const s = await evaluate('({ p: __perf.streamPending(), t: __perf.ringSummary().transitions })');
      quiet = s.p === 0 && s.t === last ? quiet + 1 : 0;
      last = s.t;
    }
  };
  const snapshot = async () => {
    await send('HeapProfiler.collectGarbage');
    chunks = [];
    await send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    return summarize(JSON.parse(chunks.join('')));
  };
  const snaps = {};
  for (let c = 1; c <= B; c++) {
    await evaluate('__stream.setCamera(400, -5300, 700)'); await settle();
    await evaluate('__stream.setCamera(400, -650, 700)'); await settle();
    if (c === A || c === B) { snaps[c] = await snapshot(); console.log(`cycle ${c}: ${(snaps[c].total / 1048576).toFixed(1)} MB self size in ${snaps[c].nodes} nodes`); }
  }
  ws.close();
  const a = snaps[A].by, b = snaps[B].by;
  const rows = [...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => ({
    name: k, dCount: (b[k]?.count ?? 0) - (a[k]?.count ?? 0), dKB: Math.round(((b[k]?.size ?? 0) - (a[k]?.size ?? 0)) / 1024), countB: b[k]?.count ?? 0,
  })).filter(r => r.dKB > 16 || r.dCount > 200).sort((x, y) => y.dKB - x.dKB);
  const lines = [`Heap growth, Five Points after cycle ${A} -> after cycle ${B} (${q}, ?stream=1): ${((snaps[B].total - snaps[A].total) / 1048576).toFixed(1)} MB`,
    '| Constructor | +count | +KB | count after |', '| --- | ---: | ---: | ---: |', ...rows.slice(0, 40).map(r => `| ${r.name} | ${r.dCount} | ${r.dKB} | ${r.countB} |`)];
  console.log(lines.join('\n'));
  if (out) writeFileSync(join(out, 'heap-diff.md'), lines.join('\n'));
} finally {
  const exited = new Promise(r => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([exited, sleep(5000)]);
  rmSync(profile, { recursive: true, force: true });
}

/** Count and self size per constructor (node name for objects, type for the rest). */
function summarize(snap) {
  const f = snap.snapshot.meta.node_fields, types = snap.snapshot.meta.node_types[0];
  const iType = f.indexOf('type'), iName = f.indexOf('name'), iSize = f.indexOf('self_size'), w = f.length;
  const by = {};
  let total = 0;
  for (let i = 0; i < snap.nodes.length; i += w) {
    const type = types[snap.nodes[i + iType]];
    const key = type === 'object' || type === 'closure' ? `${snap.strings[snap.nodes[i + iName]]}${type === 'closure' ? '()' : ''}` : `(${type})`;
    const s = snap.nodes[i + iSize];
    (by[key] ??= { count: 0, size: 0 }).count++;
    by[key].size += s;
    total += s;
  }
  return { by, total, nodes: snap.nodes.length / w };
}
