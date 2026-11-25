import { launchChrome } from './chrome-cdp.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const url of process.argv.slice(2)) {
  const browser = await launchChrome('perf-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
  const ws = new WebSocket(browser.wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
  try {
    await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
    await send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU ?? 6) });
    await send('Page.navigate', { url });
    await sleep(Number(process.env.WARM ?? 150000));
    const r = await send('Runtime.evaluate', { expression: 'JSON.stringify({...__perf.fps(10000), idle: __perf.idle, counts: __perf.counts})', returnByValue: true });
    const f = JSON.parse(r.result.value);
    console.log(JSON.stringify({ url: url.replace(/^.*\?/, ''), fps: f.fps, updateP50: f.updateP50, trafficMean: f.trafficMean, trafficP50: f.trafficP50, trafficP95: f.trafficP95, idle: f.idle, counts: f.counts }));
  } finally { ws.close(); await browser.close(); }
}
