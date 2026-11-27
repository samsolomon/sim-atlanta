import * as THREE from 'three';
import { railSpanAt, type SceneManifest } from '../core/scene-data';
import { CAR_LENGTH } from '../vignette/cq400';
import type { Tier } from '../model/types';
import tunnelRuns from './fixtures/midtown-tunnel.json';
import downtownCover from './fixtures/downtown-rail-cover.json';

export const FOLLOW_CAMERA = { bearing: -148, tilt: 26, distance: 300 };
export type FollowKind = 'train' | 'bus' | 'freight';
type Point = { x: number; z: number };
/** A drawn car's centre, and the share of its length on show when cover or a clipping plane cuts it. */
export type CarPoint = Point & { shown?: number };
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
  /** Trains only: the route and heading (degrees clockwise from north), used to match a handoff. */
  routeId?: string; heading?: number;
  /** Source position in scene metres. */
  x: number; z: number;
  /** Cars that are drawn and inside their own clipping planes this frame, front first in the
   * direction of travel. */
  cars: readonly CarPoint[];
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
  /** The vehicle whose follow ended at an edge or on loss, so a card can tell it apart from a new selection. */
  ended?: Followed;
  /** True after a tier handoff: the vehicle now followed is an inferred match, not the same trip id. */
  matched = false;
  /** Ids followed since start, oldest first: one, or more after tier handoffs. */
  lineage: string[] = [];
  /** The lineage of the follow that ended, so a card can recognise any of its ids. */
  endedLineage: string[] = [];
  private last?: Fix;
  private easing = false;
  /** Start and explicit Recenter request the opening camera preset. */
  get framingRequested() { return this.requested; }
  get active() { return !!this.followed; }
  get vehicle(): Followed | undefined { return this.followed; }

  start(vehicle: Followed) {
    this.stop();
    this.followed = { ...vehicle };
    this.tier = vehicle.tier;
    this.lineage = [vehicle.id];
    this.requested = true;
  }

  stop(phase: FollowPhase = 'idle') {
    const ended = phase === 'lost' || phase === 'outside';
    this.ended = ended ? this.followed : undefined;
    this.endedLineage = ended ? this.lineage : [];
    this.lineage = [];
    this.easing = false;
    this.followed = undefined;
    this.matched = false;
    this.last = undefined;
    this.focus = undefined;
    this.lastTime = undefined;
    this.requested = false;
    this.phase = phase;
  }

  recenter() { this.requested = this.active; }

  /** When the followed trip disappears because its source changed tier (a timetable trip replaced
   * by live MARTA rail, or live rail falling back to the timetable), hand the camera to the nearest
   * train of the other tier on the same route, heading the same way and close by. The live feed
   * carries no trip ids, so this is an inferred match, and `matched` says so. Returns the new fix. */
  handoff(candidates: readonly Fix[]): Fix | null {
    const v = this.followed, last = this.last;
    if (!v || v.kind !== 'train' || !last) return null;
    const next = pickHandoff(last, candidates);
    if (!next) return null;
    this.followed = { kind: 'train', id: next.id, pathId: next.pathId, tier: next.tier };
    this.tier = next.tier;
    this.matched = true;
    this.lineage.push(next.id);
    // The match can be up to 2.5 km away: glide there instead of jumping in one frame.
    this.easing = true;
    return next;
  }

  /** Returns the camera target for this frame, or undefined to leave the camera alone.
   * `current` is the camera's actual target, so anything else that moved the camera
   * (an area finishing its load, a board clamp) is corrected on the next frame. */
  frame(fix: Fix | null, bounds: Bounds | ((p: Point) => boolean), now: number, reducedMotion: boolean, current?: Point): Point | undefined {
    const v = this.followed;
    if (!v) return;
    // A live train keeps its id while the feed re-snaps it to a sibling path variant.
    if (fix && fix.id === v.id && fix.tier === v.tier && v.tier === 'live' && fix.pathId !== v.pathId) v.pathId = fix.pathId;
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
    this.last = fix;
    this.phase = cars.length ? 'drawn' : fix.hidden ?? 'unseen';
    // Frame the front car on the board. While cover or an edge cuts it, it gives way to the cars
    // behind by the share it has lost, so a car appearing or vanishing never moves the aim in one
    // step. A cut car therefore counts until it is gone, even with its centre past the edge.
    const framed = cars.length ? fix.cars.filter(c => c.shown !== undefined || inside(c)) : cars;
    const goal = framed.reduceRight<Point>((behind, c) => {
      const w = c.shown ?? 1;
      return { x: c.x * w + behind.x * (1 - w), z: c.z * w + behind.z * (1 - w) };
    }, framed[framed.length - 1] ?? fix);
    // A fresh object: easing below writes to it.
    const target = { x: goal.x, z: goal.z };
    const dt = Math.min(100, Math.max(0, now - (this.lastTime ?? now)));
    this.lastTime = now;
    if (!this.requested && reducedMotion) return;
    const previous = this.focus && (current ?? this.focus);
    if (!this.requested && previous) {
      const gap = Math.hypot(previous.x - target.x, previous.z - target.z);
      if (gap < 8) this.easing = false;
      if (gap < .02) return;
      // A fast clock or scrub can cross a whole block in one frame. Keep the
      // selected vehicle in shot without flying through all the intervening streets.
      // After a handoff the target is a different train, so ease over to it instead.
      const k = this.easing ? -Math.expm1(-dt / 160) : Math.max(-Math.expm1(-dt / 160), 1 - 8 / gap);
      target.x = previous.x + (target.x - previous.x) * k;
      target.z = previous.z + (target.z - previous.z) * k;
    }
    this.requested = false;
    return this.focus = target;
  }
}

/** Live versus timetable: a scheduled trip and one inferred from an expired timetable are both
 * timetable trips, so one ending never hands off to the other. */
export const liveSource = (tier: string | undefined) => tier === 'live';

/** Hand off only when the followed train is gone or its source changed tier, never on a
 * same-tier path change, which is a different claim. */
export function needsHandoff(v: Followed | undefined, fix: Fix | null) {
  return v?.kind === 'train' && (!fix || fix.tier !== v.tier);
}

/** The nearest other-tier train on the same route within 2.5 km whose heading is within 90°
 * (opposite directions differ by about 180°, curves by less than 90°). A
 * timetable position can be a minute or two off the real train; same-direction trains on one
 * route run roughly 10 km apart, so 2.5 km tolerates the drift without reaching the next train. */
export function pickHandoff(last: Fix, candidates: readonly Fix[]): Fix | null {
  let best: Fix | null = null, distance = 2500;
  for (const c of candidates) {
    if (c.routeId !== last.routeId || liveSource(c.tier) === liveSource(last.tier) || !c.pathId) continue;
    if (last.heading !== undefined && c.heading !== undefined &&
        Math.abs(((c.heading - last.heading + 540) % 360) - 180) > 90) continue;
    const d = Math.hypot(c.x - last.x, c.z - last.z);
    if (d <= distance) { best = c; distance = d; }
  }
  return best;
}

const front = new THREE.Vector3(), rear = new THREE.Vector3();
/** A car counts as drawn while any part of it is on the kept side of every clipping plane on
 * its material: a board edge, or a tunnel mouth such as the North Line portal, which clips
 * NORTH_LINE_VANISH_DEPTH inside the mouth. Follow's "Underground" therefore starts exactly
 * when the last car vanishes and ends when the first car reappears. */
export function drawnCar(car: THREE.Object3D): CarPoint | null {
  if (!car.visible) return null;
  const material = (car as THREE.Mesh).material;
  const planes = (Array.isArray(material) ? material[0] : material)?.clippingPlanes ?? [];
  const half = (car.userData.lengthM ?? CAR_LENGTH) / 2;
  car.updateWorldMatrix(true, false);
  front.set(0, 2, half).applyMatrix4(car.matrixWorld);
  rear.set(0, 2, -half).applyMatrix4(car.matrixWorld);
  // Clip the car's length against every plane together: two planes can each keep one end
  // while nothing between them survives.
  let t0 = 0, t1 = 1;
  for (const p of planes) {
    const a = p.distanceToPoint(rear), b = p.distanceToPoint(front);
    if (a < 0 && b < 0) return null;
    if (a < 0) t0 = Math.max(t0, a / (a - b));
    else if (b < 0) t1 = Math.min(t1, a / (a - b));
  }
  if (t0 >= t1) return null;
  const centre = { x: (front.x + rear.x) / 2, z: (front.z + rear.z) / 2 };
  const shown = (t1 - t0) * (car.userData.daylight ?? 1);
  return shown < 1 ? { ...centre, shown } : centre;
}

/** One train's drawn cars, front first in the direction of travel. Every rail source stamps
 * `userData.consistIndex` (0 = leading) as it places a car: child order is mesh pool order,
 * which says nothing about the consist. */
export function leadFirst(cars: readonly THREE.Object3D[]) {
  // A pooled mesh that has never been placed has no index, so drop hidden ones before sorting.
  return cars.filter(c => c.visible).sort((a, b) => a.userData.consistIndex - b.userData.consistIndex)
    .flatMap(c => drawnCar(c) ?? []);
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

/** The OSM lines each MARTA service runs on inside the board (downtown-rail-cover.json). */
const LINES: Record<string, readonly string[]> = {
  'marta:route:RED': ['MARTA North Line', 'MARTA South Line'],
  'marta:route:GOLD': ['MARTA North Line', 'MARTA South Line'],
  'marta:route:BLUE': ['MARTA East Line', 'MARTA West Line', 'King Memorial Crossover'],
  'marta:route:GREEN': ['MARTA East Line', 'MARTA West Line', 'King Memorial Crossover'],
};
/** `ends` says whether each end is the way's own end (a mouth) or a cut at the board edge. */
type CoverRun = Run & { line: string | null; kind: string; ends?: readonly boolean[] };

/** The mapped cover of the service's own line at (x, z), from the nearest of its OSM ways
 * within `reach` metres (3 m past a way's ends): 'tunnel', 'covered', 'bridge' or 'open'.
 * Matching only the service's own line keeps a Red train at Five Points off the Blue tunnel
 * that crosses it, and the nearest way decides, so an open way beside a portal wins there. */
export function downtownCoverAt(routeId: string, x: number, z: number, reach = 20,
  runs: readonly CoverRun[] = downtownCover as CoverRun[]) {
  const lines = LINES[routeId];
  if (!lines) return null;
  let best: { kind: string; d: number } | null = null;
  for (const run of runs) {
    if (!run.line || !lines.includes(run.line)) continue;
    const { pts } = run;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const dx = bx - ax, dz = bz - az;
      const raw = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
      const t = Math.max(0, Math.min(1, raw));
      const d = Math.hypot(x - ax - t * dx, z - az - t * dz);
      // Only a way's own ends (its mouths) limit the reach; a cut at the board edge does not.
      const end = (raw < 0 && i === 1 && run.ends?.[0] !== false) || (raw > 1 && i === pts.length - 1 && run.ends?.[1] !== false);
      if (d <= (end ? 3 : reach) && (!best || d < best.d)) best = { kind: run.kind, d };
    }
  }
  return best?.kind ?? null;
}

/** Why a followed train has no drawn car. Downtown's baked rail cover comes first, then the
 * OSM-mapped cover of the service's own line downtown, then the North Line's mapped tunnel
 * in Midtown. Follow consults this only when no car is drawn, so the claim is keyed to where
 * City actually hides the train. */
export function trainHidden(rail: SceneManifest['rail'], routeId: string, pathId: string, s: number, x: number, z: number): Hidden {
  // A baked span is surveyed evidence for this exact position: it decides, open included.
  const span = railSpanAt(rail, pathId, s);
  if (span) return span.cover === 'covered' || span.cover === 'roofed' ? 'covered' : null;
  const mapped = downtownCoverAt(routeId, x, z);
  if (mapped === 'tunnel') return 'underground';
  if (mapped === 'covered') return 'covered';
  // Only North Line services run in that tunnel; the Crescent and freight pass beside its portal.
  return NORTH_LINE.has(routeId) && inMappedTunnel(x, z) ? 'underground' : null;
}
