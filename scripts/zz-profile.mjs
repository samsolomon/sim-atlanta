import { launchChrome } from './chrome-cdp.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await launchChrome('perf-chrome-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
const ws = new WebSocket(browser.wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
  await send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await send('Page.navigate', { url: process.argv[2] });
  await sleep(150000);
  await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 100 }); await send('Profiler.start');
  await sleep(15000);
  const { profile } = await send('Profiler.stop');
  const byId = new Map(profile.nodes.map(n => [n.id, n])); const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const counts = new Map(); profile.samples.forEach((s, i) => counts.set(s, (counts.get(s) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  const name = n => n.callFrame.functionName || '(anon)';
  // Time inside RoadTraffic.update, attributed to the first frame below `step`/the direct callee.
  let inUpdate = 0; const self = new Map(), child = new Map();
  for (const [nid, t] of counts) {
    const chain = []; for (let p = nid; p !== undefined; p = parent.get(p)) chain.push(byId.get(p));
    const u = chain.findIndex(n => name(n) === 'update' && /midtown-rows/.test(n.callFrame.url) && chain.some(m => name(m) === 'step'));
    const st = chain.findIndex(n => name(n) === 'step' && /midtown-rows/.test(n.callFrame.url));
    if (st < 0) continue;
    inUpdate += t;
    const k = name(chain[0]); self.set(k, (self.get(k) ?? 0) + t);
    const c = st > 0 ? name(chain[st - 1]) : '(step self)'; child.set(c, (child.get(c) ?? 0) + t);
  }
  const fmt = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => (v / inUpdate * 100).toFixed(1) + '% ' + k).join('\n');
  console.log('traffic step total ms in 15 s:', (inUpdate / 1000).toFixed(0));
  console.log('BY DIRECT CALLEE OF step\n' + fmt(child) + '\nBY SELF FUNCTION\n' + fmt(self));
} finally { ws.close(); await browser.close(); }
