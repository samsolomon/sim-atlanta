/**
 * Live MARTA buses in City (tier: live, real present only). Fixes come from the app's shared
 * LiveBuses feed (main.ts already polls /api/marta/bus once for Map and City, so City adds no
 * requests). Each new reported fix is snapped once to the nearest rendered street, through a
 * spatial index, then the bus glides there. Buses sit on the drawn surface: at-grade streets are
 * painted onto the terrain (groundAt); street bridges sample the drawn tread triangles through
 * createSurfaceTransport's deckAt. Stale fixes expire in LiveBuses; off the real present, or with
 * no feed, City shows no buses at all rather than guessing.
 */
import * as THREE from 'three';
import { roadWidth, type TerrainCity, type TransportRun } from '../terrain/transport-data';
import type { VData } from '../vignette/world';
import type { LiveBus } from '../model/types';
import { makeProjector } from '../core/scene-data';
import { segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { BUS_LENGTH, busGeometry, busMaterial } from '../vignette/xcelsior';
import { POOL, type PoolSink } from './headlight-pools';

type GroundAt = (x: number, z: number) => number | null;
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Streets a MARTA bus runs on (no freeways, ramps, alleys or footways). */
export const BUS_STREETS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'trunk']);
const SNAP_M = 25;
const GLIDE_MS = 8000;
/** Longest straight glide between two reports on one street (m); further jumps are placed. */
const MAX_GLIDE_M = 150;
const MAX = 64;
const BUS_WIDTH = 2.6;

/**
 * Every street a bus can be drawn on. Ordinary at-grade streets come from `vd.roads`;
 * `terrainTransport.roads` holds only the scoped mixed-way intervals and the street bridges,
 * so the index needs both (City's groundRoads uses the same split). Without measured ground,
 * the flat board's own roads, bridges included.
 */
export function busRuns(vd: TerrainCity, measured: boolean): TransportRun[] {
  const asRun = (r: VData['roads'][number]): TransportRun => ({ kind: r.bridge ? 'bridge' : 'ground', cls: r.cls, name: measured ? r.name : null, pts: r.pts });
  return measured && vd.terrainTransport
    ? [...vd.roads.filter((r) => !r.bridge && !r.tunnel).map(asRun), ...vd.terrainTransport.roads]
    : vd.roads.filter((r) => !r.tunnel).map(asRun);
}

interface Snap {
  x: number;
  z: number;
  a: number; // heading, atan2(dx, dz)
  run: TransportRun;
}

interface Shown {
  id: string;
  at: number;
  from: Snap;
  to: Snap;
  t0: number;
}

export class CityBuses {
  /** Headlight pools at night on High (city/headlight-pools.ts); unset on Low. */
  lights: PoolSink | null = null;
  readonly mesh: THREE.InstancedMesh;
  readonly night = { value: 0 };
  /** Footprints drawn this frame (after update), for traffic and readouts. */
  readonly positions: { id: string; x: number; y: number; z: number; a: number }[] = [];
  /** Snaps performed (one per new reported fix), for tests. */
  snaps = 0;
  private shown = new Map<string, Shown>();
  /** Fixes that didn't snap (off the board, away from bus streets): id → report time. */
  private rejected = new Map<string, number>();
  private index = new PlacementIndex<[P2, P2, TransportRun]>();
  private project: (lon: number, lat: number) => [number, number];
  private obj = new THREE.Object3D();

  constructor(private opts: {
    runs: TransportRun[];
    groundAt: GroundAt;
    deckAt: (x: number, z: number, part: TransportRun) => number | null;
    origin: { lon: number; lat: number };
    bounds: Bounds;
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material;
  }) {
    this.project = makeProjector(opts.origin);
    for (const run of opts.runs) {
      if (!BUS_STREETS.has(run.cls)) continue;
      for (let i = 1; i < run.pts.length; i++) {
        const seg: [P2, P2, TransportRun] = [run.pts[i - 1], run.pts[i], run];
        this.index.add(seg, [run.pts[i - 1], run.pts[i]], SNAP_M);
      }
    }
    this.mesh = new THREE.InstancedMesh(opts.geometry ?? busGeometry(), opts.material ?? busMaterial(this.night), MAX);
    this.mesh.count = 0;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Live buses';
  }

  /** Snap a fix to the nearest indexed street within 25 m, keeping right of travel. */
  snap(b: LiveBus): Snap | null {
    this.snaps++;
    const [x, z] = this.project(b.position.value.lon, b.position.value.lat);
    const { bounds: bd } = this.opts;
    if (x < bd.minX + 4 || x > bd.maxX - 4 || z < bd.minZ + 4 || z > bd.maxZ - 4) return null;
    // Reported heading in scene terms (atan2(dx, dz)); GTFS bearing is clockwise from north (−z).
    const want = b.bearing ? Math.atan2(Math.sin((b.bearing.value * Math.PI) / 180), -Math.cos((b.bearing.value * Math.PI) / 180)) : null;
    let best: { d: number; score: number; a: P2; c: P2; run: TransportRun } | null = null;
    for (const [a, c, run] of this.index.at(x, z)) {
      const d = segDist(x, z, a, c);
      if (d > SNAP_M) continue;
      // Where streets cross (or one passes under a bridge) the nearest is ambiguous: prefer the
      // one running the way the bus reports it is heading.
      const across = want === null ? 0 : Math.abs(Math.sin(want - Math.atan2(c[0] - a[0], c[1] - a[1])));
      const score = d + 15 * across;
      if (!best || score < best.score) best = { d, score, a, c, run };
    }
    if (!best) return null;
    const [ax, az] = best.a, [cx, cz] = best.c;
    const l2 = (cx - ax) ** 2 + (cz - az) ** 2 || 1;
    const t = Math.min(1, Math.max(0, ((x - ax) * (cx - ax) + (z - az) * (cz - az)) / l2));
    let a = Math.atan2(cx - ax, cz - az);
    // GTFS bearing: degrees clockwise from north; scene north is −z.
    if (want !== null && Math.cos(want - a) < 0) a += Math.PI;
    // Right of travel: a quarter of the carriageway, at most one lane (2.5 m).
    const lane = Math.min(2.5, roadWidth(best.run) / 4);
    return { x: ax + (cx - ax) * t - Math.cos(a) * lane, z: az + (cz - az) * t + Math.sin(a) * lane, a, run: best.run };
  }

  /** A pool from the front bumper forward, on this bus's own street; none where it has no surface. */
  private light(x: number, z: number, a: number, run: TransportRun) {
    const fx = Math.sin(a), fz = Math.cos(a);
    const nx = x + fx * BUS_LENGTH / 2, nz = z + fz * BUS_LENGTH / 2;
    const ex = nx + fx * POOL.bus.length, ez = nz + fz * POOL.bus.length;
    const ny = this.surface(nx, nz, run), ey = this.surface(ex, ez, run);
    if (ny !== null && ey !== null) this.lights!.add(nx, ny, nz, ex, ey, ez, POOL.bus.width);
  }

  /** Surface height for a bus at (x, z) on `run`: bridge tread, or the painted terrain. */
  private surface(x: number, z: number, run: TransportRun): number | null {
    return run.kind === 'bridge' ? this.opts.deckAt(x, z, run) : this.opts.groundAt(x, z);
  }

  /**
   * Call every frame. `fixes` is null off the real present or without a feed: nothing shown.
   * Otherwise the current (unexpired) fixes from the shared LiveBuses feed.
   */
  update(fixes: LiveBus[] | null, now = performance.now()) {
    this.positions.length = 0;
    if (!fixes) {
      this.shown.clear();
      this.rejected.clear();
      this.mesh.count = 0;
      return;
    }
    const seen = new Set<string>();
    for (const b of fixes) {
      const at = b.at ?? 0;
      const prev = this.shown.get(b.id);
      if (prev && prev.at === at) {
        seen.add(b.id); // same report: no new snap
        continue;
      }
      if (this.rejected.get(b.id) === at) continue; // same unsnappable report: don't retry every frame
      const p = this.snap(b);
      if (!p) {
        this.rejected.set(b.id, at); // off the board or away from any bus street: not shown
        this.shown.delete(b.id);
        continue;
      }
      this.rejected.delete(b.id);
      seen.add(b.id);
      const cur = prev && this.lerp(prev, now);
      // Glide only along the same street and a plausible distance; a report that turned a corner
      // or jumped streets is placed where it was reported, never driven through a block.
      const glide = cur && cur.run === p.run && Math.hypot(p.x - cur.x, p.z - cur.z) < MAX_GLIDE_M && chordOnRun(cur, p, p.run);
      this.shown.set(b.id, { id: b.id, at, from: glide ? cur : p, to: p, t0: now });
    }
    const live = new Set(fixes.map((b) => b.id));
    for (const id of [...this.shown.keys()]) if (!seen.has(id)) this.shown.delete(id);
    for (const id of [...this.rejected.keys()]) if (!live.has(id)) this.rejected.delete(id);
    let i = 0;
    for (const s of this.shown.values()) {
      if (i >= MAX) break;
      const p = this.lerp(s, now);
      const done = now - s.t0 >= GLIDE_MS;
      const run = done || s.from.run === s.to.run ? s.to.run : null;
      // On one street (or arrived): its drawn surface. Mid-glide between streets: blend ends.
      let y = run ? this.surface(p.x, p.z, run) : null;
      if (y === null) {
        const y0 = this.surface(s.from.x, s.from.z, s.from.run), y1 = this.surface(s.to.x, s.to.z, s.to.run);
        if (y0 === null && y1 === null) continue; // nowhere drawn to stand: hide rather than float
        const e = smooth(Math.min(1, (now - s.t0) / GLIDE_MS));
        y = y0 === null ? y1! : y1 === null ? y0 : y0 + (y1 - y0) * e;
      }
      this.positions.push({ id: s.id, x: p.x, y, z: p.z, a: p.a });
      this.obj.position.set(p.x, y, p.z);
      this.obj.rotation.set(0, p.a, 0);
      this.obj.updateMatrix();
      this.mesh.setMatrixAt(i++, this.obj.matrix);
      if (run && this.lights?.active && this.lights.inRange(p.x, y, p.z)) this.light(p.x, p.z, p.a, run);
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Would an illustrative car (centre, length, heading = atan2(dx, dz)) overlap a drawn bus?
   * Oriented-rectangle test with a 1 m margin; levels more than 3 m apart don't interact.
   */
  occupies(x: number, y: number, z: number, lengthM: number, headingRad: number) {
    const car = { x, z, a: headingRad, hl: lengthM / 2 + 0.5, hw: 1.0 + 0.5 };
    return this.positions.some((b) =>
      Math.abs(b.y - y) < 3 && Math.hypot(b.x - x, b.z - z) < BUS_LENGTH / 2 + lengthM / 2 + 3 &&
      obbOverlap(car, { x: b.x, z: b.z, a: b.a, hl: BUS_LENGTH / 2 + 0.5, hw: BUS_WIDTH / 2 + 0.5 }));
  }

  summary() {
    return { count: this.positions.length };
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  private lerp(s: Shown, now: number): Snap {
    const e = smooth(Math.min(1, (now - s.t0) / GLIDE_MS));
    const da = Math.atan2(Math.sin(s.to.a - s.from.a), Math.cos(s.to.a - s.from.a));
    return { x: s.from.x + (s.to.x - s.from.x) * e, z: s.from.z + (s.to.z - s.from.z) * e, a: s.from.a + da * e, run: e < 1 ? s.from.run : s.to.run };
  }
}

/**
 * Does the straight glide from a to b stay on the street? Around a bend the chord can cut across a
 * block, so sample it and require every sample within a carriageway of the run's centreline.
 */
function chordOnRun(a: { x: number; z: number }, b: { x: number; z: number }, run: TransportRun) {
  const limit = roadWidth(run) / 2 + 2;
  for (let k = 1; k < 8; k++) {
    const x = a.x + ((b.x - a.x) * k) / 8, z = a.z + ((b.z - a.z) * k) / 8;
    let d = Infinity;
    for (let i = 1; i < run.pts.length; i++) d = Math.min(d, segDist(x, z, run.pts[i - 1], run.pts[i]));
    if (d > limit) return false;
  }
  return true;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

type Box = { x: number; z: number; a: number; hl: number; hw: number };
/** Separating-axis overlap of two rectangles (half length along heading, half width across). */
function obbOverlap(p: Box, q: Box) {
  const axes = [p.a, p.a + Math.PI / 2, q.a, q.a + Math.PI / 2].map((a) => [Math.sin(a), Math.cos(a)]);
  const dx = q.x - p.x, dz = q.z - p.z;
  const extent = (b: Box, [ux, uz]: number[]) => {
    const fx = Math.sin(b.a), fz = Math.cos(b.a);
    return b.hl * Math.abs(fx * ux + fz * uz) + b.hw * Math.abs(-fz * ux + fx * uz);
  };
  return axes.every((u) => Math.abs(dx * u[0] + dz * u[1]) <= extent(p, u) + extent(q, u));
}
