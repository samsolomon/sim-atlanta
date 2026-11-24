#!/usr/bin/env node
/**
 * Run City `?perf=run` URLs in headless Chrome at a phone viewport and print each PERF_RESULT.
 *   node scripts/perf-run.mjs [--out dir] [--desktop] URL...
 * Chrome is driven over CDP (Node 22+ global WebSocket). The Studio's GPU is not a phone's: use
 * this for scene counts and memory, and the A16 runs (docs/perf.md) for fps.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome } from './chrome-cdp.mjs';

const args = process.argv.slice(2);
let out = null;
let desktop = false;
let extra = null;
let netMbps = 0;
let cpu = 1;
let viewport = null;
const png = args.includes('--png');
// --silent: sample with ?perf=silent (no overlay on screen) instead of ?perf=run.
const silentRun = args.includes('--silent');
const urls = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') out = args[++i];
  else if (args[i] === '--desktop') desktop = true;
  else if (args[i] === '--eval') extra = args[++i];
  else if (args[i] === '--net') netMbps = Number(args[++i]) || 0;
  else if (args[i] === '--cpu') cpu = Number(args[++i]) || 1;
  // --viewport 384x692@1: the A16's portrait canvas as measured on the device (CSS px at DPR 1).
  else if (args[i] === '--viewport') { const m = /^(\d+)x(\d+)@([\d.]+)$/.exec(args[++i]); if (m) viewport = { width: +m[1], height: +m[2], deviceScaleFactor: +m[3] }; }
  else if (args[i] === '--png') { /* read above */ }
  else if (args[i] === '--silent') { /* read above */ }
  else urls.push(args[i]);
}
if (!urls.length) { console.error('usage: perf-run.mjs [--out dir] [--desktop] URL...'); process.exit(2); }
if (out) mkdirSync(out, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function session() {
const browser = await launchChrome('perf-chrome-', ['--headless=new', '--enable-precise-memory-info', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);

const ws = new WebSocket(browser.wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    if (/^PERF_|error/i.test(text)) logs.push(text);
  }
  if (msg.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description ?? ''));
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, m => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

await send('Runtime.enable');
await send('Page.enable');
// --net 2.5 caps downloads at 2.5 Mbps with 100 ms latency, about the A16 over the test proxy.
if (netMbps > 0) {
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: netMbps * 125000, uploadThroughput: netMbps * 62500 });
}
// --cpu 6 slows the page's CPU about 6x, a rough stand-in for the A16 when reading load phases.
if (cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu });
// Galaxy A16: 1080x2340 at DPR 2.625 = 411x891 CSS px.
if (desktop) await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
else {
  await send('Emulation.setDeviceMetricsOverride', { ...(viewport ?? { width: 411, height: 891, deviceScaleFactor: 2.625 }), mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}

  return { send, evaluate, logs, async close() {
    try { ws.close(); } catch { /* closed */ }
    await browser.close();
  } };
}

const results = [];
for (const [n, requested] of urls.entries()) {
  // A per-run nonce in the URL, checked in the result: a reading can only come from this run's page.
  const nonce = Math.random().toString(36).slice(2, 10);
  const url = (silentRun ? requested.replace('perf=run', 'perf=silent') : requested) + (requested.includes('?') ? '&' : '?') + 'perfnonce=' + nonce;
  // A fresh browser per URL, so one run's heap and shader cache never leak into the next.
  const { send, evaluate, logs, close } = await session();
  try {
    await send('Page.navigate', { url });
    const t0 = Date.now();
    let done = false;
    while (Date.now() - t0 < 240000) {
      await sleep(1000);
      try { if (await evaluate('document.title') === 'PERF_DONE') { done = true; break; } } catch { /* navigating */ }
    }
    let result = done ? await evaluate('JSON.parse(localStorage.getItem("perf-result"))') : { url, error: 'timeout', logs: [...logs] };
    // perf.ts sets PERF_DONE even when storage refuses the result; fall back to its console line.
    if (done && !result) {
      const line = logs.find(l => l.startsWith('PERF_RESULT '));
      result = line ? JSON.parse(line.slice('PERF_RESULT '.length)) : { url, error: 'no stored result', logs: [...logs] };
    }
    if (done && result.summary) {
      // performance.memory swings with GC timing; a forced collection gives a stable heap figure.
      await send('HeapProfiler.enable');
      await send('HeapProfiler.collectGarbage');
      result.summary.heapAfterGcMB = await evaluate('Math.round(performance.memory.usedJSHeapSize / 1048576)');
    }
    if (done && extra && !result.error) result.eval = await evaluate(extra);
    results.push(result);
    if (out) {
      // --png: lossless, for matched-frame diffs (JPEG noise would swamp small differences).
      const shot = await send('Page.captureScreenshot', png ? { format: 'png' } : { format: 'jpeg', quality: 70 });
      writeFileSync(join(out, `cam${n + 1}.${png ? 'png' : 'jpg'}`), Buffer.from(shot.data, 'base64'));
    }
    const r = result;
    // An impossible reading is an invalid run, never a pass: a page that isn't ours, or a frame that
    // drew nothing (a scene that didn't render, or a GPU that dropped the context under load).
    if (!r.error && !String(r.url ?? '').includes('perfnonce=' + nonce)) r.error = `invalid: result came from another page (${r.url})`;
    else if (!r.error && r.summary && !(r.summary.calls > 0 && r.summary.triangles > 0 && r.summary.programs > 0)) r.error = `invalid: calls ${r.summary.calls}, triangles ${r.summary.triangles}, programs ${r.summary.programs}`;
    else if (!r.error && r.summary?.settled === false) r.error = 'invalid: not settled (load phases still landing when sampling began)';
    if (r.error) console.log(`#${n + 1} ${r.error.startsWith('invalid') ? r.error.toUpperCase() : 'TIMEOUT'} ${url}\n  ${logs.slice(-5).join('\n  ')}`);
    else console.log(`#${n + 1} ${r.fps10s.fps} fps p50 ${r.fps10s.p50} p95 ${r.fps10s.p95} | cpu upd ${r.fps10s.updateP50} rnd ${r.fps10s.renderP50} | calls ${r.renderer.calls} tris ${r.renderer.triangles} progs ${r.renderer.programs} | heap ${r.heap?.usedMB} (gc ${r.summary.heapAfterGcMB}) MB | tex ${r.memory.total.textureMB} geo ${r.memory.total.geometryMB} cpu ${r.memory.total.cpuMB} MB | ready ${(r.phases.find(p => p.name === 'ready')?.ms / 1000).toFixed(1)} s | areas ${r.areas.length}`);
  } finally {
    await close();
  }
}
if (out) writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 1));
if (process.env.PERF_JSON) writeFileSync(process.env.PERF_JSON, JSON.stringify(results));
// Non-zero exit when any run failed, with the reason already printed above.
const failedRuns = results.filter(r => r.error);
if (failedRuns.length) { console.error(`perf-run: ${failedRuns.length} of ${results.length} run(s) failed: ${failedRuns.map(r => r.error).join('; ')}`); process.exitCode = 3; }
