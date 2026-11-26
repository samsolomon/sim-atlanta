#!/usr/bin/env node
/**
 * Which clocks and weathers compile shader programs after City is ready? Opens City at 14:00, waits
 * for every area, then moves the clock through a day in 30-minute steps and through each weather
 * preset by day and night (the same paths as the time slider and weather menu, via ?perf's __scene),
 * recording the program count and the worst frame after every step. Programs that first compile
 * after ready are frames that stall; their three.js cache keys say which defines split them.
 *   node scripts/program-sweep.mjs --url http://127.0.0.1:PORT [--q low|high] [--out dir] [--step 30] [--quick] [--json file]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome } from './chrome-cdp.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const base = opt('--url', null);
const q = opt('--q', 'low');
const out = opt('--out', null);
const stepMin = Number(opt('--step', 30));
const start = opt('--t', '2026-11-20T14:00:00-05:00');
// --quick: the clock states and weathers that switch things on (dusk, night, late night, dawn), for test:perf.
const quick = args.includes('--quick');
const jsonOut = opt('--json', null);
if (!base) { console.error('usage: program-sweep.mjs --url http://127.0.0.1:PORT [--q low|high] [--out dir]'); process.exit(2); }
if (out) mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const WEATHER = {
  Clear: { cloud: 0, rain: 0, fog: 0, snow: 0 },
  Rain: { cloud: 1, rain: 0.75, fog: 0.25, snow: 0 },
  Fog: { cloud: 0.7, rain: 0, fog: 0.9, snow: 0 },
  Storm: { cloud: 1, rain: 1, fog: 0.4, snow: 0 },
  Snow: { cloud: 1, rain: 0, fog: 0.3, snow: 1 },
};

const browser = await launchChrome('phoneperf-sweep-', ['--headless=new', '--enable-precise-memory-info', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']);
const rows = [];
try {
  const ws = new WebSocket(browser.wsUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  await send('Runtime.enable');
  if (q === 'low') await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
  else await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: `${base}/?view=city&q=${q}&t=${start}&perf=1` });
  // Ready, then quiet: no sliced area build under way and no load phase for 5 s (every area
  // mounted), with the ?perf hooks installed.
  // A loaded Studio can take minutes; wait up to 8, and say what was missing if it never got there.
  let state = { hook: false, ready: false, building: 0, last: 0, now: 0, phase: 'none' };
  for (let i = 0; i < 960; i++) {
    await sleep(500);
    try {
      state = await evaluate('(() => { const p = window.__perf?.phases ?? []; return { hook: typeof window.__scene === "function", ready: p.some(x => x.name === "ready"), last: p[p.length - 1]?.ms ?? 0, building: window.__perf?.building ?? 0, now: performance.now(), phase: p[p.length - 1]?.name ?? "none" }; })()') ?? state;
      if (state.hook && state.ready && !state.building && state.now - state.last > 5000) break;
    } catch { /* navigating */ }
  }
  if (!state.hook) throw new Error(`__scene hook never appeared at ${q} (last load phase: ${state.phase}); is this a ?perf build from main after #464?`);
  // A City that never became ready (failed data, crashed build) has no programs to sweep; passing it
  // would report zero late compiles for a scene that never drew.
  const ready = await evaluate('__perf.phases.some(p => p.name === "ready")');
  if (!ready) throw new Error(`City never reached ready at ${q}; nothing was swept`);
  const known = new Map((await evaluate('__perf.programs()')).map(p => [p.id, p]));
  const atReady = known.size;
  if (!atReady) throw new Error('no shader programs at ready: the renderer never attached');
  if (out) writeFileSync(join(out, `owners-at-ready-${q}.json`), JSON.stringify(await evaluate('__perf.programOwners()')));
  console.log(`${q}: ${atReady} programs at ready (${start})`);
  const step = async (label, o) => {
    await evaluate(`__scene(${JSON.stringify(o)})`);
    await sleep(1500);
    const progs = await evaluate('__perf.programs()');
    const fresh = progs.filter(p => !known.has(p.id));
    for (const p of fresh) known.set(p.id, p);
    const worst = await evaluate('__perf.fps(1500).max');
    // Owners of the new programs: which objects and materials made them.
    const ids = new Set(fresh.map(p => p.id));
    const owners = ids.size ? (await evaluate('__perf.programOwners()')).filter(o => ids.has(o.program)) : [];
    rows.push({ label, programs: progs.length, newPrograms: fresh.map(p => ({ id: p.id, name: p.name, key: p.key, owners: owners.filter(o => o.program === p.id).slice(0, 6) })), worstFrameMs: worst });
    console.log(`${label.padEnd(26)} programs ${String(progs.length).padStart(3)}  new ${fresh.length}${fresh.length ? ' (' + fresh.map(p => p.name).join(', ') + ')' : ''}  worst ${worst} ms`);
  };
  const offsets = quick ? [210, 300, 480, 570, 720, 960, 1440] : Array.from({ length: Math.floor(1440 / stepMin) }, (_, i) => (i + 1) * stepMin);
  for (const m of offsets) {
    const h = (14 + m / 60) % 24;
    await step(`clock ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`, { offsetMin: m });
  }
  for (const [hour, offset] of quick ? [['14:00', 0], ['22:00', 480]] : [['14:00', 0], ['19:00', 300], ['22:00', 480]]) {
    for (const [name, w] of Object.entries(WEATHER)) await step(`${name} at ${hour}`, { offsetMin: offset, conditions: w });
    await step(`Auto at ${hour}`, { offsetMin: offset, conditions: {} });
  }
  const max = Math.max(atReady, ...rows.map(r => r.programs));
  const after = rows.flatMap(r => r.newPrograms.map(p => ({ ...p, step: r.label })));
  const summary = { q, atReady, max, compiledAfterReady: after.length, worstStepFrameMs: Math.max(...rows.map(r => r.worstFrameMs)), rows };
  console.log(`\n${q}: ready ${atReady}, max ${max}, ${after.length} programs compiled after ready, worst step frame ${summary.worstStepFrameMs} ms`);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(summary));
  if (out) {
    writeFileSync(join(out, `sweep-${q}.json`), JSON.stringify(summary, null, 1));
    // The defines that split each late program from its namesakes compiled before.
    const lines = after.map(p => `- ${p.step}: program ${p.id} ${p.name}\n  owners: ${p.owners.map(o => `${o.path || '(unnamed)'} [${o.object} ${o.type}${o.name ? ' ' + o.name : ''}]`).join('; ') || 'none found (shadow pass or a removed object)'}\n  key: ${p.key.slice(0, 300)}`);
    writeFileSync(join(out, `late-programs-${q}.md`), lines.join('\n'));
  }
  ws.close();
} finally {
  await browser.close();
}
