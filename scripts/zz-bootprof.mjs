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
  await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start');
  await send('Page.navigate', { url: process.argv[2] });
  await sleep(Number(process.env.WAIT ?? 120000));
  const { profile } = await send('Profiler.stop');
  const byId = new Map(profile.nodes.map(n => [n.id, n])); const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const counts = new Map(); profile.samples.forEach((s, i) => counts.set(s, (counts.get(s) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  const name = n => (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber;
  for (const root of process.argv.slice(3)) {
    let total = 0; const child = new Map(), grand = new Map();
    for (const [nid, t] of counts) {
      const chain = []; for (let p = nid; p !== undefined; p = parent.get(p)) chain.push(byId.get(p));
      const r = chain.findIndex(n => (n.callFrame.functionName || '') === root);
      if (r < 0) continue;
      total += t;
      const c = r > 0 ? name(chain[r - 1]) : '(self)'; child.set(c, (child.get(c) ?? 0) + t);
      const g = r > 1 ? name(chain[r - 1]) + ' > ' + name(chain[r - 2]) : c; grand.set(g, (grand.get(g) ?? 0) + t);
    }
    const fmt = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => '  ' + (v / 1000).toFixed(0).padStart(5) + ' ms ' + k).join('\n');
    console.log(`== ${root}: ${(total / 1000).toFixed(0)} ms total\n${fmt(child)}\n -- two levels\n${fmt(grand)}`);
  }
} finally { ws.close(); await browser.close(); }
