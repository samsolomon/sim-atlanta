#!/usr/bin/env node
// Estimate GPU memory and JS heap of a City build in headless Chrome, with no app hooks.
//
//   node scripts/gpu-meter.mjs --url "http://localhost:5173/?view=city&q=low" [--mobile] [--settle 20]
//
// A script injected before the page runs wraps WebGL2 uploads and tallies bytes per live
// texture, renderbuffer and buffer (mips count 4/3 after generateMipmap; deletes subtract).
// It waits until the totals hold still for `settle` seconds. Estimates, not driver truth.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { activePort } from './chrome-cdp.mjs';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const url = arg('url', 'http://localhost:5173/?view=city&q=low');
const mobile = process.argv.includes('--mobile');
const settle = Number(arg('settle', '20')) * 1000;
const timeout = Number(arg('timeout', '300')) * 1000;
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const tally = () => {
  const G = WebGL2RenderingContext.prototype, M = { textures: new Map(), dims: new Map(), base: new Map(), rbs: new Map(), buffers: new Map(), peak: 0 };
  window.__gpuMeter = M;
  const unit = new WeakMap(), boundTex = new WeakMap(), boundBuf = new WeakMap(), boundRb = new WeakMap();
  const per = (gl, m) => { let v = m.get(gl); if (!v) m.set(gl, v = {}); return v; };
  const bpp = (fmt, type) => ({ 0x8058: 4, 0x881A: 8, 0x8814: 16, 0x81A6: 4, 0x88F0: 4, 0x8CAC: 4, 0x8229: 1, 0x822B: 2, 0x8051: 4, 0x8C43: 4, 0x8D62: 2, 0x1909: 1, 0x190A: 2 })[fmt]
    ?? (type === 0x140B ? 8 : type === 0x1406 ? 16 : 4);
  const sum = () => { let s = 0; for (const m of [M.textures, M.rbs, M.buffers]) for (const v of m.values()) s += v; M.peak = Math.max(M.peak, s); };
  const wrap = (name, fn) => { const o = G[name]; G[name] = function (...a) { fn.call(this, ...a); return o.apply(this, a); }; };
  wrap('activeTexture', function (u) { unit.set(this, u); });
  wrap('bindTexture', function (t, tex) { per(this, boundTex)[(unit.get(this) ?? 0x84C0) + ':' + t] = tex; });
  const tex = gl => { const b = per(gl, boundTex), u = (unit.get(gl) ?? 0x84C0) + ':';
    return b[u + 0x0DE1] ?? b[u + 0x8C1A] ?? b[u + 0x806F] ?? b[u + 0x8513]; };
  wrap('texImage2D', function (t, level, fmt, ...r) {
    if (level !== 0) return;
    let w, h, type;
    if (r.length >= 6) { [w, h, , , type] = r; } else { const src = r[2]; w = src?.videoWidth ?? src?.width; h = src?.videoHeight ?? src?.height; type = r[1]; }
    const k = tex(this); if (k && w && h) { M.textures.set(k, w * h * bpp(fmt, type)); M.base.set(k, w * h * bpp(fmt, type)); M.dims.set(k, w + 'x' + h); sum(); }
  });
  wrap('texImage3D', function (t, level, fmt, w, h, d, b, f, type) { const k = tex(this); if (k && level === 0) { M.textures.set(k, w * h * d * bpp(fmt, type)); sum(); } });
  wrap('texStorage2D', function (t, levels, fmt, w, h) { const k = tex(this); if (k) { M.base.delete(k); M.textures.set(k, w * h * bpp(fmt) * (levels > 1 ? 4 / 3 : 1)); M.dims.set(k, w + 'x' + h + (levels > 1 ? ' mips' : '') + ' fmt' + fmt.toString(16)); sum(); } });
  wrap('texStorage3D', function (t, levels, fmt, w, h, d) { const k = tex(this); if (k) { M.base.delete(k); M.textures.set(k, w * h * d * bpp(fmt) * (levels > 1 ? 4 / 3 : 1)); sum(); } });
  wrap('compressedTexImage2D', function (t, level, fmt, w, h, b, data) { const k = tex(this); if (k && level === 0) { M.textures.set(k, data?.byteLength ?? 0); sum(); } });
  // texStorage2D already counted its levels; a texImage2D level 0 gains 1/3 once, however often it re-mips.
  wrap('generateMipmap', function () { const k = tex(this); if (k && M.base.has(k)) { M.textures.set(k, M.base.get(k) * 4 / 3); sum(); } });
  wrap('deleteTexture', function (k) { M.textures.delete(k); });
  wrap('bindRenderbuffer', function (t, rb) { per(this, boundRb).rb = rb; });
  wrap('renderbufferStorage', function (t, fmt, w, h) { const k = per(this, boundRb).rb; if (k) { M.rbs.set(k, w * h * bpp(fmt)); sum(); } });
  wrap('renderbufferStorageMultisample', function (t, s, fmt, w, h) { const k = per(this, boundRb).rb; if (k) { M.rbs.set(k, w * h * bpp(fmt) * s); sum(); } });
  wrap('deleteRenderbuffer', function (k) { M.rbs.delete(k); });
  wrap('bindBuffer', function (t, b) { per(this, boundBuf)[t] = b; });
  wrap('bufferData', function (t, d) { const k = per(this, boundBuf)[t]; if (k) { M.buffers.set(k, typeof d === 'number' ? d : d?.byteLength ?? 0); sum(); } });
  wrap('deleteBuffer', function (k) { M.buffers.delete(k); });
};

const profile = mkdtempSync(join(tmpdir(), 'gpu-meter-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', 'about:blank'], { stdio: 'ignore' });
try {
  let ws;
  for (let i = 0; i < 100 && !ws; i++) {
    try { ws = (await (await fetch(`http://127.0.0.1:${await activePort(profile)}/json/list`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* starting */ }
    await sleep(200);
  }
  if (!ws) throw Error(`Chrome exposed no debugger page; set CHROME (now ${chrome}). Needs Node 22+ for WebSocket.`);
  const sock = new WebSocket(ws); await new Promise(r => sock.onopen = r);
  let id = 0; const pending = new Map();
  sock.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); sock.send(JSON.stringify({ id: n, method, params })); });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
  if (mobile) await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true });
  else await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${tally})()` });
  await send('Page.navigate', { url });
  // Resident memory of this Chrome's renderer and GPU processes (SwiftShader keeps GPU data in RAM).
  const rss = () => {
    const out = execFileSync('ps', ['-axo', 'rss=,command='], { encoding: 'utf8', maxBuffer: 1 << 26 });
    const kind = { renderer: 0, gpu: 0 };
    for (const line of out.split('\n')) {
      if (!line.includes(profile)) continue;
      const kb = Number(line.trim().split(/\s+/)[0]);
      if (line.includes('--type=renderer')) kind.renderer += kb; else if (line.includes('--type=gpu-process')) kind.gpu += kb;
    }
    return kind;
  };
  const peakRss = { renderer: 0, gpu: 0 };
  const t0 = Date.now(); let last = -1, stableSince = Date.now(), snap;
  const read = () => ev(`(() => { const M = window.__gpuMeter; if (!M) return null; const s = m => [...m.values()].reduce((a, b) => a + b, 0);
    return { tex: s(M.textures), texCount: M.textures.size, rb: s(M.rbs), buf: s(M.buffers), bufCount: M.buffers.size, peak: M.peak,
      largest: [...M.textures].sort((a, b) => b[1] - a[1]).map(([k, v]) => [M.dims.get(k) ?? '?', v]) }; })()`);
  for (;;) {
    await sleep(2000);
    snap = await read().catch(() => null);
    const now = rss(); peakRss.renderer = Math.max(peakRss.renderer, now.renderer); peakRss.gpu = Math.max(peakRss.gpu, now.gpu);
    const total = snap ? snap.tex + snap.rb + snap.buf : 0;
    if (Math.abs(total - last) > 1e5) { last = total; stableSince = Date.now(); }
    if ((total > 0 && Date.now() - stableSince > settle) || Date.now() - t0 > timeout) break;
  }
  if (!snap) throw Error("No WebGL uploads seen (meter not injected or page failed)");
  const metrics = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
  const MB = b => (b / 2 ** 20).toFixed(1);
  console.log(JSON.stringify({ url, mobile, seconds: Math.round((Date.now() - t0) / 1000),
    textureMB: MB(snap.tex), textures: snap.texCount, renderbufferMB: MB(snap.rb), bufferMB: MB(snap.buf), buffers: snap.bufCount,
    gpuTotalMB: MB(snap.tex + snap.rb + snap.buf), gpuPeakMB: MB(snap.peak), jsHeapMB: MB(metrics.JSHeapUsedSize ?? 0),
    peakRendererRssMB: (peakRss.renderer / 1024).toFixed(0), peakGpuProcessRssMB: (peakRss.gpu / 1024).toFixed(0),
    textureSizes: (() => { const g = new Map(); for (const [d, v] of snap.largest) { const e = g.get(d) ?? [0, 0]; g.set(d, [e[0] + 1, e[1] + v]); }
      return [...g].sort((a, b) => b[1][1] - a[1][1]).slice(0, 14).map(([d, [n, v]]) => `${n}× ${d} = ${MB(v)} MB`); })() }));
  sock.close();
} finally { proc.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true }); }
