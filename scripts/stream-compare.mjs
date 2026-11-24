#!/usr/bin/env node
/**
 * Today's City against ?stream=1, on low (phone) and high (desktop), at the default camera and two
 * camera routes. Prints a markdown table and writes results.json, frame strips and a leak check.
 *   node scripts/stream-compare.mjs [--dist web/dist] [--out dir] [--only low|high] [--strip 8] [--no-leak] [--modes today,stream]
 *   [--extra '&mid=3000'] (appended to every ?stream=1 URL)
 * Counts and memory are deterministic enough on the loaded Studio; fps and p95 are not, so read them
 * as a smoke check and take device numbers from the A16 protocol in docs/perf.md.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const dist = resolve(opt('--dist', join(root, 'web/dist')));
const out = resolve(opt('--out', join(tmpdir(), `stream-compare-${Date.now()}`)));
const only = opt('--only', null);
const strip = Number(opt('--strip', 8));
const extra = opt('--extra', '');
const leak = !args.includes('--no-leak');
const modes = opt('--modes', 'today,stream').split(',');
mkdirSync(out, { recursive: true });
if (!existsSync(join(dist, 'index.html'))) { console.error(`no build at ${dist}; run pnpm build`); process.exit(2); }

const web = join(root, 'web');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 4900 + Math.floor(Math.random() * 90);
const server = spawn(join(web, 'node_modules/.bin/vite'), ['preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: web, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 120 && !up; i++) { try { up = (await fetch(`http://127.0.0.1:${port}/`)).ok; } catch { await sleep(250); } }
if (!up) { server.kill(); console.error('preview did not start'); process.exit(1); }

const T = '2026-11-20T14:00:00-05:00';
const tiers = [['low', false], ['high', true]].filter(([q]) => !only || q === only);
const motions = ['static', 'route:north', 'route:loop'];
const runs = [];
try {
  for (const [q, desktop] of tiers) for (const motion of motions) for (const mode of modes) {
    const url = `http://127.0.0.1:${port}/?view=city&q=${q}&t=${T}&perf=run${motion === 'static' ? '' : `&motion=${motion}`}${mode === 'stream' ? `&stream=1${extra}` : ''}`;
    const dir = join(out, `${q}-${motion.replace(':', '-')}-${mode}`);
    const json = join(dir, 'r.json');
    mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [join(root, 'scripts/perf-run.mjs'), '--out', dir, ...(desktop ? ['--desktop'] : []), ...(motion !== 'static' && strip ? ['--strip', String(strip)] : []), url],
      { env: { ...process.env, PERF_JSON: json }, encoding: 'utf8', timeout: 400000 });
    process.stdout.write(`${q} ${motion} ${mode}: ${(r.stdout || r.stderr).trim().split('\n').pop()}\n`);
    const result = existsSync(json) ? JSON.parse(readFileSync(json, 'utf8'))[0] : { error: 'no result' };
    runs.push({ q, motion, mode, url, dir, result });
    if (motion !== 'static' && strip && existsSync(join(dir, 'strip1-01.jpg'))) {
      const frames = Array.from({ length: strip }, (_, i) => `${join(dir, `strip1-${String(i + 1).padStart(2, '0')}.jpg`)}=t+${((i * (20 / strip))).toFixed(1)}s`)
        .filter(f => existsSync(f.split('=')[0]));
      spawnSync('node', [join(root, 'scripts/frame-strip.mjs'), '--out', join(out, `strip-${q}-${motion.replace(':', '-')}-${mode}.png`), '--cols', String(strip), '--width', desktop ? '300' : '160',
        '--title', `${mode === 'stream' ? '?stream=1' : 'today'} · ${q} · ${motion}`, ...frames], { stdio: 'ignore' });
    }
  }
  const leaks = leak ? await leakCheck() : [];
  writeFileSync(join(out, 'results.json'), JSON.stringify({ runs, leaks }, null, 1));
  const md = table(runs) + (leaks.length ? '\n\n' + leakTable(leaks) : '');
  writeFileSync(join(out, 'table.md'), md);
  console.log('\n' + md + `\n\nOutput: ${out}`);
} finally {
  server.kill();
}

function table(rs) {
  const s = r => r.result?.summary ?? {};
  const sec = ms => (ms == null ? '—' : (ms / 1000).toFixed(1));
  const rows = rs.map(r => {
    const m = s(r), f = r.result?.fetched ?? {}, loader = r.result?.stream?.loader;
    if (r.result?.error) return `| ${r.q} | ${r.motion} | ${r.mode} | ${r.result.error} |||||||||||`;
    const complete = r.mode === 'stream' ? m.settledMs : (m.lastAreaMs ?? m.readyMs);
    return `| ${r.q} | ${r.motion} | ${r.mode} | ${sec(m.firstFrameMs)} | ${sec(m.readyMs)} | ${sec(complete)} | ${m.peakHeapMB} | ${m.heapAfterGcMB} | ${m.calls} | ${m.programs} | ${((m.triangles ?? 0) / 1e6).toFixed(2)}M | ${m.geometryMB} | ${m.fps} | ${m.p95} | ${f.dataFiles} / ${f.dataMB} MB | ${m.areas}${r.mode === 'stream' ? ` · rings ${m.ringTransitions} (thrash ${m.ringThrash})${loader ? ` · loader max ${Math.round(loader.maxFrameMs)} ms, ${loader.overBudgetFrames} over` : ''}` : ''} |`;
  });
  return ['| Tier | Camera | Mode | First paint s | Ready s | Complete s | Peak heap MB | Heap after GC MB | Draws | Programs | Triangles | Geometry MB | fps | p95 ms | Data files / bytes | Full areas · stream |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |', ...rows].join('\n');
}

/**
 * Leak check (?stream=1, low): fly the camera between Five Points and Brookwood five times, waiting for
 * the loader to drain each time, and read heap after GC plus live GPU geometries and textures at
 * Five Points. A clean unmount returns both to the first cycle's level.
 */
async function leakCheck() {
  const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const cdp = 9800 + Math.floor(Math.random() * 150);
  const profile = mkdtempSync(join(tmpdir(), 'leak-chrome-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${cdp}`, `--user-data-dir=${profile}`, '--headless=new', '--no-first-run',
    '--enable-precise-memory-info', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
  const rows = [];
  try {
    let wsUrl;
    for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${cdp}/json`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch { await sleep(200); } }
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
    const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 891, deviceScaleFactor: 2.625, mobile: true });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/?view=city&q=low&t=${T}&perf=1&stream=1${extra}` });
    for (let i = 0; i < 240; i++) { await sleep(500); try { if (await evaluate('__perf.phases.some(p => p.name === "ready")')) break; } catch { /* loading */ } }
    if (!(await evaluate('typeof __stream === "object"'))) return [{ cycle: 0, note: '__stream handle missing; streaming branch not in this build' }];
    const settle = async () => {
      // Drained loader and no ring change for 3 s, or 60 s.
      let quiet = 0, last = -1;
      for (let i = 0; i < 240 && quiet < 6; i++) {
        await sleep(500);
        const s = await evaluate('({ p: __perf.streamPending(), t: __perf.ringSummary().transitions })');
        quiet = s.p === 0 && s.t === last ? quiet + 1 : 0;
        last = s.t;
      }
    };
    const sample = async (cycle, at) => {
      await send('HeapProfiler.enable');
      await send('HeapProfiler.collectGarbage');
      const v = await evaluate('({ heap: Math.round(performance.memory.usedJSHeapSize / 1048576), gpu: __perf.report(false).renderer?.gpuObjects, rings: __perf.ringSummary(), areas: (__perf.report(false).areas || []).length })');
      rows.push({ cycle, at, heapAfterGcMB: v.heap, geometries: v.gpu?.geometries, textures: v.gpu?.textures, fullAreas: v.areas, transitions: v.rings.transitions, thrash: v.rings.thrash });
    };
    for (let c = 1; c <= 5; c++) {
      await evaluate('__stream.setCamera(400, -650, 700)'); await settle(); await sample(c, 'Five Points');
      await evaluate('__stream.setCamera(400, -5300, 700)'); await settle(); await sample(c, 'Brookwood');
    }
    ws.close();
  } catch (e) {
    rows.push({ cycle: -1, note: String(e) });
  } finally {
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    rmSync(profile, { recursive: true, force: true });
  }
  return rows;
}

function leakTable(rows) {
  if (rows[0]?.note) return `Leak check: ${rows[0].note}`;
  return ['| Cycle | Camera | Heap after GC MB | GPU geometries | GPU textures | Full areas | Ring transitions (thrash) |', '| ---: | --- | ---: | ---: | ---: | ---: | --- |',
    ...rows.map(r => r.note ? `| ${r.cycle} | ${r.note} ||||||` : `| ${r.cycle} | ${r.at} | ${r.heapAfterGcMB} | ${r.geometries} | ${r.textures} | ${r.fullAreas} | ${r.transitions} (${r.thrash}) |`)].join('\n');
}
