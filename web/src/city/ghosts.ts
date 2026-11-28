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

class Batch {
  readonly mesh: THREE.InstancedMesh;
  private level: THREE.InstancedBufferAttribute;
  private clip: THREE.InstancedBufferAttribute | null;
  n = 0;
  constructor(source: THREE.BufferGeometry, material: THREE.Material, readonly cap: number, clips: boolean, name: string) {
    const g = new THREE.BufferGeometry();
    // The source's own attributes: three keys GPU buffers by attribute, so nothing uploads twice.
    g.setAttribute('position', source.getAttribute('position'));
    if (source.getAttribute('normal')) g.setAttribute('normal', source.getAttribute('normal'));
    if (source.index) g.setIndex(source.index);
    g.drawRange = { ...source.drawRange };
    this.level = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    this.level.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aGhost', this.level);
    this.clip = clips ? new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4) : null;
    if (this.clip) {
      this.clip.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('aGhostClip', this.clip);
    }
    this.mesh = new THREE.InstancedMesh(g, material, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.name = name;
    this.mesh.count = 0;
    // Positions change every frame and the hook draws them: no culling, no picking, no shadows.
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    this.mesh.raycast = () => {};
  }
  add(matrix: THREE.Matrix4, level: number, clip?: THREE.Vector4 | null) {
    if (this.n >= this.cap) return false;
    this.mesh.setMatrixAt(this.n, matrix);
    this.level.array[this.n] = level / 16;
    if (this.clip) (clip ?? KEEP_ALL).toArray(this.clip.array as Float32Array, this.n * 4);
    this.n++;
    return true;
  }
  /** Mark what changed for upload; three walks the scene before the hook draws. */
  commit() {
    if (!this.n) return;
    this.mesh.instanceMatrix.clearUpdateRanges();
    this.mesh.instanceMatrix.addUpdateRange(0, this.n * 16);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.level.clearUpdateRanges();
    this.level.addUpdateRange(0, this.n);
    this.level.needsUpdate = true;
    if (this.clip) {
      this.clip.clearUpdateRanges();
      this.clip.addUpdateRange(0, this.n * 4);
      this.clip.needsUpdate = true;
    }
  }
  dispose() {
    // Only the attributes this batch owns: position and normal belong to the vehicle.
    this.mesh.geometry.deleteAttribute('position');
    this.mesh.geometry.deleteAttribute('normal');
    this.mesh.geometry.setIndex(null);
    this.mesh.geometry.dispose();
    this.mesh.dispose();
  }
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
  private materials = new Map<THREE.Plane[], THREE.Material>();
  private trackSource = ghostTrackGeometry();
  private ghost = { value: 1 };
  private night = { value: 0 };

  constructor() {
    this.group.name = 'Ghost vehicles';
    this.group.userData.perf = 'ghosts';
  }

  private material(clip: THREE.Plane[]) {
    let m = this.materials.get(clip);
    if (!m) {
      // The bus's program: same defines (instanced, vertex colours, double-sided, 4 planes when
      // given the board edges) and the same custom key, so three reuses it.
      m = busMaterial(this.night, this.ghost);
      m.clippingPlanes = clip;
      m.depthTest = false;
      m.depthWrite = false;
      m.name = 'ghost';
      this.materials.set(clip, m);
    }
    return m;
  }

  /** The batch for one source geometry (key it by something stable, e.g. 'cab'). */
  batch(key: unknown, source: () => THREE.BufferGeometry, clip: THREE.Plane[], cap: number, clips = true) {
    let b = this.batches.get(key);
    if (!b) {
      b = new Batch(source(), this.material(clip), cap, clips, `ghost ${typeof key === 'string' ? key : 'vehicle'}`);
      this.batches.set(key, b);
      this.group.add(b.mesh);
    }
    return b;
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
   * is synced first (blending off, colour writes on), then only what three doesn't track per
   * material is changed by hand and restored: the alpha-only write mask and the MIN equation.
   */
  draw(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (!this.armed) return;
    this.armed = false;
    const live = [...this.batches.values()].filter(b => b.n > 0);
    this.drawn = live.length;
    if (!live.length) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const state = renderer.state;
    state.setBlending(THREE.NoBlending);
    state.buffers.color.setMask(true);
    const eqRGB = gl.getParameter(gl.BLEND_EQUATION_RGB) as number;
    const eqA = gl.getParameter(gl.BLEND_EQUATION_ALPHA) as number;
    const clear = gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array;
    gl.colorMask(false, false, false, true);
    // Alpha starts clean (1, no ghost) wherever the scene left it, then each ghost keeps the lowest code.
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.MIN);
    this.group.updateMatrixWorld();
    for (const b of live) {
      const mesh = b.mesh;
      mesh.count = b.n;
      mesh.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
      mesh.normalMatrix.getNormalMatrix(mesh.modelViewMatrix);
      renderer.renderBufferDirect(camera, scene, mesh.geometry, mesh.material as THREE.Material, mesh, null);
      mesh.count = 0;
    }
    gl.disable(gl.BLEND);
    gl.blendEquationSeparate(eqRGB, eqA);
    gl.colorMask(true, true, true, true);
    gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
  }

  dispose() {
    for (const b of this.batches.values()) b.dispose();
    this.batches.clear();
    for (const m of this.materials.values()) m.dispose();
    this.trackSource.dispose();
    this.group.removeFromParent();
  }
}
