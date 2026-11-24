// node run.mjs <url> <minutes> <out.json> — record passenger-car curve swing in a Chrome this script launches.
import { readFileSync, writeFileSync } from 'node:fs';
import { launchChrome } from '../../../scripts/chrome-cdp.mjs';

const [url, minutes, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchChrome('swing-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
const ws = new WebSocket(browser.wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(1500);
  const href = await evaluate('location.href');
  if (!href.startsWith(url.split('?')[0])) throw new Error(`unexpected page ${href}`);
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    await sleep(1000);
    try { if (await evaluate("!!globalThis.__perf?.phases?.some(p => p.name === 'ready')")) break; } catch { /* loading */ }
  }
  await sleep(8000);
  console.log('start', JSON.stringify(await evaluate(readFileSync(new URL('./recorder.js', import.meta.url), 'utf8'))));
  const end = Date.now() + Number(minutes) * 60000;
  while (Date.now() < end) {
    await sleep(30000);
    const r = await evaluate('(() => { const r = __swingReport(); return { stats: r.stats, top: r.cells.slice(0, 3) }; })()');
    console.log(new Date().toISOString().slice(11, 19), JSON.stringify(r.stats), JSON.stringify(r.top));
  }
  writeFileSync(out, JSON.stringify(await evaluate('__swingReport()')));
  console.log('saved', out);
} finally {
  ws.close();
  await browser.close();
}
