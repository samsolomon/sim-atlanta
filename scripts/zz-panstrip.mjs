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
  await send('Emulation.setDeviceMetricsOverride', { width: 1120, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await sleep(Number(process.env.WAIT ?? 60000));
  const page = (await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true })).result.value;
  if (!page.startsWith(url.split('?')[0])) throw Error('not our page: ' + page);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 560, y: 360, button: 'left', clickCount: 1 });
  for (let f = 0; f < 8; f++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 560 - f * 12, y: 360, button: 'left', buttons: 1 });
    await sleep(120);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}-${f}.png`, Buffer.from(shot.data, 'base64'));
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 560 - 96, y: 360, button: 'left', clickCount: 1 });
} finally { ws.close(); await browser.close(); }
