/**
 * Streaming prototype (?stream=1): City draws only what the camera can see, without changing
 * what it looks like.
 *
 * Every area still loads at boot exactly as today. A full build is one long main-thread job, so
 * building or freeing areas while the camera moves would stall; that waits for sliced builds
 * (docs/expansion-plan.md). Two rules decide what draws:
 *
 * - **Fog:** an area whose nearest point lies past the fog's full-strength distance renders as
 *   pure fog colour, so it is hidden (`group.visible`). Fog reaches full strength at 3x the orbit
 *   distance, so this only bites in close views.
 * - **Detail:** a mesh that projects below about a pixel is moved off the render layer
 *   (detail-cull.ts). Lights, glows and lit crowns are kept by rule.
 *
 * Each streamed area draws once, unculled, when it mounts, so hiding it never defers its upload
 * to the frame it first returns.
 */
import * as THREE from 'three';
import { perf } from '../../core/perf';
import type { Board } from '../../square-board/sections';
import { bounds as boardBounds } from '../../square-board/sections';
import { DetailCull } from './detail-cull';

/** The areas the fog rule can hide; downtown, King Memorial and Sweet Auburn always draw. */
export const STREAMED: readonly Board[] = ['south-band', 'south-corner', 'north-band', 'north-corner',
  'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station'];

/**
 * Fog follows view depth, which is the eye distance times the cosine of the angle off the view
 * axis. Anything on screen is at most a frustum corner's angle off axis, so view depth is at least
 * eye distance x this. On City's 22° lens it is about 0.94, on the 66° drive camera far less.
 */
export function depthMargin(fovDeg: number, aspect: number) {
  const t = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  return Math.cos(Math.atan(Math.hypot(t, t * aspect)));
}

/** Hidden when the area's nearest point is past the fog for every on-screen direction (5% gap to return). */
export function pastFog(hidden: boolean, distance: number, fogFar: number, margin = 0.94) {
  const edge = fogFar / margin;
  return hidden ? distance > edge * 0.95 : distance > edge;
}

/** Eye distance to a box lying on the ground plane at height y. */
export function boxDistance(b: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, y: number, z: number, groundY = 0) {
  const dx = Math.max(b.minX - x, 0, x - b.maxX);
  const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
  return Math.hypot(dx, dz, y - groundY);
}

interface Unit { id: Board; hidden: boolean; warmed: THREE.Object3D | null; warmFrames: number }

export interface StreamHooks {
  full(id: Board): { group: THREE.Object3D } | undefined;
  /** A full area was shown or hidden (City redraws shadows and hides attached roots). */
  changed(id: Board, shown: boolean): void;
  /** Roots whose small meshes may be culled (scenery, never vehicles). */
  detailRoots(): Iterable<THREE.Object3D | undefined | null>;
}

export class StreamManager {
  private units: Unit[] = STREAMED.map(id => ({ id, hidden: false, warmed: null, warmFrames: 0 }));
  readonly detail: DetailCull;
  private lastTick = -Infinity;
  private swaps = 0;
  private night = -1;

  constructor(private readonly hooks: StreamHooks) {
    this.detail = new DetailCull(hooks.detailRoots);
  }

  /**
   * A full area just mounted. Before a rule may hide it, it draws once with frustum culling off,
   * so its buffers upload and its shaders compile during boot's load, not on the frame it first
   * comes back.
   */
  mounted() {
    this.lastTick = -Infinity;
    this.detail.invalidate();
    for (const u of this.units) {
      const full = this.hooks.full(u.id);
      if (!full || u.warmed === full.group) continue;
      u.warmed = full.group;
      const culled: THREE.Object3D[] = [];
      full.group.traverse(o => { if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
      u.warmFrames = 3;
      full.group.visible = true;
      u.hidden = false;
      const restore = () => { if (--u.warmFrames > 0) requestAnimationFrame(restore); else for (const o of culled) o.frustumCulled = true; };
      requestAnimationFrame(restore);
    }
  }

  /** Night lights a mesh's emissive; the glow rule must see it even with a still camera. */
  setNight(factor: number) {
    if (Math.abs(factor - this.night) > 0.02) { this.night = factor; this.detail.invalidate(); }
  }

  update(camera: THREE.PerspectiveCamera, target: THREE.Vector3, fogFar: number, heightPx: number, now = performance.now()) {
    if (this.units.every(u => u.warmFrames === 0)) this.detail.update(camera, heightPx, now);
    if (now - this.lastTick < 200) return;
    this.lastTick = now;
    const p = camera.position;
    for (const u of this.units) {
      const full = this.hooks.full(u.id);
      if (!full || u.warmFrames > 0) continue;
      const margin = depthMargin(camera.fov / camera.zoom, camera.aspect);
      const hidden = pastFog(u.hidden, boxDistance(boardBounds[u.id], p.x, p.y, p.z, target.y), fogFar, margin);
      if (hidden === u.hidden) continue;
      u.hidden = hidden;
      full.group.visible = !hidden;
      this.swaps++;
      perf.ring(u.id, hidden ? 'far' : 'near');
      this.hooks.changed(u.id, !hidden);
    }
  }

  /** Every rule has been applied since the last mount. */
  get settled() { return this.units.every(u => u.warmFrames === 0) && !this.detail.stale; }

  stats() {
    return {
      shown: this.units.filter(u => this.hooks.full(u.id) && !u.hidden).map(u => u.id),
      hidden: this.units.filter(u => u.hidden).map(u => u.id),
      detailCulled: this.detail.count,
      swaps: this.swaps,
    };
  }

  dispose() { this.detail.dispose(); }
}
