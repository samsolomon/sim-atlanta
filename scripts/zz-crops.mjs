import { launchChrome } from './chrome-cdp.mjs';
import { writeFileSync } from 'node:fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [out, url] = process.argv.slice(2);
const browser = await launchChrome('perf-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
const ws = new WebSocket(browser.wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const k = ++id; pending.set(k, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: k, method, params })); });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
  await send('Page.navigate', { url }); await sleep(Number(process.env.WAIT ?? 70000));
  const page = (await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true })).result.value;
  if (!page.startsWith(url.split('?')[0])) throw Error('not our page: ' + page);
  for (let f = 0; f < 4; f++) {
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 130, y: 370, width: 150, height: 150, scale: 1 } });
    writeFileSync(`${out}-${f}.png`, Buffer.from(shot.data, 'base64'));
  }
} finally { ws.close(); await browser.close(); }
