#!/usr/bin/env node
/**
 * Trace one ?perf=run URL in a HEADED Chrome (the real GPU, as a visitor sees it) and explain its long
 * frames: for every main-thread task over --long ms (default 100), the biggest events inside it, any
 * ring swaps marked within 250 ms before it, and the GPU-process work that overlapped it.
 *   node scripts/perf-trace.mjs [--out dir] [--long 100] [--desktop] [--headless] URL
 * Writes trace.json (open in chrome://tracing or Perfetto) and long-frames.md.
 * Example: node scripts/perf-trace.mjs --desktop --out /tmp/trace-wide \
 *   'http://127.0.0.1:4173/?view=city&q=high&t=2026-11-20T14:00:00-05:00&perf=run&motion=route:wide&stream=1'
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const out = resolve(opt('--out', join(tmpdir(), `perf-trace-${Date.now()}`)));
const longMs = Number(opt('--long', 100));
const desktop = args.includes('--desktop');
const headless = args.includes('--headless');
const url = args.filter((a, i) => !a.startsWith('--') && !['--out', '--long'].includes(args[i - 1])).pop();
if (!url) { console.error('usage: perf-trace.mjs [--out dir] [--long ms] [--desktop] [--headless] URL'); process.exit(2); }
mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9500 + Math.floor(Math.random() * 90);
const profile = mkdtempSync(join(tmpdir(), 'trace-chrome-'));
const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--enable-precise-memory-info', ...(headless ? ['--headless=new'] : []), desktop ? '--window-size=1440,900' : '--window-size=420,920', 'about:blank'], { stdio: 'ignore' });
try {
  let wsUrl;
  for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch { await sleep(200); } }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const events = [];
  let traceDone;
  const traceComplete = new Promise(r => { traceDone = r; });
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Tracing.dataCollected') events.push(...m.params.value);
    if (m.method === 'Tracing.tracingComplete') traceDone();
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  await send('Runtime.enable');
  if (!desktop) await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
  await send('Page.navigate', { url });
  // Trace only the sample: wait for perf.ts to start it, so boot's load doesn't flood the buffer.
  for (let i = 0; i < 600; i++) { await sleep(250); try { if (await evaluate('document.title') === 'PERF_SAMPLING') break; } catch { /* loading */ } }
  await send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame',
      'blink.user_timing', 'v8.execute', 'v8', 'gpu', 'disabled-by-default-gpu.service', 'disabled-by-default-gpu.decoder', 'toplevel', 'viz'] },
  });
  for (let i = 0; i < 160; i++) { await sleep(250); try { if (await evaluate('document.title') === 'PERF_DONE') break; } catch { /* busy */ } }
  await send('Tracing.end');
  await traceComplete;
  const summary = await evaluate('JSON.stringify(JSON.parse(localStorage.getItem("perf-result") || "null")?.summary ?? null)');
  ws.close();
  writeFileSync(join(out, 'trace.json'), JSON.stringify({ traceEvents: events }));
  const md = explain(events, longMs, summary);
  writeFileSync(join(out, 'long-frames.md'), md);
  console.log(md + `\n\nTrace: ${join(out, 'trace.json')}`);
} finally {
  const exited = new Promise(r => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([exited, sleep(5000)]);
  rmSync(profile, { recursive: true, force: true });
}

function explain(evts, longMs, summary) {
  // The renderer main thread: the thread that ran the most FunctionCall time.
  const fc = new Map();
  for (const e of evts) if (e.name === 'FunctionCall' && e.ph === 'X') fc.set(`${e.pid}:${e.tid}`, (fc.get(`${e.pid}:${e.tid}`) ?? 0) + e.dur);
  const main = [...fc].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!main) return 'No main-thread FunctionCall events in the trace.';
  const onMain = e => `${e.pid}:${e.tid}` === main;
  const tasks = evts.filter(e => onMain(e) && e.ph === 'X' && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && e.dur > longMs * 1000)
    .sort((a, b) => a.ts - b.ts);
  const marks = evts.filter(e => e.cat?.includes('blink.user_timing') && e.name.startsWith('ring:'));
  const gpu = evts.filter(e => !onMain(e) && e.ph === 'X' && e.dur > 2000 && /gpu|GL|Decoder|Program|Shader|Texture|Buffer|ANGLE|Metal/i.test(`${e.cat} ${e.name}`));
  const t0 = Math.min(...evts.filter(e => e.ts).map(e => e.ts));
  const lines = [`Long main-thread tasks (> ${longMs} ms) during the sample: ${tasks.length}.`];
  if (summary) { const s = JSON.parse(summary); if (s) lines.push(`Run summary: fps ${s.fps}, p95 ${s.p95} ms, worst ${s.max} ms, frames >33 ${s.over33}, >50 ${s.over50}.`); }
  for (const t of tasks) {
    const inside = evts.filter(e => onMain(e) && e.ph === 'X' && e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e.dur > 3000);
    const byName = new Map();
    for (const e of inside) byName.set(e.name, (byName.get(e.name) ?? 0) + e.dur);
    const top = [...byName].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, d]) => `${n} ${(d / 1000).toFixed(0)} ms`);
    const near = marks.filter(m => m.ts <= t.ts + t.dur && m.ts >= t.ts - 250000).map(m => m.name);
    const g = new Map();
    for (const e of gpu) if (e.ts < t.ts + t.dur && e.ts + e.dur > t.ts) g.set(e.name, (g.get(e.name) ?? 0) + e.dur);
    const gtop = [...g].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, d]) => `${n} ${(d / 1000).toFixed(0)} ms`);
    lines.push('', `- t=${((t.ts - t0) / 1e6).toFixed(2)} s, ${(t.dur / 1000).toFixed(0)} ms`, `  main: ${top.join(', ') || '(no child events)'}`,
      `  ring swaps within 250 ms before: ${near.length ? near.join(', ') : 'none'}`, `  GPU process overlap: ${gtop.join(', ') || 'none over 2 ms'}`);
  }
  return lines.join('\n');
}
