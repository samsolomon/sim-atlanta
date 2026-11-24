/**
 * Sub-pixel detail culling (?stream=1). A mesh whose bounding sphere projects to less than about a
 * pixel can't be seen, yet it still costs a draw call, and the phone is draw-bound. This hides those
 * meshes and nothing else, so the picture does not change.
 *
 * Culled meshes move to layer 1 instead of changing `.visible`. Other systems own visibility
 * (night ranges, tree detail, landmark batches), so this never fights them. The camera, the
 * shadow camera and the raycaster all test layer 0, so a culled mesh neither draws, casts nor
 * picks.
 *
 * Never culled:
 * - instanced meshes (their sphere is one instance, not the spread)
 * - anything that could glow: emissive, additive, transparent, or named for lights, lamps, glows,
 *   crowns, signs, beacons or windows, so a lit crown or a lamp's sparkle survives at any distance
 * - objects tagged `userData.keepDetail`
 * - anything under a landmark batch group or cell: the batches move their own meshes between
 *   layers for their distance LOD, and the rings select cells through setCellDetail instead
 */
import * as THREE from 'three';

export const CULL_LAYER = 1;
const KEEP_NAME = /light|lamp|glow|crown|sign|beacon|window|loggia|lit\b|neon|halo|flare/i;

/** Projected radius in pixels of a sphere at `distance`, for a vertical fov and viewport height. */
export function projectedRadiusPx(radius: number, distance: number, fovDeg: number, heightPx: number) {
  return (radius / Math.max(distance, 1e-3)) * (heightPx / 2) / Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
}

/** Hysteresis: cull below `inPx`, restore above `outPx`. */
export function nextCulled(culled: boolean, px: number, inPx = 0.75, outPx = 1.0) {
  return culled ? px < outPx : px < inPx;
}

/** Landmark batches own their meshes' layers (far cells move to a shadow-only layer). */
const OWN_LAYERS = /^(Downtown )?[Ll]andmark batches$/;

function mightGlow(o: THREE.Object3D) {
  if (o.userData.keepDetail) return true;
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (OWN_LAYERS.test(p.name) || p.userData.cell) return true;
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.name && KEEP_NAME.test(p.name)) return true;
  const m = (o as THREE.Mesh).material;
  for (const mat of Array.isArray(m) ? m : [m]) {
    if (!mat) continue;
    if (mat.transparent || mat.blending === THREE.AdditiveBlending || (mat.name && KEEP_NAME.test(mat.name))) return true;
    const lit = mat as THREE.MeshLambertMaterial;
    if (lit.emissive && (lit.emissiveIntensity ?? 1) > 0 && (lit.emissive.r > 0 || lit.emissive.g > 0 || lit.emissive.b > 0)) return true;
    if ((mat as THREE.MeshLambertMaterial).emissiveMap) return true;
  }
  return false;
}

export class DetailCull {
  private culled = new Set<THREE.Mesh>();
  private v = new THREE.Vector3();
  private last = new THREE.Vector3(NaN, NaN, NaN);
  private lastTick = -Infinity;
  /** The lens and viewport the last pass used: a resize or zoom changes every projection. */
  private lens = '';
  /** Draws hidden at the last pass. */
  count = 0;
  /** Something changed that the next pass must see (a mount, night), even with a still camera. */
  stale = true;
  invalidate() { this.stale = true; }

  constructor(private readonly roots: () => Iterable<THREE.Object3D | undefined | null>) {}

  update(camera: THREE.PerspectiveCamera, heightPx: number, now = performance.now(), force = false) {
    // A still camera changes nothing; a moving one re-checks at most 5 times a second.
    const lens = `${heightPx}|${camera.fov}|${camera.zoom}`;
    if (lens !== this.lens) { this.lens = lens; this.stale = true; }
    if (!force && (now - this.lastTick < 200 || (!this.stale && this.last.distanceToSquared(camera.position) < 0.25))) return;
    this.lastTick = now;
    this.stale = false;
    this.last.copy(camera.position);
    const k = (heightPx / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.zoom;
    const seen = new Set<THREE.Mesh>();
    for (const root of this.roots()) {
      root?.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || (o as THREE.InstancedMesh).isInstancedMesh) return;
        const g = mesh.geometry;
        if (!g.boundingSphere) g.computeBoundingSphere();
        const bs = g.boundingSphere!;
        this.v.copy(bs.center).applyMatrix4(mesh.matrixWorld);
        const px = bs.radius * mesh.matrixWorld.getMaxScaleOnAxis() / Math.max(this.v.distanceTo(camera.position), 1e-3) * k;
        const was = this.culled.has(mesh);
        const cull = nextCulled(was, px) && !mightGlow(mesh);
        if (cull) {
          seen.add(mesh);
          if (!was) { mesh.layers.set(CULL_LAYER); this.culled.add(mesh); }
        }
      });
    }
    // Restore what grew past the threshold, became glowing, or left the roots.
    for (const mesh of this.culled) if (!seen.has(mesh)) { mesh.layers.set(0); this.culled.delete(mesh); }
    this.count = this.culled.size;
  }

  dispose() {
    for (const mesh of this.culled) mesh.layers.set(0);
    this.culled.clear();
  }
}
