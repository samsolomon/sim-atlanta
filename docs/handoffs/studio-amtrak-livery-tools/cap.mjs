// node cap.mjs shots.json — shots: [{ url, out, settleMs? }]. Drives only a Chrome it launches.
import { readFileSync, writeFileSync } from 'node:fs';
import { launchChrome } from '../../../scripts/chrome-cdp.mjs';

const shots = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchChrome('cap-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
console.log('chrome profile', browser.profile);
const ws = new WebSocket(browser.wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: Number(process.env.CAP_W ?? 1200), height: Number(process.env.CAP_H ?? 800), deviceScaleFactor: 1, mobile: false });
try {
  for (const shot of shots) {
    await send('Page.navigate', { url: shot.url });
    await sleep(1500);
    const href = await evaluate('location.href');
    if (!href.startsWith(shot.url.split('?')[0])) throw new Error(`unexpected page ${href}`);
    const t0 = Date.now();
    let ready = false;
    while (Date.now() - t0 < 180000 && !ready) {
      await sleep(1000);
      try { ready = await evaluate(shot.ready ?? "!!globalThis.__perf?.phases?.some(p => p.name === 'ready')"); } catch { /* loading */ }
    }
    await sleep(shot.settleMs ?? 6000);
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Got it')?.click()");
    await sleep(600);
    const value = shot.eval ? await evaluate(shot.eval) : undefined;
    if (shot.canvas) writeFileSync(shot.out, Buffer.from(String(value).split(',')[1], 'base64'));
    else {
      if (value !== undefined) console.log(shot.out, JSON.stringify(value));
      const img = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
      writeFileSync(shot.out, Buffer.from(img.data, 'base64'));
    }
    console.log(ready ? 'ok' : 'NOT READY', shot.out, Math.round((Date.now() - t0) / 1000) + 's');
  }
} finally {
  ws.close();
  await browser.close();
}
