import { launchChrome } from './chrome-cdp.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function run(url) {
  const browser = await launchChrome('perf-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
  const ws = new WebSocket(browser.wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
  try {
    await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
    await send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await send('Page.navigate', { url });
    await sleep(150000);
    const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(__perf.fps(10000))', returnByValue: true });
    return JSON.parse(r.result.value);
  } finally { ws.close(); await browser.close(); }
}
const [a, b, pairs = '3'] = process.argv.slice(2);
const ratios = [];
for (let k = 0; k < Number(pairs); k++) {
  const [ra, rb] = await Promise.all([run(a), run(b)]);
  ratios.push(rb.trafficMean / ra.trafficMean);
  console.log(JSON.stringify({ pair: k, legacy: ra.trafficMean, legacyP95: ra.trafficP95, next: rb.trafficMean, nextP95: rb.trafficP95, ratio: +(rb.trafficMean / ra.trafficMean).toFixed(3) }));
}
ratios.sort((x, y) => x - y);
console.log('median ratio', ratios[Math.floor(ratios.length / 2)].toFixed(3));
