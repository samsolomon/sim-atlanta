/**
 * Ghost vehicles (Sam, 2026-11-27; docs/ghost-vehicles.md). Two looks share this layer:
 *
 * - **Ghost tunnels.** MARTA trains in tunnel show through the ground as flat silhouettes of their
 *   real CQ400 cars in city-rail blue with a thin ink line, deeper runs fainter, each carrying a
 *   short window of ghost track that fades out ahead and behind.
 * - **X-ray.** The selected or followed train, bus or streetcar draws as the same ghost, in its own
 *   colour, wherever it is hidden: behind a tower, under a deck or underground.
 *
 * Cost rules: no new GPU program, at most three more draws when nothing is selected, and no new
 * vehicle geometry. So:
 *
 * - Each batch is an InstancedMesh whose geometry shares the source vehicle's own position and
 *   normal buffers (no bytes uploaded twice) and adds two small per-instance attributes.
 * - It draws with the bus material (vignette/xcelsior.ts) with its `ghost` uniform at 1: that
 *   program is already compiled, instanced and custom-keyed, and its ghost branch writes only a
 *   code (level / 16) into the scene target's alpha. Ghost code and clip planes come per instance.
 * - The ink pass (vignette/ink.ts), a full-screen program both tiers already run, turns the codes
 *   into the see-through fill and the outline. A pixel is filled once however many ghost faces
 *   cover it, so the cars' inner detail never shows, and phones blend nothing extra.
 *
 * Ghosts draw after the scene's transparent objects (scene.onAfterRender, while three still holds
 * the scene's lights, so the program key matches), so glass, rain and headlight pools never
 * disturb the codes. The batches sit in the scene with no instances while three walks it, which
 * uploads their buffers but draws nothing, and draw their instances once from the hook.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GHOST_SELF_POINTS } from '../vignette/ink';
import { busMaterial } from '../vignette/xcelsior';

/** Ghost levels, written as level / 16. Lower levels win where ghosts overlap (MIN blending). */
export const GHOST = {
  xrayBus: 1,
  xrayStreetcar: 2,
  xrayTrain: 3,
  /** Trains in tunnel, shallowest. */
  tunnel: 4,
  tunnelDeepest: 9,
  /** Track window, at the train. */
  track: 10,
  trackFaintest: 15,
} as const;

/**
 * Tunnel depth class from the schematic profile height (metres, negative below the surroundings;
 * docs/data-model.md: layer −1 → −10 m, −2 → −16 m, −3 → −22 m). Deeper is fainter.
 */
export function tunnelLevel(profileHeight: number) {
  return GHOST.tunnel + Math.min(GHOST.tunnelDeepest - GHOST.tunnel, Math.max(0, Math.floor((-profileHeight - 6) / 4)));
}

/** Track window level `d` metres beyond the train's end, over a window `w` metres long. */
export function trackLevel(d: number, w: number) {
  if (d <= 0) return GHOST.track;
  return Math.min(GHOST.trackFaintest, GHOST.track + Math.ceil((GHOST.trackFaintest - GHOST.track) * d / w));
}

/**
 * Add one car of the x-rayed vehicle to its centreline: both ends at mid-height, `half` metres
 * along its own axis, in world space. The end nearer the line so far goes first, so a consist
 * listed lead first makes one polyline whatever way each car faces. The ink pass leaves pixels
 * whose surface lies near this line alone: they are the vehicle's own visible faces.
 */
export function pushCarEnds(points: THREE.Vector3[], world: THREE.Matrix4, half: number, y: number) {
  if (points.length + 2 > GHOST_SELF_POINTS) return;
  const a = new THREE.Vector3(0, y, half).applyMatrix4(world), b = new THREE.Vector3(0, y, -half).applyMatrix4(world);
  const last = points[points.length - 1];
  if (last && last.distanceToSquared(b) < last.distanceToSquared(a)) points.push(b, a);
  else points.push(a, b);
}

/** No clip: the generic attribute default (0, 0, 0, 1) keeps every fragment. */
const KEEP_ALL = new THREE.Vector4(0, 0, 0, 1);

/**
 * What a batch draws. 'ghost': alpha codes for ink (see above). The cutaway (Sam, 2026-11-28; Roller
 * Coaster Tycoon's underground view, but local) draws real things around a train in tunnel:
 * 'lid' marks the opening in stencil where the ground in front of it is what shows; 'box' paints
 * the open-top tunnel box there and resets depth to it; 'car' draws the real cars inside it.
 */
export type Pass = 'ghost' | 'lid' | 'box' | 'car';
const PASS_ORDER: Pass[] = ['lid', 'box', 'car', 'ghost'];

class Batch {
  readonly mesh: THREE.InstancedMesh;
  private level: THREE.InstancedBufferAttribute;
  private clip: THREE.InstancedBufferAttribute | null;
  private line: THREE.InstancedBufferAttribute | null;
  private shared: string[];
  n = 0;
  constructor(source: THREE.BufferGeometry, material: THREE.Material, readonly cap: number, o: { clips: boolean; line?: boolean; attrs?: string[]; pass: Pass }, name: string) {
    const g = new THREE.BufferGeometry();
    // The source's own attributes: three keys GPU buffers by attribute, so nothing uploads twice.
    this.shared = ['position', 'normal', ...(o.attrs ?? [])].filter(a => source.getAttribute(a));
    for (const a of this.shared) g.setAttribute(a, source.getAttribute(a));
    if (source.index) g.setIndex(source.index);
    g.drawRange = { ...source.drawRange };
    this.level = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    this.level.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aGhost', this.level);
    const inst = (name: string, on: boolean | undefined) => {
      if (!on) return null;
      const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(name, a);
      return a;
    };
    this.clip = inst('aGhostClip', o.clips);
    this.line = inst('aLine', o.line);
    this.mesh = new THREE.InstancedMesh(g, material, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.name = name;
    this.mesh.count = 0;
    this.mesh.userData.pass = o.pass;
    // Positions change every frame and the hook draws them: no culling, no picking, no shadows.
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    this.mesh.raycast = () => {};
  }
  get pass(): Pass { return this.mesh.userData.pass; }
  add(matrix: THREE.Matrix4, level: number, clip?: THREE.Vector4 | null, line?: THREE.Color) {
    if (this.n >= this.cap) return false;
    this.mesh.setMatrixAt(this.n, matrix);
    this.level.array[this.n] = level / 16;
    if (this.clip) (clip ?? KEEP_ALL).toArray(this.clip.array as Float32Array, this.n * 4);
    if (this.line) {
      const a = this.line.array as Float32Array;
      if (line) { a[this.n * 4] = line.r; a[this.n * 4 + 1] = line.g; a[this.n * 4 + 2] = line.b; a[this.n * 4 + 3] = 0; }
      else a.set([0, 0, 0, 1], this.n * 4);
    }
    this.n++;
    return true;
  }
  /** Mark what changed for upload; three walks the scene before the hook draws. */
  commit() {
    if (!this.n) return;
    this.mesh.instanceMatrix.clearUpdateRanges();
    this.mesh.instanceMatrix.addUpdateRange(0, this.n * 16);
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const [a, size] of [[this.level, 1], [this.clip, 4], [this.line, 4]] as const) {
      if (!a) continue;
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * size);
      a.needsUpdate = true;
    }
  }
  dispose() {
    // Only the attributes this batch owns: the shared ones belong to the vehicle.
    for (const a of this.shared) this.mesh.geometry.deleteAttribute(a);
    this.mesh.geometry.setIndex(null);
    this.mesh.geometry.dispose();
    this.mesh.dispose();
  }
}

/** The cutaway's tunnel box section, in metres across, 1 m long along z and 1 high (instances scale
 * length and depth: floor at y 0, rim at y 1). A ballast floor with flat rails and ties, and ONE wall
 * at +x: concrete with a lamp strip, then a band of Georgia clay where the cut shows the ground.
 * Each section is mirrored so its wall stands on the far side from the camera; there is no near
 * wall to hide the train (Roller Coaster Tycoon's underground view shows the far side only). */
export const CUT_HALF = 4.4;
export function cutBoxGeometry() {
  const pos: number[] = [], col: number[] = [], kind: number[] = [], nrm: number[] = [];
  const c = new THREE.Color();
  const quad = (a: number[], b: number[], d: number[], e: number[], hex: string, k: number, n: number[]) => {
    c.set(hex); // linear under three's colour management, like the vehicle kits
    for (const v of [a, b, d, a, d, e]) { pos.push(...v); col.push(c.r, c.g, c.b); kind.push(k); nrm.push(...n); }
  };
  const H = CUT_HALF, z0 = -0.5, z1 = 0.5;
  const floor = (x0: number, x1: number, y: number, hex: string, za = z0, zb = z1) => quad([x0, y, za], [x1, y, za], [x1, y, zb], [x0, y, zb], hex, 0, [0, 1, 0]);
  floor(-H, H, 0, '#a39d92'); // ballast
  for (let t = 0; t < 2; t++) floor(-1.3, 1.3, 0.002, '#6e5a4c', -0.5 + t * 0.5 + 0.05, -0.5 + t * 0.5 + 0.2); // ties
  for (const x of [-0.75, 0.75]) floor(x - 0.06, x + 0.06, 0.004, '#3a3633'); // rails
  const band = (y0: number, y1: number, hex: string, k = 0) => quad([H, y0, z0], [H, y0, z1], [H, y1, z1], [H, y1, z0], hex, k, [-1, 0, 0]);
  band(0, 0.3, '#a7a197');
  band(0.3, 0.33, '#e8eef4', 4);
  band(0.33, 0.84, '#c9c4b9');
  band(0.84, 0.92, '#a8553a');
  band(0.92, 1, '#8f4430');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  return g;
}

/** The cutaway's lid: a unit square (x and z from −0.5 to 0.5) at y 0; instances shape it. */
export function cutLidGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  return g;
}

/**
 * One cutaway section's lid and box, in its track's space. The opening is the hull of the rim and
 * of the floor seen from the eye (projected up its view rays to the rim), so it lies where the
 * ground stands between the eye and the train, and the train shows through it. `centre` is the
 * track centre at floor height, `along` and `across` unit vectors (across = the track's left),
 * `width` the opening's share (1, or less where a lens narrows). Writes into `lid` and `box`.
 */
export function cutSection(o: { centre: THREE.Vector3; along: THREE.Vector3; across: THREE.Vector3; rim: number; length: number; eye: THREE.Vector3; width: number },
  lid: THREE.Matrix4, box: THREE.Matrix4) {
  const { centre: f, along, across, rim, length } = o;
  const depth = rim - f.y;
  const ex = o.eye.x - f.x, ey = Math.max(1, o.eye.y - f.y), ez = o.eye.z - f.z;
  // The floor's centre seen from the eye, where its ray meets the rim: shifted toward the eye.
  const k = depth / ey, sx = ex * k, sz = ez * k;
  const a = sx * across.x + sz * across.z, b = sx * along.x + sz * along.z;
  const H = CUT_HALF * o.width;
  const w = 2 * H + Math.abs(a), l = length + Math.abs(b);
  const up = THREE.Object3D.DEFAULT_UP;
  lid.makeBasis(across.clone().multiplyScalar(w), up.clone(), along.clone().multiplyScalar(l))
    .setPosition(f.x + across.x * a / 2 + along.x * b / 2, rim, f.z + across.z * a / 2 + along.z * b / 2);
  // The wall goes on the side away from the eye.
  const side = a > 0 ? -1 : 1;
  box.makeBasis(across.clone().multiplyScalar(side), up.clone().multiplyScalar(depth), along.clone().multiplyScalar(length))
    .setPosition(f.x, f.y, f.z);
  return { a, b };
}

/** One dash of ghost track: two rails, 1 m long along z (instances stretch it), centred. */
export function ghostTrackGeometry() {
  const rail = (x: number) => new THREE.BoxGeometry(0.34, 0.3, 1).translate(x, 0.15, 0).deleteAttribute('uv');
  const parts = [rail(-0.8), rail(0.8)];
  const g = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return g;
}

export class CityGhosts {
  /** Added to the scene: the batches, empty while three walks it. */
  readonly group = new THREE.Group();
  /** City sets this just before the frame's composer render, when ghosts may draw. */
  armed = false;
  /** Off: nothing draws (dev before/after stills from one session). */
  enabled = true;
  /** Batches drawn in the last frame's hook (readouts and tests). */
  drawn = 0;
  private batches = new Map<unknown, Batch>();
  private materials = new Map<string, THREE.Material>();
  private planeSets = new Map<THREE.Plane[], number>();
  private trackSource = ghostTrackGeometry();
  private cutBox = cutBoxGeometry();
  private cutLid = cutLidGeometry();
  private ghost = { value: 1 };
  private lit = { value: 0 };
  /** City's darkness: the cutaway's cars and lamps glow by it. */
  readonly night = { value: 0 };

  constructor() {
    this.group.name = 'Ghost vehicles';
    this.group.userData.perf = 'ghosts';
  }

  private material(clip: THREE.Plane[], pass: Pass = 'ghost') {
    if (!this.planeSets.has(clip)) this.planeSets.set(clip, this.planeSets.size);
    const key = `${this.planeSets.get(clip)}:${pass}`;
    let m = this.materials.get(key);
    if (!m) {
      // The bus's program: same defines (instanced, vertex colours, double-sided, 4 planes when
      // given the board edges) and the same custom key, so three reuses it. Depth and stencil
      // state is per material and costs no program.
      m = busMaterial(this.night, pass === 'ghost' ? this.ghost : this.lit);
      m.clippingPlanes = clip;
      m.name = `ghost ${pass}`;
      m.stencilWrite = true; // turns the stencil test on; stencilWriteMask says what it writes
      m.stencilRef = 1;
      m.stencilWriteMask = 0;
      m.stencilFunc = THREE.EqualStencilFunc;
      if (pass === 'ghost') {
        // Outside any cutaway: there the real train shows instead.
        m.depthTest = false;
        m.depthWrite = false;
        m.stencilFunc = THREE.NotEqualStencilFunc;
      } else if (pass === 'lid') {
        // Where the ground in front of the opening is what shows (a tower in front keeps it shut).
        m.colorWrite = false;
        m.depthWrite = false;
        m.stencilFunc = THREE.AlwaysStencilFunc;
        m.stencilZPass = THREE.ReplaceStencilOp;
        m.stencilWriteMask = 0xff;
      } else if (pass === 'box') {
        // The visible inner faces tile the opening, so they need no order among themselves.
        m.depthFunc = THREE.AlwaysDepth;
      }
      this.materials.set(key, m);
    }
    return m;
  }

  /** The batch for one source geometry (key it by something stable, e.g. 'cab'). */
  batch(key: unknown, source: () => THREE.BufferGeometry, clip: THREE.Plane[], cap: number, clips = true,
    o: { pass?: Pass; line?: boolean; attrs?: string[] } = {}) {
    let b = this.batches.get(key);
    if (!b) {
      const pass = o.pass ?? 'ghost';
      b = new Batch(source(), this.material(clip, pass), cap, { clips, line: o.line, attrs: o.attrs, pass }, `${pass === 'ghost' ? 'ghost' : 'cutaway'} ${typeof key === 'string' ? key : 'vehicle'}`);
      this.batches.set(key, b);
      this.group.add(b.mesh);
    }
    return b;
  }

  /** The cutaway's lid and box sections (one instance each per section). */
  cutaway(clip: THREE.Plane[], cap = 384) {
    return {
      lid: this.batch('cut lid', () => this.cutLid, clip, cap, false, { pass: 'lid' }),
      box: this.batch('cut box', () => this.cutBox, clip, cap, false, { pass: 'box', attrs: ['color', 'aKind'] }),
    };
  }

  /** The track window's dashes. */
  track(clip: THREE.Plane[], cap = 768) {
    return this.batch('track', () => this.trackSource, clip, cap, false);
  }

  /** Start a frame: every batch empty. */
  begin() {
    for (const b of this.batches.values()) b.n = 0;
  }

  /** End the frame's updates: upload what changed. Returns the instance count. */
  end() {
    let n = 0;
    for (const b of this.batches.values()) { b.commit(); b.mesh.count = 0; n += b.n; }
    return n;
  }

  get count() {
    let n = 0;
    for (const b of this.batches.values()) n += b.n;
    return n;
  }

  /** Draw calls the hook will issue (batches with instances). */
  get calls() {
    let n = 0;
    for (const b of this.batches.values()) if (b.n) n++;
    return n;
  }

  /**
   * scene.onAfterRender: draw every batch's codes into the scene target's alpha. Three's own state
   * is synced first (blending off, colour writes on, the clear colour), then only what three doesn't
   * track per material is changed by hand and restored: the alpha-only write mask and the MIN equation.
   */
  draw(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (!this.armed) return;
    this.armed = false;
    const live = [...this.batches.values()].filter(b => b.n > 0).sort((a, b) => PASS_ORDER.indexOf(a.pass) - PASS_ORDER.indexOf(b.pass));
    this.drawn = live.length;
    if (!live.length) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const state = renderer.state;
    this.group.updateMatrixWorld();
    const render = (b: Batch) => {
      const mesh = b.mesh;
      mesh.count = b.n;
      mesh.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
      mesh.normalMatrix.getNormalMatrix(mesh.modelViewMatrix);
      renderer.renderBufferDirect(camera, scene, mesh.geometry, mesh.material as THREE.Material, mesh, null);
      mesh.count = 0;
    };
    // The cutaway first, in three's own state (its materials carry depth and stencil). The stencil
    // starts clear only when a lid will mark it; ghosts test it either way.
    if (live[0].pass === 'lid') {
      state.buffers.stencil.setMask(0xff);
      state.buffers.stencil.setClear(0);
      gl.clear(gl.STENCIL_BUFFER_BIT);
    }
    const ghosts = live.filter(b => b.pass === 'ghost');
    for (const b of live) if (b.pass !== 'ghost') render(b);
    if (!ghosts.length) return;
    state.setBlending(THREE.NoBlending);
    state.buffers.color.setMask(true);
    // Through three, so its cache stays true: its next clear sets its own colour again.
    state.buffers.color.setClear(0, 0, 0, 1, false);
    gl.colorMask(false, false, false, true);
    // Alpha starts clean (1, no ghost) wherever the scene left it, then each ghost keeps the lowest code.
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.MIN);
    for (const b of ghosts) render(b);
    gl.disable(gl.BLEND);
    // City blends only with three's standard modes, all FUNC_ADD (nothing uses CustomBlending), so
    // ADD is what three's cache holds; no getParameter round trips per frame.
    gl.blendEquation(gl.FUNC_ADD);
    gl.colorMask(true, true, true, true);
  }

  dispose() {
    for (const b of this.batches.values()) b.dispose();
    this.batches.clear();
    for (const m of this.materials.values()) m.dispose();
    this.trackSource.dispose();
    this.cutBox.dispose();
    this.cutLid.dispose();
    this.group.removeFromParent();
  }
}
