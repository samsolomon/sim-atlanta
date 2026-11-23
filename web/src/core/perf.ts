/**
 * Phone performance instrumentation (A16 workstream). Self-contained: no imports beyond types,
 * so the same file applies onto older commits for bisecting.
 *
 * Always on, and cheap: a ring of frame timestamps (one store per frame) and a list of load phases.
 * Everything else runs on demand: `__perf.report()` in the console, or the URL:
 *   ?perf        an overlay (fps 1 s/10 s, frame p50/p95, CPU update/render split, draw calls,
 *                triangles, programs, memory by category, JS heap, load phases), plus one
 *                `PERF_PHASE` console line per load phase and a crash trail in localStorage.
 *   ?perf=run    the same, then waits for City to settle, samples 10 s and prints one
 *                `PERF_RESULT {json}` line (also on screen and in localStorage `perf-result`).
 * Memory figures are estimates from the scene (width x height x bytes per texel, a third more for
 * mipmaps; attribute array lengths), not driver readings.
 */
import type * as THREE from 'three';

/** `scenery` is a terrain area's mixed scenery group until its builders tag buildings, trees and yards. */
export type PerfCategory = 'terrain' | 'transport' | 'buildings' | 'trees' | 'vehicles' | 'landscape' | 'scenery' | 'other';

interface Phase { name: string; ms: number; heapMB: number | null }
interface Bucket { meshes: number; instances: number; triangles: number; geometries: number; geometryBytes: number; textures: number; textureBytes: number; cpuBytes: number }
export interface PerfContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** Known roots and their category. An object takes the category of its nearest tagged or
   * listed ancestor (`userData.perf` on the object wins), else 'other'. */
  roots(): Map<THREE.Object3D, PerfCategory>;
  /** Post-processing owners: composer, passes, targets. Scanned one level deep for render targets. */
  post(): unknown[];
  /** Turn the view by degrees (for ?perf=run&motion=orbit). */
  rotate?(degrees: number): void;
  /** Pan by a screen offset in CSS px (for ?perf=run&motion=pan). */
  pan?(dxPx: number, dyPx: number): void;
  /** Areas mounted so far (mosaic keys), for the report. */
  areas?(): string[];
  quality: string;
}

const params = new URLSearchParams(globalThis.location?.search ?? '');
const mode = params.get('perf');
/** `?perf` or `?perf=run`; off otherwise. */
export const perfEnabled = mode !== null && mode !== '0' && mode !== 'off';
const TRAIL_KEY = 'perf-trail';

/** A/B switches for device runs, read only under ?perf so they never reach a normal visit:
 *   &pr=0.75      pixel ratio override
 *   &shadow=off   or a shadow map size (512, 1024, 2048…)
 *   &nopass=ink,grade,tilt,bloom,gtao   disable post passes
 *   &post=off     render straight to the canvas, no composer
 *   &hide=trees,scenery,terrain,transport,buildings,vehicles   hide whole categories (fps upper
 *                 bounds per category). `trees` means every instanced mesh in area scenery.
 *   &motion=orbit ?perf=run turns the camera 12°/s through the sample
 *   &motion=pan   ?perf=run pans back and forth (±150 CSS px, 4 s period), which moves the orbit
 *                 target and so redraws the shadow map as a dragging visitor does */
export const perfOverrides = (() => {
  if (!perfEnabled) return { pixelRatio: null, shadow: null, nopass: new Set<string>(), postOff: false, hide: new Set<string>() };
  const pr = Number(params.get('pr'));
  const sh = params.get('shadow');
  return {
    pixelRatio: pr > 0 && pr <= 4 ? pr : null,
    shadow: sh === 'off' ? 'off' as const : Number(sh) >= 64 ? Number(sh) : null,
    nopass: new Set((params.get('nopass') ?? '').split(',').filter(Boolean)),
    postOff: params.get('post') === 'off',
    hide: new Set((params.get('hide') ?? '').split(',').filter(Boolean)),
  };
})();

const N = 2048; // ~34 s at 60 fps
const stamps = new Float64Array(N);
const updateMs = new Float32Array(N);
const renderMs = new Float32Array(N);
const tris = new Float32Array(N);
let head = 0;
let count = 0;
let shadowUpdates = 0;
const phases: Phase[] = [];
let ctx: PerfContext | null = null;
let lastResult: unknown = null;

function heapMB(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round(m.usedJSHeapSize / 1048576) : null;
}
function heap() {
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  return m ? { usedMB: Math.round(m.usedJSHeapSize / 1048576), totalMB: Math.round(m.totalJSHeapSize / 1048576), limitMB: Math.round(m.jsHeapSizeLimit / 1048576) } : null;
}

// The previous load's trail: a run that never reached `ready` (or a result) most likely died.
const previousRun = (() => {
  if (!perfEnabled) return null;
  try {
    const t = JSON.parse(localStorage.getItem(TRAIL_KEY) ?? 'null') as { url: string; at: string; phases: Phase[]; done?: boolean } | null;
    if (!t) return null;
    const last = t.phases[t.phases.length - 1];
    const peak = Math.max(0, ...t.phases.map(p => p.heapMB ?? 0));
    return { url: t.url, at: t.at, completed: !!t.done, lastPhase: last?.name ?? null, lastMs: last?.ms ?? null, peakHeapMB: peak || null };
  } catch { return null; }
})();
const startedAt = new Date().toISOString();
function saveTrail(done = false) {
  if (!perfEnabled) return;
  try {
    localStorage.setItem(TRAIL_KEY, JSON.stringify({ url: location.href, at: startedAt, phases, done }));
  } catch { /* private mode */ }
}
if (perfEnabled && previousRun && !previousRun.completed) {
  console.warn('PERF_PREVIOUS_RUN_INCOMPLETE', JSON.stringify(previousRun));
}

/** A load phase, timed from navigation start. */
function phase(name: string) {
  const p = { name, ms: Math.round(performance.now()), heapMB: heapMB() };
  phases.push(p);
  if (perfEnabled) {
    console.info('PERF_PHASE', name, p.ms, p.heapMB);
    saveTrail(name === 'ready');
  }
  // Ready: colour is revealed and a frame has drawn (without the white model, revealed comes first).
  // Per City open: only phases since the latest city:open count, so a reopen gets its own ready.
  let openAt = 0;
  for (let i = phases.length - 1; i >= 0; i--) if (phases[i].name === 'city:open') { openAt = i; break; }
  const has = (n: string) => phases.slice(openAt).some(q => q.name === n);
  if ((name === 'city:revealed' || name === 'city:first-frame') && has('city:revealed') && has('city:first-frame') && !has('ready')) phase('ready');
}

/** One rendered frame: rAF timestamp, CPU ms spent updating and in composer.render(), and the
 * triangles it drew (all passes, shadow redraws included). */
function frame(ts: number, update: number, render: number, triangles = 0) {
  stamps[head] = ts;
  updateMs[head] = update;
  renderMs[head] = render;
  tris[head] = triangles;
  head = (head + 1) % N;
  if (count < N) count++;
}

/** Indices of frames within the last `windowMs`, newest first. */
function recent(windowMs: number) {
  const out: number[] = [];
  if (!count) return out;
  const newest = stamps[(head - 1 + N) % N];
  for (let k = 1; k <= count; k++) {
    const i = (head - k + N) % N;
    if (newest - stamps[i] > windowMs) break;
    out.push(i);
  }
  return out;
}
const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const r1 = (x: number) => Math.round(x * 10) / 10;

function frames(windowMs: number) {
  const idx = recent(windowMs);
  if (idx.length < 2) return { fps: 0, frames: idx.length, p50: 0, p95: 0, max: 0, updateP50: 0, renderP50: 0, renderP95: 0, trianglesP50: 0, trianglesMax: 0 };
  const span = stamps[idx[0]] - stamps[idx[idx.length - 1]];
  const dts: number[] = [];
  for (let k = 0; k < idx.length - 1; k++) dts.push(stamps[idx[k]] - stamps[idx[k + 1]]);
  const up = idx.map(i => updateMs[i]);
  const rn = idx.map(i => renderMs[i]);
  const tr = idx.map(i => tris[i]);
  return {
    fps: r1(((idx.length - 1) * 1000) / Math.max(1, span)), frames: idx.length,
    p50: r1(pct(dts, 0.5)), p95: r1(pct(dts, 0.95)), max: r1(Math.max(...dts)),
    updateP50: r1(pct(up, 0.5)), renderP50: r1(pct(rn, 0.5)), renderP95: r1(pct(rn, 0.95)),
    trianglesP50: pct(tr, 0.5), trianglesMax: Math.max(...tr),
  };
}

// ---- memory inventory --------------------------------------------------------------------
const GL = { UnsignedByte: 1009, Byte: 1010, Short: 1011, UnsignedShort: 1012, Int: 1013, UnsignedInt: 1014, Float: 1015, HalfFloat: 1016,
  Alpha: 1021, RGB: 1022, RGBA: 1023, Depth: 1026, DepthStencil: 1027, Red: 1028, RedInteger: 1029, RG: 1030, RGInteger: 1031, RGBAInteger: 1033,
  Nearest: 1003, Linear: 1006 } as const;
function texelBytes(format: number, type: number) {
  const channels = format === GL.Red || format === GL.RedInteger || format === GL.Alpha || format === GL.Depth ? 1
    : format === GL.RG || format === GL.RGInteger ? 2 : 4; // RGB is padded to 4 on most GPUs
  const size = type === GL.Float || type === GL.Int || type === GL.UnsignedInt ? 4
    : type === GL.HalfFloat || type === GL.Short || type === GL.UnsignedShort ? 2 : 1;
  return format === GL.DepthStencil ? 4 : channels * size;
}
function dims(img: unknown): [number, number] {
  const i = img as { width?: number; height?: number; videoWidth?: number; naturalWidth?: number; naturalHeight?: number } | null;
  if (!i) return [0, 0];
  return [i.naturalWidth || i.videoWidth || i.width || 0, i.naturalHeight || i.height || 0];
}
/** GPU bytes (estimated) and CPU bytes the page still holds for one texture. */
export function textureBytes(t: THREE.Texture) {
  const img = (t as { image?: unknown }).image;
  const faces = Array.isArray(img) ? img.length : 1; // cube maps
  const [w, h] = dims(Array.isArray(img) ? img[0] : img);
  const mips = t.generateMipmaps && t.minFilter !== GL.Nearest && t.minFilter !== GL.Linear ? 4 / 3 : 1;
  const gpu = (t as { isCompressedTexture?: boolean }).isCompressedTexture ? 0 : w * h * faces * texelBytes(t.format as number, t.type as number) * mips;
  const data = (img as { data?: ArrayBufferView } | null)?.data;
  const canvas = typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement
    || typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas;
  const cpu = data?.byteLength ?? (canvas ? w * h * 4 : 0);
  return { gpu: Math.round(gpu), cpu };
}
export function targetBytes(rt: THREE.RenderTarget) {
  let b = 0;
  for (const t of rt.textures ?? [rt.texture]) b += rt.width * rt.height * texelBytes(t.format as number, t.type as number) * Math.max(1, rt.depth ?? 1);
  if (rt.depthBuffer || rt.depthTexture) b += rt.width * rt.height * 4;
  return b * Math.max(1, rt.samples || 1);
}
function texturesOf(material: THREE.Material, out: Set<THREE.Texture>) {
  for (const v of Object.values(material)) if (v && (v as THREE.Texture).isTexture) out.add(v as THREE.Texture);
  const uniforms = (material as THREE.ShaderMaterial).uniforms;
  if (uniforms) for (const u of Object.values(uniforms)) {
    const v = u?.value;
    if (v && (v as THREE.Texture).isTexture) out.add(v as THREE.Texture);
    else if (Array.isArray(v)) for (const x of v) if (x?.isTexture) out.add(x);
  }
}
function geometryBytes(g: THREE.BufferGeometry, seen: Set<ArrayBufferLike | ArrayLike<number>>) {
  let b = 0;
  const add = (a: { array: ArrayLike<number> & { byteLength?: number; buffer?: ArrayBufferLike } } | null | undefined) => {
    if (!a) return;
    const arr = (a as unknown as { data?: { array: ArrayLike<number> } }).data?.array ?? a.array; // interleaved
    if (seen.has(arr)) return;
    seen.add(arr);
    b += (arr as { byteLength?: number }).byteLength ?? 0;
  };
  for (const a of Object.values(g.attributes)) add(a as never);
  for (const list of Object.values(g.morphAttributes)) for (const a of list) add(a as never);
  add(g.index as never);
  return b;
}
const blank = (): Bucket => ({ meshes: 0, instances: 0, triangles: 0, geometries: 0, geometryBytes: 0, textures: 0, textureBytes: 0, cpuBytes: 0 });
const MB = (b: number) => r1(b / 1048576);

function inventory() {
  if (!ctx) return null;
  const { scene, renderer } = ctx;
  const roots = ctx.roots();
  const cats: Record<string, Bucket> = {};
  const geoSeen = new Set<string>();
  const arrSeen = new Set<ArrayBufferLike | ArrayLike<number>>();
  const texOwner = new Map<string, { t: THREE.Texture; cat: string }>();
  const catOf = (o: THREE.Object3D) => {
    for (let p: THREE.Object3D | null = o; p; p = p.parent) {
      const tag = (p.userData?.perf as PerfCategory | undefined) ?? roots.get(p);
      if (tag) return tag;
    }
    return 'other';
  };
  let visibleMeshes = 0;
  scene.traverse(o => {
    const m = o as THREE.Mesh & { isInstancedMesh?: boolean; count?: number; instanceMatrix?: THREE.BufferAttribute; instanceColor?: THREE.BufferAttribute | null; isPoints?: boolean; isLine?: boolean };
    if (!(m.isMesh || m.isPoints || m.isLine) || !m.geometry) return;
    const cat = catOf(o);
    const b = cats[cat] ??= blank();
    b.meshes++;
    let vis = true;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) { vis = false; break; }
    if (vis) visibleMeshes++;
    const g = m.geometry;
    const inst = m.isInstancedMesh ? (m.count ?? 0) : 1;
    b.instances += inst;
    const tris = (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3;
    if (m.isMesh) b.triangles += Math.round(tris * inst);
    if (!geoSeen.has(g.uuid)) {
      geoSeen.add(g.uuid);
      b.geometries++;
      const bytes = geometryBytes(g, arrSeen);
      b.geometryBytes += bytes;
      b.cpuBytes += bytes; // three keeps attribute arrays after upload
    }
    for (const a of [m.instanceMatrix, m.instanceColor]) {
      if (a && !arrSeen.has(a.array)) { arrSeen.add(a.array); b.geometryBytes += a.array.byteLength; b.cpuBytes += a.array.byteLength; }
    }
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const ts = new Set<THREE.Texture>();
    for (const mat of mats) if (mat) texturesOf(mat, ts);
    for (const t of ts) if (!texOwner.has(t.uuid)) texOwner.set(t.uuid, { t, cat });
  });
  const largest: { name: string; cat: string; w: number; h: number; MB: number }[] = [];
  for (const { t, cat } of texOwner.values()) {
    const b = cats[cat] ??= blank();
    const { gpu, cpu } = textureBytes(t);
    b.textures++;
    b.textureBytes += gpu;
    b.cpuBytes += cpu;
    const [w, h] = dims((t as { image?: unknown }).image);
    largest.push({ name: t.name || `${(t as { isCanvasTexture?: boolean }).isCanvasTexture ? 'canvas' : (t as { isDataTexture?: boolean }).isDataTexture ? 'data' : 'texture'}`, cat, w, h, MB: MB(gpu) });
  }
  largest.sort((a, b) => b.MB - a.MB);
  // Post: shadow maps plus every render target the composer and its passes own.
  const post = blank();
  const targets = new Set<THREE.RenderTarget>();
  scene.traverse(o => {
    const map = (o as THREE.DirectionalLight).shadow?.map;
    if (map) targets.add(map);
  });
  const scan = (x: unknown) => {
    if (!x || typeof x !== 'object') return;
    if ((x as THREE.RenderTarget).isRenderTarget) { targets.add(x as THREE.RenderTarget); return; }
    for (const v of Object.values(x as object)) {
      if (v && (v as THREE.RenderTarget).isRenderTarget) targets.add(v as THREE.RenderTarget);
      else if (Array.isArray(v)) for (const e of v) if (e?.isRenderTarget) targets.add(e);
    }
  };
  for (const x of ctx.post()) scan(x);
  for (const rt of targets) { post.textures++; post.textureBytes += targetBytes(rt); }
  cats.post = post;
  const total = blank();
  for (const b of Object.values(cats)) for (const k of Object.keys(total) as (keyof Bucket)[]) total[k] += b[k];
  const fmt = (b: Bucket) => ({ meshes: b.meshes, instances: b.instances, triangles: b.triangles, geometries: b.geometries,
    geometryMB: MB(b.geometryBytes), textures: b.textures, textureMB: MB(b.textureBytes), cpuMB: MB(b.cpuBytes) });
  return {
    categories: Object.fromEntries(Object.entries(cats).map(([k, b]) => [k, fmt(b)])),
    total: fmt(total),
    visibleMeshes,
    largestTextures: largest.slice(0, 8),
    renderTargets: targets.size,
    gl: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 },
  };
}

/** The heaviest meshes by triangles (instances included), with their ancestry, for owners. */
function top(n = 25) {
  if (!ctx) return [];
  const roots = ctx.roots();
  const rows: { tris: number; instances: number; geoMB: number; visible: boolean; cat: string; path: string; material: string }[] = [];
  ctx.scene.traverse(o => {
    const m = o as THREE.Mesh & { isInstancedMesh?: boolean; count?: number };
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    const inst = m.isInstancedMesh ? (m.count ?? 0) : 1;
    const tris = Math.round(((g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3) * inst);
    const names: string[] = [];
    let cat = 'other';
    let visible = true;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) {
      if (!p.visible) visible = false;
      if (p.name) names.push(p.name);
      const tag = (p.userData?.perf as string | undefined) ?? roots.get(p);
      if (tag && cat === 'other') cat = tag;
    }
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    rows.push({ tris, instances: inst, geoMB: MB(Object.values(g.attributes).reduce((s, a) => s + ((a as THREE.BufferAttribute).array?.byteLength ?? 0), 0)),
      visible, cat, path: names.reverse().join(' / ') || '(unnamed)', material: `${mat?.type ?? ''}${mat?.name ? ' ' + mat.name : ''}` });
  });
  return rows.sort((a, b) => b.tris - a.tris).slice(0, n);
}

function rendererInfo() {
  if (!ctx) return null;
  const { renderer } = ctx;
  const gl = renderer.getContext();
  let gpu: string | null = null;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch { /* blocked */ }
  const canvas = renderer.domElement;
  return {
    gpu, pixelRatio: renderer.getPixelRatio(), drawingBuffer: [canvas.width, canvas.height],
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    points: renderer.info.render.points, lines: renderer.info.render.lines,
    programs: renderer.info.programs?.length ?? 0,
    programKinds: (renderer.info.programs ?? []).reduce<Record<string, number>>((o, p) => { const k = (p as { name?: string }).name || '?'; o[k] = (o[k] ?? 0) + 1; return o; }, {}),
    shadowMap: { enabled: renderer.shadowMap.enabled, autoUpdate: renderer.shadowMap.autoUpdate },
  };
}

function device() {
  const n = navigator as Navigator & { deviceMemory?: number };
  return {
    ua: n.userAgent, deviceMemory: n.deviceMemory ?? null, cores: n.hardwareConcurrency ?? null,
    dpr: globalThis.devicePixelRatio, screen: [screen.width, screen.height], viewport: [innerWidth, innerHeight],
    coarse: matchMedia('(pointer: coarse)').matches,
  };
}

function report(withInventory = true) {
  return {
    url: location.href, at: new Date().toISOString(), quality: ctx?.quality ?? null,
    fps1s: frames(1000), fps10s: frames(10000),
    renderer: rendererInfo(), heap: heap(), shadowUpdates,
    areas: ctx?.areas?.() ?? [],
    phases: phases.map(p => ({ ...p })),
    previousRun,
    memory: withInventory ? inventory() : null,
    device: device(),
  };
}

// ---- overlay -----------------------------------------------------------------------------
let overlay: HTMLPreElement | null = null;
let inv: ReturnType<typeof inventory> = null;
let invAt = 0;
function startOverlay() {
  if (overlay || typeof document === 'undefined') return;
  overlay = document.createElement('pre');
  overlay.id = 'perf-overlay';
  overlay.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;margin:0;padding:6px 8px;max-width:calc(100vw - 8px);'
    + 'font:10px/1.3 ui-monospace,Menlo,monospace;color:#e8f0e0;background:rgba(10,14,20,.78);border-radius:6px;'
    + 'pointer-events:auto;white-space:pre-wrap;overflow:auto;max-height:70vh';
  overlay.title = 'Tap to refresh memory';
  overlay.addEventListener('click', () => { invAt = 0; });
  document.body.appendChild(overlay);
  setInterval(paintOverlay, 500);
}
function paintOverlay() {
  if (!overlay) return;
  if (lastResult) return;
  const now = performance.now();
  if (ctx && now - invAt > 15000) { inv = inventory(); invAt = now; }
  const a = frames(1000), b = frames(10000);
  const r = rendererInfo();
  const h = heap();
  const lines = [
    `fps ${a.fps} (10s ${b.fps})  frame p50 ${b.p50} p95 ${b.p95} max ${b.max} ms`,
    `cpu update ${b.updateP50}  render ${b.renderP50}/${b.renderP95} ms  shadow upd ${shadowUpdates}`,
    r ? `calls ${r.calls}  tris ${(r.triangles / 1000).toFixed(0)}k  progs ${r.programs}  pr ${r.pixelRatio}  ${r.drawingBuffer.join('x')}` : 'renderer —',
    `heap ${h ? `${h.usedMB}/${h.limitMB} MB` : 'n/a'}  q ${ctx?.quality ?? '—'}`,
  ];
  if (inv) {
    lines.push(`gl geo ${inv.gl.geometries} tex ${inv.gl.textures}  vis meshes ${inv.visibleMeshes}`);
    for (const [k, c] of Object.entries(inv.categories)) lines.push(`${k.padEnd(9)} tex ${String(c.textureMB).padStart(6)}  geo ${String(c.geometryMB).padStart(6)}  tri ${(c.triangles / 1000).toFixed(0).padStart(5)}k`);
    lines.push(`${'total'.padEnd(9)} tex ${String(inv.total.textureMB).padStart(6)}  geo ${String(inv.total.geometryMB).padStart(6)}  cpu ${inv.total.cpuMB} MB`);
  }
  const last = phases[phases.length - 1];
  if (last) lines.push(`phase ${last.name} @${(last.ms / 1000).toFixed(1)}s` + (phases.find(p => p.name === 'ready') ? `  ready @${(phases.find(p => p.name === 'ready')!.ms / 1000).toFixed(1)}s` : ''));
  if (previousRun && !previousRun.completed) lines.push(`prev run died after ${previousRun.lastPhase} @${((previousRun.lastMs ?? 0) / 1000).toFixed(1)}s heap ${previousRun.peakHeapMB} MB`);
  overlay.textContent = lines.join('\n');
}

// ---- ?perf=run ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function run({ quietMs = 5000, maxWaitMs = 60000, sampleMs = 10000 } = {}) {
  const t0 = performance.now();
  while (!phases.some(p => p.name === 'ready') && performance.now() - t0 < 180000) await sleep(250);
  // Areas mount as the camera approaches: wait until no phase has landed for quietMs.
  const settleStart = performance.now();
  while (performance.now() - settleStart < maxWaitMs) {
    const last = phases[phases.length - 1]?.ms ?? 0;
    if (performance.now() - last > quietMs) break;
    await sleep(250);
  }
  const shadowBefore = shadowUpdates;
  const motion = params.get('motion');
  let turning = motion === 'orbit' || motion === 'pan';
  if (turning) {
    const t0 = performance.now();
    let last = t0;
    let x = 0;
    const turn = (now: number) => {
      if (!turning) return;
      if (motion === 'orbit') ctx?.rotate?.(((now - last) / 1000) * 12);
      else {
        const next = 150 * Math.sin(((now - t0) / 4000) * 2 * Math.PI);
        ctx?.pan?.(next - x, 0);
        x = next;
      }
      last = now;
      requestAnimationFrame(turn);
    };
    requestAnimationFrame(turn);
  }
  await sleep(sampleMs);
  turning = false;
  const full = report(true);
  const f = frames(sampleMs);
  const at = (n: string) => phases.find(p => p.name === n)?.ms ?? null;
  // A flat summary first, so a truncated or field-picked copy still carries the essentials.
  const summary = {
    quality: full.quality, fps: f.fps, p50: f.p50, p95: f.p95, max: f.max, updateP50: f.updateP50, renderP50: f.renderP50,
    // Median over the sample: one frame's count depends on whether it redrew the shadow map.
    calls: full.renderer?.calls ?? null, triangles: f.trianglesP50 || (full.renderer?.triangles ?? null), trianglesMax: f.trianglesMax,
    lastFrameTriangles: full.renderer?.triangles ?? null, programs: full.renderer?.programs ?? null,
    pixelRatio: full.renderer?.pixelRatio ?? null, drawingBuffer: full.renderer?.drawingBuffer ?? null,
    heapMB: full.heap?.usedMB ?? null, textureMB: full.memory?.total.textureMB ?? null, geometryMB: full.memory?.total.geometryMB ?? null,
    cpuMB: full.memory?.total.cpuMB ?? null, shadowUpdatesInSample: shadowUpdates - shadowBefore,
    dataMs: at('city:data'), rendererMs: at('city:renderer'), firstFrameMs: at('city:first-frame'), readyMs: at('ready'),
    lastAreaMs: [...phases].reverse().find(p => p.name.startsWith('area:'))?.ms ?? null, areas: full.areas.length,
    motion: params.get('motion') ?? 'static',
  };
  const r = { summary, ...full, fps10s: f, sampleMs, shadowUpdatesInSample: summary.shadowUpdatesInSample };
  lastResult = r;
  const line = 'PERF_RESULT ' + JSON.stringify(r);
  console.info(line);
  try { localStorage.setItem('perf-result', JSON.stringify(r)); } catch { /* private mode */ }
  saveTrail(true);
  if (overlay) {
    const m = r.memory;
    overlay.style.background = 'rgba(10,40,20,.88)';
    overlay.textContent = [
      `PERF_RESULT q=${r.quality}  ${r.fps10s.fps} fps (10 s)  p50 ${r.fps10s.p50} p95 ${r.fps10s.p95} ms`,
      `cpu update ${r.fps10s.updateP50} render ${r.fps10s.renderP50} ms  calls ${r.renderer?.calls} tris ${((r.renderer?.triangles ?? 0) / 1000).toFixed(0)}k progs ${r.renderer?.programs}`,
      `heap ${r.heap?.usedMB ?? 'n/a'} MB  tex ${m?.total.textureMB} MB  geo ${m?.total.geometryMB} MB  shadow upd ${r.shadowUpdatesInSample}`,
      `ready ${((phases.find(p => p.name === 'ready')?.ms ?? 0) / 1000).toFixed(1)} s  areas ${r.areas.join(',') || '—'}`,
    ].join('\n');
  }
  document.title = 'PERF_DONE';
  return r;
}

/** Apply &hide (cheap enough to repeat as areas mount; only runs under ?perf with &hide). */
function applyHide() {
  if (!ctx || !perfOverrides.hide.size) return;
  const roots = ctx.roots();
  const hide = perfOverrides.hide;
  ctx.scene.traverse(o => {
    let cat: string | undefined;
    for (let p: THREE.Object3D | null = o; p && !cat; p = p.parent) cat = (p.userData?.perf as string | undefined) ?? roots.get(p);
    const tree = cat === 'scenery' && (o as THREE.InstancedMesh).isInstancedMesh;
    if ((cat && hide.has(cat) && (o as THREE.Mesh).isMesh) || (tree && hide.has('trees'))) o.visible = false;
  });
}

let hiddenAt = -1;
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = performance.now(); });
/**
 * Runtime fallback: once the City open that follows this call is ready and its areas have gone
 * quiet, sample `sampleMs` of frames and call `onSlow(fps)` if the rate is under `belowFps`.
 * A sample the page spent hidden is discarded. Returns a cancel function.
 */
function watchSlow(onSlow: (fps: number) => void, { belowFps = 20, sampleMs = 10000, quietMs = 5000 } = {}) {
  let stopped = false;
  const from = phases.length;
  void (async () => {
    while (!stopped && !phases.slice(from).some(p => p.name === 'ready')) await sleep(500);
    while (!stopped && performance.now() - (phases[phases.length - 1]?.ms ?? 0) < quietMs) await sleep(500);
    if (stopped) return;
    const start = performance.now();
    await sleep(sampleMs);
    if (stopped || document.hidden || hiddenAt >= start) return;
    const f = frames(sampleMs);
    if (f.frames > 2 && f.fps < belowFps) onSlow(f.fps);
  })();
  return () => { stopped = true; };
}

/** Wire the renderer and scene (call once City has a renderer). */
function attach(c: PerfContext) {
  ctx = c;
  if (perfEnabled) startOverlay();
}
function detach() { ctx = null; }

export const perf = {
  enabled: perfEnabled, phase, frame, attach, detach, report, inventory, run, top, applyHide, watchSlow,
  fps: frames,
  shadowUpdate() { shadowUpdates++; },
  get phases() { return phases.map(p => ({ ...p })); },
  get result() { return lastResult; },
};

Object.assign(globalThis, { __perf: perf });
phase('boot');
if (perfEnabled && mode === 'run') void run();
