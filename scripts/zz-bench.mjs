import { launchChrome } from './chrome-cdp.mjs';
import { readFileSync } from 'node:fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [origin, file] = process.argv.slice(2);
const browser = await launchChrome('perf-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
const ws = new WebSocket(browser.wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
try {
  await send('Page.navigate', { url: origin + '/@vite/client' }); await sleep(1500);
  await send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU ?? 6) });
  const r = await send('Runtime.evaluate', { expression: readFileSync(file, 'utf8'), returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  console.log(JSON.stringify(r.result.value.map(m => ({ mode: m.mode, drawn: m.drawn, bus: m.busUpdateMs }))));
} finally { ws.close(); await browser.close(); }
