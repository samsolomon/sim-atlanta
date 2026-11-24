import {
  Box3, BufferAttribute, BufferGeometry, type Color, DoubleSide, Float32BufferAttribute, Group, type InterleavedBufferAttribute,
  LOD, Material, Matrix4, Mesh, MeshLambertMaterial, type Object3D, type Camera, Sphere, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { farTriangles } from './landmark-lod';
import LodWorker from './landmark-lod.worker?worker';

/** For opaque, static landmark bodies with baked vertex colours and no per-building uniforms. */
export class StaticLandmarkMaterial extends MeshLambertMaterial {
  constructor() { super({ vertexColors: true, side: DoubleSide }); }
}

/** Batches are local to a 500 m cell, so close views still frustum-cull them. */
export const CELL_M = 500;

/**
 * A landmark as the batcher sees it: its root group and, when it has one, the night switch City
 * calls every frame. A landmark listed without `setNight` has no night behaviour; one that is not
 * listed at all is never batched.
 */
export interface LandmarkEntry { group: Object3D; setNight?(night: number): void }

const EMPTY = new BufferGeometry();
/** Probe values: each mesh's look is sampled at these night factors before merging. */
const PROBES = [1, 0.5, 0];

const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (o: object | null | undefined) => {
  if (!o) return 0;
  let id = ids.get(o);
  if (!id) ids.set(o, id = nextId++);
  return id;
};

type Mat = Material & {
  color?: Color; emissive?: Color; emissiveIntensity?: number; map?: { uuid: string } | null; vertexColors: boolean;
  specular?: Color; shininess?: number; defines?: Record<string, unknown>; flatShading?: boolean; fog?: boolean; wireframe?: boolean;
};
const TEXTURE_SLOTS = ['lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap', 'displacementMap', 'specularMap', 'alphaMap', 'envMap'] as const;

/** Why a mesh cannot share a draw with another, or null. Static: none of this changes at night. */
function excluded(mesh: Mesh, root: Object3D): string | null {
  const m = mesh as Mesh & { isInstancedMesh?: boolean; isSkinnedMesh?: boolean };
  if (m.isInstancedMesh || m.isSkinnedMesh) return 'instanced';
  if (Array.isArray(mesh.material)) return 'multi-material';
  const mat = mesh.material as Mat;
  if (mat.onBeforeCompile !== Material.prototype.onBeforeCompile) return 'hooked';
  if (mat.customProgramCacheKey !== Material.prototype.customProgramCacheKey) return 'hooked';
  if (mat.transparent || mat.alphaTest > 0 || !mat.depthWrite || !mat.depthTest || !mat.colorWrite) return 'transparent';
  if (TEXTURE_SLOTS.some(k => (mat as unknown as Record<string, unknown>)[k])) return 'texture';
  const g = mesh.geometry;
  const position = g.getAttribute('position');
  if (!position?.count) return 'empty';
  if (mat.vertexColors && !g.getAttribute('color')) return 'no vertex colours';
  if (Object.values(g.attributes).some(a => (a as InterleavedBufferAttribute).isInterleavedBufferAttribute)) return 'interleaved';
  if (g.morphAttributes && Object.keys(g.morphAttributes).length) return 'morph';
  // Groups only matter to an array of materials, which is excluded above.
  if (g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return 'draw range';
  if (!mesh.frustumCulled || mesh.customDepthMaterial || mesh.customDistanceMaterial) return 'custom draw';
  if (mesh.onBeforeRender !== Mesh.prototype.onBeforeRender || mesh.onAfterRender !== Mesh.prototype.onAfterRender) return 'custom draw';
  if (mesh.matrixWorld.determinant() === 0) return 'degenerate';
  for (let p: Object3D | null = mesh; p && p !== root.parent; p = p.parent) {
    if (p.userData.dynamic) return 'dynamic';
    if ((p as Object3D & { isLOD?: boolean }).isLOD) return 'lod';
  }
  return null;
}

const hex = (c: Color) => c.getHexString();
const effectiveEmissive = (mat: Mat) => {
  if (!mat.emissive || !mat.emissiveIntensity) return '0';
  const { r, g, b } = mat.emissive, k = mat.emissiveIntensity;
  return r * k + g * k + b * k === 0 ? '0' : `${(r * k).toFixed(4)},${(g * k).toFixed(4)},${(b * k).toFixed(4)}`;
};
/** How a material looks now (colour, emitted light, opacity). `white` drops a colour baked into the vertices. */
const lookOf = (mat: Mat, white: boolean) => `${white || !mat.color ? 'ffffff' : hex(mat.color)}/${effectiveEmissive(mat)}/${mat.opacity}`;

/** Whether the mesh is drawn, opaque, at the current night factor. */
function shown(mesh: Mesh, root: Object3D) {
  for (let p: Object3D | null = mesh; p && p !== root.parent; p = p.parent) if (!p.visible) return false;
  const mat = mesh.material as Mat;
  return mat.visible && !mat.transparent;
}

/** The attributes a built-in material reads; the rest are dropped before merging. */
function normalized(mesh: Mesh, bake: Color | null, matrix: Matrix4) {
  const mat = mesh.material as Mat;
  let src = mesh.geometry;
  if (src.index) src = src.toNonIndexed();
  const g = new BufferGeometry();
  const keep = ['position', 'normal', ...(mat.map ? ['uv'] : [])];
  for (const n of keep) {
    const a = src.getAttribute(n) as BufferAttribute | undefined;
    if (a) g.setAttribute(n, new Float32BufferAttribute(toFloat(a), a.itemSize));
  }
  // Colours as normalised bytes: a quarter of float storage, same program; landmark colours
  // never exceed 1.
  const vc = src.getAttribute('color') as BufferAttribute | undefined;
  const byte = (v: number) => compactColoursOff ? v : Math.round(Math.min(1, Math.max(0, v)) * 255);
  const array = (n: number) => compactColoursOff ? new Float32Array(n) : new Uint8Array(n);
  if (mat.vertexColors && vc) {
    const out = array(vc.count * vc.itemSize), div = vc.normalized ? normScale(vc.array) : 1;
    for (let i = 0; i < vc.count; i++) for (let c = 0; c < vc.itemSize; c++) {
      const v = vc.array[i * vc.itemSize + c] / div;
      out[i * vc.itemSize + c] = byte(bake && c < 3 ? v * [bake.r, bake.g, bake.b][c] : v);
    }
    g.setAttribute('color', new BufferAttribute(out, vc.itemSize, !compactColoursOff));
  } else if (bake) {
    const n = g.getAttribute('position').count, out = array(n * 3);
    for (let i = 0; i < n; i++) { out[i * 3] = byte(bake.r); out[i * 3 + 1] = byte(bake.g); out[i * 3 + 2] = byte(bake.b); }
    g.setAttribute('color', new BufferAttribute(out, 3, !compactColoursOff));
  }
  if (src !== mesh.geometry) src.dispose();
  g.applyMatrix4(matrix);
  // A mirroring transform flips the winding. three corrects that per object at draw time; a baked
  // batch cannot, so reverse each triangle here instead.
  if (matrix.determinant() < 0) {
    for (const a of Object.values(g.attributes) as BufferAttribute[]) {
      const k = a.itemSize, arr = a.array;
      for (let t = 0; t + 2 < a.count; t += 3) for (let c = 0; c < k; c++) {
        const i = (t + 1) * k + c, j = (t + 2) * k + c, v = arr[i];
        arr[i] = arr[j]; arr[j] = v;
      }
    }
  }
  return g;
}
function toFloat(a: BufferAttribute) {
  const n = a.count * a.itemSize;
  if (a.array instanceof Float32Array && !a.normalized) return a.array.slice(0, n);
  const out = new Float32Array(n), div = a.normalized ? normScale(a.array) : 1;
  for (let i = 0; i < n; i++) out[i] = a.array[i] / div;
  return out;
}
function normScale(a: ArrayLike<number>) {
  return a instanceof Uint8Array ? 255 : a instanceof Uint16Array ? 65535 : a instanceof Int8Array ? 127 : a instanceof Int16Array ? 32767 : 1;
}
/** Which normalized attributes a mesh will carry, for the class key. */
function attributeKey(mesh: Mesh, baked: boolean) {
  const mat = mesh.material as Mat, g = mesh.geometry;
  const vc = g.getAttribute('color');
  const color = mat.vertexColors && vc ? `color${vc.itemSize}` : baked ? 'color3' : mat.vertexColors ? 'nocolor' : '';
  return `${g.getAttribute('normal') ? 'n' : ''}${mat.map && g.getAttribute('uv') ? 'uv' : ''}${color}`;
}

/** What decides the program and its fixed uniforms, plus how the mesh is drawn. */
function classKey(mesh: Mesh, baked: boolean) {
  const mat = mesh.material as Mat;
  return [
    mat.type, mat.side, mat.vertexColors || baked ? 1 : 0, mat.flatShading ? 1 : 0, mat.fog ? 1 : 0, mat.wireframe ? 1 : 0,
    mat.map ? mat.map.uuid : '', mat.blending, mat.toneMapped ? 1 : 0, mat.dithering ? 1 : 0, mat.premultipliedAlpha ? 1 : 0,
    mat.polygonOffset ? `${mat.polygonOffsetFactor}/${mat.polygonOffsetUnits}` : '',
    idOf(mat.clippingPlanes), mat.clipShadows ? 1 : 0, mat.clipIntersection ? 1 : 0, mat.shadowSide ?? '',
    mat.specular ? hex(mat.specular) : '', mat.shininess ?? '', JSON.stringify(mat.defines ?? {}),
    mesh.castShadow ? 1 : 0, mesh.receiveShadow ? 1 : 0, mesh.renderOrder, mesh.layers.mask,
    attributeKey(mesh, baked),
  ].join('|');
}

/** Mirror each source's night state onto its batch: call after the landmarks' setNight. */
function syncer(days: DayGroup[]) {
  return () => {
    for (const d of days) {
      let alike = true;
      for (const r of d.runs) {
        const { source: s, material: t } = r;
        if (!r.baked && s.color) t.color!.copy(s.color);
        if (t.emissive && s.emissive) t.emissive.copy(s.emissive);
        if (s.emissiveIntensity !== undefined) t.emissiveIntensity = s.emissiveIntensity;
        t.opacity = s.opacity;
        if (alike && lookOf(r.source, r.baked) !== d.look) alike = false;
      }
      d.alike = alike;
      show(d);
    }
  };
}

/** Distance LOD per cell: far beyond `farM` from the cell's box, full again inside `nearM`. */
export interface LandmarkLod { farM: number; nearM: number; minArea: number }
/**
 * Past where a 1.5 m pane is about a pixel through City's 22° lens (d = 1.5 m x buffer height /
 * (2 tan 11°)): 2.7 km for the A16's 692 px buffer, with a margin on low, and 6.9 km for a
 * 1,800 px desktop buffer on high. Nearer than that a flat wall cannot stand in for a resolved
 * window grid.
 */
export const LANDMARK_LOD = {
  low: { farM: 3500, nearM: 3100, minArea: 4 },
  high: { farM: 7000, nearM: 6300, minArea: 4 },
} satisfies Record<string, LandmarkLod>;
export type CellDetail = 'full' | 'lod';
const cameraAt = new Vector3();

/**
 * One 500 m cell of batches. A LOD only so the renderer updates it, before its meshes, in the same
 * pass. Each group of runs that currently look alike draws its far version (facade detail baked
 * into the walls) while the camera is beyond `farM` from the cell, and its full version again
 * inside `nearM`. Groups whose runs differ (lit windows at night) draw in full.
 */
export class LandmarkCell extends LOD {
  readonly box = new Box3();
  readonly groups: DayGroup[] = [];
  /** Set by setCellDetail (streaming rings); null follows the distance rule. */
  detail: CellDetail | null = null;
  private showingFar = false;
  private readonly inv = new Matrix4();
  constructor(readonly cell: [number, number], readonly lod: LandmarkLod | null) {
    super();
    this.name = `landmark cell ${cell}`;
    this.userData.cell = cell;
    this.autoUpdate = true;
  }
  get isFar() { return this.showingFar; }
  override update(camera: Camera) {
    if (!this.lod || !this.groups.some(g => g.far)) return;
    let far = this.detail === 'lod';
    if (!this.detail) {
      // The box is in the batch container's frame, which the cell's parent shares.
      this.inv.copy((this.parent ?? this).matrixWorld).invert();
      const d = this.box.distanceToPoint(camera.getWorldPosition(cameraAt).applyMatrix4(this.inv));
      far = this.showingFar ? d > this.lod.nearM : d > this.lod.farM;
    }
    if (far === this.showingFar) return;
    this.showingFar = far;
    for (const g of this.groups) show(g);
  }
}

/**
 * While its cell is far, a group's full version still casts the shadows (so they keep their
 * detail, and the far version needs no shadow-depth programs of its own) but draws nothing in the
 * view: three calls onBeforeRender for view draws, not shadow draws, and skips a negative range.
 */
function hideFromView(this: Mesh) { (this.userData as { range?: number }).range = this.geometry.drawRange.count; this.geometry.drawRange.count = -1; }
function restoreRange(this: Mesh) { this.geometry.drawRange.count = (this.userData as { range: number }).range; }

/** Which of a group's draws show, from its night state (`alike`) and its cell's distance. */
function show(d: DayGroup) {
  const far = !!d.far && d.alike && d.cell.isFar;
  if (d.far) d.far.visible = far;
  if (d.mesh) {
    d.mesh.visible = d.alike;
    for (const r of d.runs) r.mesh.visible = !d.alike;
  }
  if (!d.far) return;
  const full = d.mesh ?? d.runs[0].mesh;
  full.onBeforeRender = far ? hideFromView : Mesh.prototype.onBeforeRender;
  full.onAfterRender = far ? restoreRange : Mesh.prototype.onAfterRender;
}

interface FarJob { group: DayGroup; geometry: BufferGeometry; meshes: Mesh[]; start: number; count: number; material: Mat; rep: Mesh }
type FarResult = { kept: Uint32Array | null; walls?: Uint32Array; colors?: Float32Array; dropped?: number };

let worker: Worker | null = null;
let nextJob = 1;
const pending = new Map<number, (r: FarResult) => void>();
function runFar(P: Float32Array, C: Float32Array, k: number, minArea: number, sync: boolean): Promise<FarResult> {
  if (sync || typeof Worker === 'undefined') {
    const far = farTriangles(P, C, k, 0, P.length / 9, minArea);
    if (!far) return Promise.resolve({ kept: null });
    const colors = new Float32Array(far.walls.length * 3 * k);
    far.walls.forEach((w, i) => colors.set(w.color, i * 3 * k));
    return Promise.resolve({ kept: Uint32Array.from(far.kept), walls: Uint32Array.from(far.walls, w => w.t), colors, dropped: far.dropped });
  }
  if (!worker) {
    worker = new LodWorker();
    worker.onmessage = (e: MessageEvent<FarResult & { id: number }>) => { pending.get(e.data.id)?.(e.data); pending.delete(e.data.id); };
  }
  const id = nextJob++;
  return new Promise(resolve => { pending.set(id, resolve); worker!.postMessage({ id, P, C, k, minArea }, [P.buffer, C.buffer]); });
}

/**
 * Builds each group's far version off the main thread. When a class's results are in, its buffer
 * is rebuilt once with the blended walls appended, every mesh of the class moves to it, and each
 * far version draws as one index into it (the walls it blends, then the triangles it keeps).
 * Until then the cell draws in full.
 */
async function buildFar(jobs: FarJob[], minArea: number, stats: BatchStats, sync: boolean) {
  const byClass = new Map<BufferGeometry, FarJob[]>();
  for (const j of jobs) (byClass.get(j.geometry) ?? byClass.set(j.geometry, []).get(j.geometry)!).push(j);
  for (const [g, list] of byClass) {
    const pos = g.getAttribute('position') as BufferAttribute, col = g.getAttribute('color') as BufferAttribute;
    const k = col.itemSize;
    const t0 = performance.now();
    const results = await Promise.all(list.map(({ start, count }) => runFar(
      (pos.array as Float32Array).slice(start * 3, (start + count) * 3),
      Float32Array.from((col.array as Uint8Array).subarray(start * k, (start + count) * k)), k, minArea, sync)));
    stats.lodMs += performance.now() - t0;
    const extra = results.reduce((n, r) => n + (r.walls?.length ?? 0), 0) * 3;
    if (!extra) continue;
    // The class's buffer, grown by the blended walls.
    const total = pos.count;
    const grown: Record<string, BufferAttribute> = {};
    for (const [name, a] of Object.entries(g.attributes) as [string, BufferAttribute][]) {
      const it = a.itemSize, src = a.array as Float32Array | Uint8Array;
      const dst = new (src.constructor as Float32ArrayConstructor | Uint8ArrayConstructor)((total + extra) * it);
      dst.set(src);
      let at = total * it;
      list.forEach((job, j) => {
        const r = results[j], base = job.start / 3;
        if (!r.walls) return;
        // Blended colours come back in the buffer's own units (bytes, here).
        if (name === 'color') { for (const v of r.colors!) dst[at++] = a.normalized ? Math.round(v) : v; return; }
        for (const t of r.walls) { dst.set(src.subarray((base + t) * 3 * it, (base + t + 1) * 3 * it), at); at += 3 * it; }
      });
      grown[name] = new BufferAttribute(dst, it, a.normalized);
    }
    for (const m of list[0].meshes) {
      const old = m.geometry, next = new BufferGeometry();
      for (const [name, a] of Object.entries(grown)) next.setAttribute(name, a);
      if (old.index) next.setIndex(old.index);
      next.setDrawRange(old.drawRange.start, old.drawRange.count);
      next.boundingBox = old.boundingBox;
      next.boundingSphere = old.boundingSphere;
      m.geometry = next;
      old.dispose();
    }
    let slot = total;
    list.forEach((job, j) => {
      const r = results[j];
      if (!r.kept || !r.walls) return;
      stats.lodDropped += r.dropped ?? 0;
      stats.lodDoubled += r.walls.length;
      const base = job.start / 3;
      const index = new Uint32Array((r.walls.length + r.kept.length) * 3);
      let i = 0;
      for (let w = 0; w < r.walls.length * 3; w++) index[i++] = slot++;
      for (const t of r.kept) { index[i++] = (base + t) * 3; index[i++] = (base + t) * 3 + 1; index[i++] = (base + t) * 3 + 2; }
      const fg = new BufferGeometry();
      for (const [name, a] of Object.entries(grown)) fg.setAttribute(name, a);
      fg.setIndex(new BufferAttribute(index, 1));
      const b = new Box3(), v = new Vector3(), p = grown.position;
      for (let n = 0; n < index.length; n++) b.expandByPoint(v.fromBufferAttribute(p, index[n]));
      fg.boundingBox = b;
      fg.boundingSphere = b.getBoundingSphere(new Sphere());
      const far = new Mesh(fg, job.material);
      far.name = 'landmark batch (far)';
      // The full version keeps casting (see hideFromView).
      far.castShadow = false;
      far.receiveShadow = job.rep.receiveShadow;
      far.renderOrder = job.rep.renderOrder;
      far.layers.mask = job.rep.layers.mask;
      far.visible = false;
      job.group.cell.add(far);
      job.group.far = far;
      stats.draws++;
      show(job.group);
    });
  }
  stats.lodMs = Math.round(stats.lodMs);
}

export interface BatchStats {
  candidates: number; merged: number; draws: number; dayDraws: number; nightDraws: number; skipped: Record<string, number>; ms: number;
  /** Triangles the far version drops, and wall triangles it stores twice. */
  lodDropped: number; lodDoubled: number; lodMs: number;
}

interface Member { mesh: Mesh; bake: Color | null; day: string; run: string }
/** Meshes that look alike at every probe: drawn as one range with one material. */
/** `source` is the landmark's own material, which its setNight drives; `material` draws, synced from it. */
interface Run { source: Mat; material: Mat; baked: boolean; mesh: Mesh }
interface DayGroup { look: string; runs: Run[]; mesh: Mesh | null; far: Mesh | null; cell: LandmarkCell; alike: boolean }

/**
 * Merges static landmark meshes into one buffer per 500 m cell and material class, baked relative
 * to `container` (which the returned group must be added to).
 *
 * Each listed landmark's `setNight` is probed at full, half and no night first. Meshes that look
 * alike at every probe form a run, drawn as one range of the cell's buffer with one material.
 * Runs that also look alike now (by day, lit windows and lamps look like the wall around them) are
 * drawn together as one range instead: `sync()`, called after the landmarks' setNight each frame,
 * picks whichever applies. The ranges share the same vertex buffers, so nothing is stored twice.
 * A constant material colour is baked into the vertex colours, so differently tinted parts share a
 * draw. Meshes that hide or turn see-through at any probe stay as they were. Every probed landmark
 * is left at night 0; City sets the real value on its next frame. Run before City applies board
 * clipping.
 */
/** `syncFar` builds far versions on the main thread, without a worker (tests). */
export interface LandmarkBatchOptions { cellM?: number; name?: string; lod?: LandmarkLod | null; syncFar?: boolean }
export interface LandmarkBatches {
  group: Group; stats: BatchStats; cells: Map<string, LandmarkCell>;
  /** Mirror each landmark's night state onto its batch: call after their setNight. */
  sync(): void;
  setCellDetail(cell: string, level: CellDetail | null): void;
  /** Resolves once every far version is in (they are built off the main thread). */
  farReady: Promise<void>;
}

/** batchLandmarks, all at once. */
export function batchLandmarks(entries: readonly LandmarkEntry[], container: Object3D, o: LandmarkBatchOptions = {}): LandmarkBatches {
  const build = buildLandmarkBatches(entries, container, o);
  for (let step = build.next(); ; step = build.next()) if (step.done) return step.value;
}

/**
 * batchLandmarks as a sliced build step: yields a label after each landmark's probe and after each
 * cell class is merged, so an area build can spread it over frames. Nothing is shared across a
 * yield, so the result does not depend on where it pauses. `stats.ms` is then wall time.
 */
export function* buildLandmarkBatches(entries: readonly LandmarkEntry[], container: Object3D,
  o: LandmarkBatchOptions = {}): Generator<string | void, LandmarkBatches, void> {
  const lod = landmarkLodOff ? null : o.lod ?? null;
  const t0 = performance.now();
  const cellM = o.cellM ?? CELL_M;
  const stats: BatchStats = { candidates: 0, merged: 0, draws: 0, dayDraws: 0, nightDraws: 0, skipped: {}, ms: 0, lodDropped: 0, lodDoubled: 0, lodMs: 0 };
  const skip = (why: string, n = 1) => { stats.skipped[why] = (stats.skipped[why] ?? 0) + n; };
  container.updateMatrixWorld(true);
  const toContainer = new Matrix4().copy(container.matrixWorld).invert();

  // Who uses each geometry and material, so nothing still drawn is disposed.
  const users = new Map<object, number>();
  const use = (x: object) => users.set(x, (users.get(x) ?? 0) + 1);
  container.traverse(x => {
    const mesh = x as Mesh;
    if (!mesh.isMesh) return;
    use(mesh.geometry);
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) use(m);
  });

  const box = new Box3(), center = new Vector3();
  const classes = new Map<string, { cell: [number, number]; members: Member[] }>();
  for (const entry of entries) {
    const root = entry.group;
    root.updateMatrixWorld(true);
    const mine: Mesh[] = [];
    root.traverse(x => {
      const mesh = x as Mesh;
      if (!mesh.isMesh) return;
      const why = excluded(mesh, root);
      if (why) skip(why);
      else mine.push(mesh);
    });
    if (!mine.length) continue;
    const seen = mine.map(() => ({ shown: true, colors: new Set<string>(), looks: [] as string[] }));
    const sample = () => mine.forEach((mesh, i) => {
      const mat = mesh.material as Mat;
      seen[i].shown &&= shown(mesh, root);
      seen[i].colors.add(mat.color ? hex(mat.color) : '');
      seen[i].looks.push(`${mat.color ? hex(mat.color) : ''}/${effectiveEmissive(mat)}/${mat.opacity}`);
    });
    if (entry.setNight) for (const n of PROBES) { entry.setNight(n); sample(); }
    else sample();
    root.updateMatrixWorld(true);
    mine.forEach((mesh, i) => {
      if (!seen[i].shown) return skip('changes visibility');
      const mat = mesh.material as Mat;
      // A colour that never changes moves into the vertices; one that does stays on the material.
      const bake = mat.color && seen[i].colors.size === 1 ? mat.color.clone() : null;
      const looks = bake ? seen[i].looks.map(l => 'ffffff' + l.slice(l.indexOf('/'))) : seen[i].looks;
      const g = mesh.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      box.copy(g.boundingBox!).applyMatrix4(mesh.matrixWorld).getCenter(center);
      const cell: [number, number] = [Math.floor(center.x / cellM), Math.floor(center.z / cellM)];
      const k = `${cell}#${classKey(mesh, !!bake)}`;
      (classes.get(k) ?? classes.set(k, { cell, members: [] }).get(k)!).members.push(
        { mesh, bake, day: looks[looks.length - 1], run: looks.join(';') });
      stats.candidates++;
    });
    yield 'landmark probe';
  }

  const group = new Group();
  group.name = o.name ?? 'Landmark batches';
  group.userData.perf = 'buildings';
  group.userData.building = true;
  const cells = new Map<string, LandmarkCell>();
  const days: DayGroup[] = [];
  const farJobs: FarJob[] = [];
  const m = new Matrix4();
  // three draws opaque meshes in material-id order, which settles coplanar ties (a pane 7 cm
  // off its wall, far away). Batch materials are new, so make them in their sources' order.
  const minId = (c: { members: Member[] }) => Math.min(...c.members.map(mb => (mb.mesh.material as unknown as { id: number }).id));
  const ordered = [...classes.values()].sort((a, b) => minId(a) - minId(b));
  for (const { cell, members } of ordered) {
    if (members.length < 2) { skip('alone in its cell'); continue; }
    members.sort((a, b) => a.day < b.day ? -1 : a.day > b.day ? 1 : a.run < b.run ? -1 : a.run > b.run ? 1 : 0);
    const parts = members.map(mb => normalized(mb.mesh, mb.bake, m.multiplyMatrices(toContainer, mb.mesh.matrixWorld)));
    const merged = mergeGeometries(parts);
    if (!merged) throw new Error(`landmark batch: could not merge ${members.length} meshes in cell ${cell}`);
    const counts = parts.map(p => p.getAttribute('position').count);
    for (const part of parts) part.dispose();
    // Day groups as vertex ranges, and (by day, from afar) their far versions.
    const ranges: { from: number; to: number; start: number; count: number }[] = [];
    for (let i = 0, start = 0; i < members.length;) {
      const from = i, s0 = start;
      while (i < members.length && members[i].day === members[from].day) start += counts[i++];
      ranges.push({ from, to: i, start: s0, count: start - s0 });
    }
    const lodable = !!lod && !!merged.getAttribute('color') && !merged.getAttribute('uv');
    const ck = `${cell}`;
    let cellGroup = cells.get(ck);
    if (!cellGroup) {
      cellGroup = new LandmarkCell(cell, lod);
      cells.set(ck, cellGroup);
      group.add(cellGroup);
    }
    const rep = members[0].mesh;
    const geo = merged;
    const classMeshes: Mesh[] = [];
    const draw = (start: number, count: number, material: Mat, name: string, index?: Uint32Array) => {
      const g = new BufferGeometry();
      for (const [n, a] of Object.entries(geo.attributes)) g.setAttribute(n, a);
      if (index) g.setIndex(new BufferAttribute(index, 1));
      else g.setDrawRange(start, count);
      const pos = geo.getAttribute('position') as BufferAttribute;
      const b = new Box3(), v = new Vector3();
      if (index) for (let i = 0; i < index.length; i++) b.expandByPoint(v.fromBufferAttribute(pos, index[i]));
      else for (let i = start; i < start + count; i++) b.expandByPoint(v.fromBufferAttribute(pos, i));
      g.boundingBox = b;
      g.boundingSphere = b.getBoundingSphere(new Sphere());
      cellGroup!.box.union(b);
      const mesh = new Mesh(g, material);
      mesh.name = name;
      mesh.castShadow = rep.castShadow;
      mesh.receiveShadow = rep.receiveShadow;
      mesh.renderOrder = rep.renderOrder;
      mesh.layers.mask = rep.layers.mask;
      cellGroup!.add(mesh);
      classMeshes.push(mesh);
      stats.draws++;
      return mesh;
    };
    for (const range of ranges) {
      const dayGroup: DayGroup = { look: members[range.from].day, runs: [], mesh: null, far: null, cell: cellGroup, alike: true };
      let i = range.from, start = range.start;
      while (i < range.to) {
        const first = members[i], runStart = start;
        while (i < range.to && members[i].run === first.run) start += counts[i++];
        const source = first.mesh.material as Mat;
        const material = source.clone() as Mat;
        if (first.bake) {
          material.color!.set(0xffffff);
          material.vertexColors = true;
        }
        dayGroup.runs.push({ source, material, baked: !!first.bake, mesh: draw(runStart, start - runStart, material, 'landmark batch') });
      }
      // By day the runs look alike: one draw with a still copy of that look.
      let dayMaterial = dayGroup.runs[0].material;
      if (dayGroup.runs.length > 1) {
        const material = dayGroup.runs[0].material.clone() as Mat;
        const [color, emissive, opacity] = dayGroup.look.split('/');
        material.color?.set(`#${color}`);
        if (material.emissive) {
          if (emissive === '0') material.emissive.set(0);
          else material.emissive.setRGB(...(emissive.split(',').map(Number) as [number, number, number]));
          material.emissiveIntensity = 1;
        }
        material.opacity = Number(opacity);
        dayMaterial = material;
        dayGroup.mesh = draw(range.start, range.count, material, 'landmark batch (day)');
        stats.dayDraws++;
      }
      // The far version is computed off the main thread and arrives later; until then the cell
      // draws in full.
      if (lodable) farJobs.push({ group: dayGroup, geometry: geo, meshes: classMeshes, start: range.start, count: range.count, material: dayMaterial, rep });
      stats.nightDraws += dayGroup.runs.length;
      cellGroup.groups.push(dayGroup);
      days.push(dayGroup);
    }
    stats.merged += members.length;
    for (const { mesh } of members) {
      mesh.removeFromParent();
      users.set(mesh.geometry, users.get(mesh.geometry)! - 1);
      if (!users.get(mesh.geometry)) {
        mesh.geometry.dispose();
        // Landmark closures (setNight) often keep the mesh: let its arrays go, or they are held twice.
        mesh.geometry = EMPTY;
      }
      const mat = mesh.material as Material;
      users.set(mat, users.get(mat)! - 1);
      // Sources still drive their runs' copies through sync(), but never draw again.
      if (!users.get(mat)) mat.dispose();
    }
    yield 'landmark cell';
  }

  // sync() lives outside this scope: a closure here would keep this function's maps, and with
  // them every original geometry, alive.
  users.clear();
  classes.clear();
  const sync = syncer(days);
  sync();
  stats.ms = Math.round(performance.now() - t0);
  stats.lodMs = Math.round(stats.lodMs);
  // Far versions come from a worker, after the build. Without one (node tests) they are built only
  // on request, so a scene built in a test does not change under it when a promise settles.
  const farReady = lod && farJobs.length && (o.syncFar || typeof Worker !== 'undefined')
    ? buildFar(farJobs, lod.minArea, stats, o.syncFar ?? false) : Promise.resolve();
  /** Streaming rings pick a cell's level; null hands it back to the distance rule. */
  const setCellDetail = (cell: string, level: CellDetail | null) => { const c = cells.get(cell); if (c) c.detail = level; };
  return { group, stats, cells, sync, setCellDetail, farReady };
}

/**
 * The 2026-11-23 batcher, kept for `?perf&batch=off` A/B runs: downtown bodies with the plain
 * StaticLandmarkMaterial only, merged in world space.
 */
export function batchLandmarkBodies(landmarks: Object3D[]) {
  const tiles = new Map<string, Mesh<BufferGeometry, StaticLandmarkMaterial>[]>();
  const center = new Vector3();
  for (const landmark of landmarks) {
    landmark.updateMatrixWorld(true);
    landmark.traverse(o => {
      if (!(o instanceof Mesh) || !(o.material instanceof StaticLandmarkMaterial)) return;
      if (o.material.onBeforeCompile !== Material.prototype.onBeforeCompile || !o.castShadow || !o.receiveShadow) return;
      if (o.matrixWorld.determinant() <= 0 || !o.geometry.getAttribute('position').count) return;
      o.geometry.computeBoundingBox();
      new Box3().copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld).getCenter(center);
      const key = `${Math.floor(center.x / 500)},${Math.floor(center.z / 500)}`;
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key)!.push(o);
    });
  }
  const group = new Group();
  group.name = 'Downtown landmark bodies';
  group.userData.perf = 'buildings';
  group.userData.building = true;
  for (const meshes of tiles.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) continue;
    const batch = new Mesh(geometry, meshes[0].material);
    batch.castShadow = batch.receiveShadow = true;
    group.add(batch);
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      if (mesh.material !== batch.material) mesh.material.dispose();
    }
  }
  return group;
}

/** `?perf&lod=off` (or batch=off) draws every landmark cell at full detail at any distance. */
export const landmarkLodOff = (() => {
  const p = new URLSearchParams(globalThis.location?.search ?? '');
  const perf = p.get('perf');
  return perf !== null && perf !== '0' && perf !== 'off' && (p.get('lod') === 'off' || p.get('batch') === 'off');
})();

/** `?perf&batch=off` restores the 2026-11-23 batching, for A/B runs from one build. */
export const landmarkBatchOff = (() => {
  const p = new URLSearchParams(globalThis.location?.search ?? '');
  const perf = p.get('perf');
  return perf !== null && perf !== '0' && perf !== 'off' && p.get('batch') === 'off';
})();

/** `?perf&colours=float` keeps landmark batch colours as floats, for A/B runs from one build. */
const compactColoursOff = (() => {
  const p = new URLSearchParams(globalThis.location?.search ?? '');
  const perf = p.get('perf');
  return perf !== null && perf !== '0' && perf !== 'off' && p.get('colours') === 'float';
})();
