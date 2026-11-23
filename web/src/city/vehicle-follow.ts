import { railSpanAt, type SceneManifest } from '../core/scene-data';
import type { Tier } from '../model/types';
import tunnelRuns from './fixtures/midtown-tunnel.json';

export const FOLLOW_CAMERA = { bearing: -148, tilt: 26, distance: 300 };
export type FollowKind = 'train' | 'bus' | 'freight';
type Point = { x: number; z: number };
type Bounds = SceneManifest['bounds'];
/** Why a followed vehicle has no drawn car: a mapped tunnel, a roof or deck over the track,
 * or nothing known (a row without a modelled track, or a vehicle clipped at its own edge). */
export type Hidden = 'underground' | 'covered' | null;
export type FollowPhase = 'idle' | 'drawn' | 'underground' | 'covered' | 'unseen' | 'outside' | 'lost';

/** The followed identity belongs to the data source. City reuses meshes for different trips. */
export type Followed = { kind: FollowKind; id: string; tier: Tier; pathId?: string };

/** One frame of the followed vehicle, from its source position and its drawn cars. */
export type Fix = {
  id: string; pathId?: string; tier: Tier;
  /** Source position in scene metres. */
  x: number; z: number;
  /** Cars that are drawn and inside their own clipping planes this frame. */
  cars: readonly Point[];
  hidden: Hidden;
};

export class VehicleFollow {
  private followed?: Followed;
  private focus?: Point;
  private lastTime?: number;
  private requested = false;
  phase: FollowPhase = 'idle';
  /** The followed vehicle's last known tier, kept after the follow ends for the card's last line. */
  tier?: Tier;
  get active() { return !!this.followed; }
  get vehicle(): Followed | undefined { return this.followed; }

  start(vehicle: Followed) {
    this.stop();
    this.followed = { ...vehicle };
    this.tier = vehicle.tier;
    this.requested = true;
  }

  stop(phase: FollowPhase = 'idle') {
    this.followed = undefined;
    this.focus = undefined;
    this.lastTime = undefined;
    this.requested = false;
    this.phase = phase;
  }

  recenter() { this.requested = this.active; }

  /** Returns the camera target for this frame, or undefined to leave the camera alone.
   * `current` is the camera's actual target, so anything else that moved the camera
   * (an area finishing its load, a board clamp) is corrected on the next frame. */
  frame(fix: Fix | null, bounds: Bounds | ((p: Point) => boolean), now: number, reducedMotion: boolean, current?: Point): Point | undefined {
    const v = this.followed;
    if (!v) return;
    // A trip that changes path or tier is a different claim. End rather than relabel it.
    if (!fix || fix.id !== v.id || fix.pathId !== v.pathId || fix.tier !== v.tier ||
        !Number.isFinite(fix.x) || !Number.isFinite(fix.z)) {
      this.stop('lost');
      return;
    }
    const inside = typeof bounds === 'function' ? bounds
      : (p: Point) => p.x >= bounds.minX && p.x <= bounds.maxX && p.z >= bounds.minZ && p.z <= bounds.maxZ;
    // Retain a consist crossing a board edge while at least one car remains on the board.
    const cars = fix.cars.filter(inside);
    if (!cars.length && !inside(fix)) {
      this.stop('outside');
      return;
    }
    this.phase = cars.length ? 'drawn' : fix.hidden ?? 'unseen';
    const goal = cars.length
      ? { x: cars.reduce((s, c) => s + c.x, 0) / cars.length, z: cars.reduce((s, c) => s + c.z, 0) / cars.length }
      : { x: fix.x, z: fix.z };
    const dt = Math.min(100, Math.max(0, now - (this.lastTime ?? now)));
    this.lastTime = now;
    if (!this.requested && reducedMotion) return;
    const previous = this.focus && (current ?? this.focus);
    if (!this.requested && previous) {
      const gap = Math.hypot(previous.x - goal.x, previous.z - goal.z);
      if (gap < .02) return;
      // A fast clock or scrub can cross a whole block in one frame. Keep the
      // selected vehicle in shot without flying through all the intervening streets.
      const k = Math.max(-Math.expm1(-dt / 160), 1 - 8 / gap);
      goal.x = previous.x + (goal.x - previous.x) * k;
      goal.z = previous.z + (goal.z - previous.z) * k;
    }
    this.requested = false;
    return this.focus = goal;
  }
}

type Run = { pts: number[][] };
const NORTH_LINE = new Set(['marta:route:RED', 'marta:route:GOLD']);
/** True when (x, z) lies beside a way that OSM maps as North Line tunnel, within `reach`
 * metres across it. GTFS shapes and OSM ways differ by a few metres, and the two mains run
 * side by side. Past a tunnel mouth the claim stops: a point beyond a way's end counts only
 * within 3 m, where consecutive tunnel ways join. */
export function inMappedTunnel(x: number, z: number, reach = 20, runs: readonly Run[] = tunnelRuns) {
  for (const { pts } of runs) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const dx = bx - ax, dz = bz - az;
      const raw = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
      const t = Math.max(0, Math.min(1, raw));
      const d = Math.hypot(x - ax - t * dx, z - az - t * dz);
      // Only a way's own ends limit the reach; interior bends keep the full width.
      const end = (raw < 0 && i === 1) || (raw > 1 && i === pts.length - 1);
      if (d <= (end ? 3 : reach)) return true;
    }
  }
  return false;
}

/** Why a followed train has no drawn car. Downtown's baked rail cover comes first; the
 * North Line's mapped tunnel covers Midtown, where no rail cover is baked. */
export function trainHidden(rail: SceneManifest['rail'], routeId: string, pathId: string, s: number, x: number, z: number): Hidden {
  const cover = railSpanAt(rail, pathId, s)?.cover;
  if (cover === 'covered' || cover === 'roofed') return 'covered';
  // Only North Line services run in that tunnel; the Crescent and freight pass beside its portal.
  return NORTH_LINE.has(routeId) && inMappedTunnel(x, z) ? 'underground' : null;
}
