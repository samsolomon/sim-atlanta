import { westsideName } from '../terrain/westside-path';
import { figureLooks } from './figure-looks';
import { hashStr, Line, pointInRing, rng, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import type { VRoad } from '../vignette/world';
import { roadWidth, type TerrainCity } from '../terrain/transport-data';

type GroundAt = (x: number, z: number) => number | null;
export interface Walkway { line: Line; from: number; to: number; trail: boolean }
export interface Traveller { way: Walkway; rider: boolean; phase: number; speed: number; size: number; look: number }

export function travelSpeed(rider: boolean, fraction: number) {
  return rider ? 3.5 + fraction * 1.1 : 1.05 + fraction * .45;
}

export function strideAngle(rider: boolean, metres: number) {
  return metres * (rider ? 1.55 : 4.1);
}

const carriageways = new Set(['service', 'residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway', 'living_street']);

// Some mapped sidewalks disappear under a building or into asphalt at this board's
// resolution. Keep only the walkable portions of the lines actually painted on it.
export function cityTravellers(city: TerrainCity, ground: GroundAt, low: boolean): Traveller[] {
  // Each footprint carries its outer box, so most candidates are rejected without a ring test.
  const buildings = new PlacementIndex<{ rings: P2[][]; x0: number; x1: number; z0: number; z1: number }>();
  for (const { rings } of city.buildings) {
    if (!rings.length) continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of rings[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    buildings.add({ rings, x0, x1, z0, z1 }, rings[0]);
  }
  const lanes = new PlacementIndex<{ a: P2; b: P2; half: number }>();
  const roads = city.roads.filter(r => !r.bridge && !r.tunnel);
  const groundRuns = city.terrainTransport?.roads.filter(r => r.kind === 'ground') ?? [];
  for (const r of [...roads, ...groundRuns]) {
    if (!carriageways.has(r.cls)) continue;
    const half = roadWidth(r) / 2;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i];
      lanes.add({ a, b, half }, [a, b], half + 1);
    }
  }
  const { minX, maxX, minZ, maxZ } = city.bounds;
  function usable(x: number, z: number, y = ground(x, z)) {
    return x > minX + 1 && x < maxX - 1 && z > minZ + 1 && z < maxZ - 1
      && y !== null
      && !buildings.at(x, z).some(({ rings: r, x0, x1, z0, z1 }) => x >= x0 && x <= x1 && z >= z0 && z <= z1
        && pointInRing(x, z, r[0]) && !r.some((h, i) => i > 0 && pointInRing(x, z, h)))
      && !lanes.at(x, z).some(l => segDist(x, z, l.a, l.b) < l.half + .3);
  }

  const selected = new Map<string, Walkway>();
  const trails: Walkway[] = [];
  function keep(way: Walkway) {
    if (way.to - way.from < (way.trail ? 22 : 30)) return;
    if (way.trail) { trails.push(way); return; }
    const mid = way.line.at((way.from + way.to) / 2);
    const station = Math.hypot(mid.x - 495, mid.z - 395) < 230;
    const spacing = station ? 68 : low ? 246 : 168;
    const key = [spacing, Math.floor(mid.x / spacing), Math.floor(mid.z / spacing)].join(',');
    const old = selected.get(key);
    if (!old || way.to - way.from > old.to - old.from) selected.set(key, way);
  }
  function select(r: VRoad) {
    const trail = r.name === westsideName;
    if (r.cls !== 'footway' || (!trail && r.sub !== 'sidewalk') || r.pts.length < 2) return;
    // Work only on complete on-board trail pieces. The bridge requires its own deck alignment.
    if (trail && r.pts.some(([x, z]) => x < minX || x > maxX || z < minZ || z > maxZ)) return;
    const line = new Line(r.pts);
    if (line.length - 4 < (trail ? 22 : 30)) return;
    let start: number | undefined;
    let previousHeight: number | null = null;
    for (let s = 2; s <= line.length - 2; s += 3) {
      const p = line.at(s);
      const height = ground(p.x, p.z);
      // Sharp DEM steps can occur where downtown streets cross real structures.
      // Keep a walking section on one side of a rise steeper than one in four.
      const gradeOK = height !== null && (previousHeight === null || Math.abs(height - previousHeight) <= 3 * .25);
      previousHeight = height;
      const clear = gradeOK && usable(p.x, p.z, height)
        && usable(p.x + p.nx * .55, p.z + p.nz * .55)
        && usable(p.x - p.nx * .55, p.z - p.nz * .55);
      if (clear && start === undefined) start = s;
      if (start !== undefined && (!clear || s + 3 > line.length - 2)) {
        keep({ line, from: start, to: clear ? s : s - 3, trail });
        start = undefined;
      }
    }
  }
  for (const r of roads) select(r);

  const travellers: Traveller[] = [];
  for (const way of [...trails, ...selected.values()]) {
    const span = way.to - way.from;
    const random = rng(hashStr(JSON.stringify([way.line.pts[0], way.from, way.to])));
    const trail = way.trail;
    const count = trail ? Math.max(2, Math.round(span / 19)) : Math.min(4, Math.ceil(span / 62));
    const offset = random();
    for (let i = 0; i < count; i++) {
      const rider = trail && i % 2 === 0;
      travellers.push({ way, rider, phase: (offset + i / count) * 2 * span,
        speed: travelSpeed(rider, random()),
        size: .94 + random() * .11, look: Math.floor(random() * figureLooks.length) });
    }
  }
  return travellers;
}

// Absolute scene time makes pausing, seeking and re-entering City reproduce a pose.
// Turn back at the end of each verified section and keep right on the return trip.
export function travellerAt(person: Traveller, seconds: number) {
  const { way, speed, phase } = person;
  const span = way.to - way.from, period = 2 * span;
  const u = ((seconds * speed + phase) % period + period) % period;
  const dir = u < span ? 1 : -1;
  const p = way.line.at(way.from + (dir === 1 ? u : period - u));
  // Ease across the centreline over the final metre of a turnaround.
  const offset = -.38 * dir * Math.min(1, u, Math.abs(span - u), period - u);
  return { x: p.x + offset * p.nx, z: p.z + offset * p.nz,
    angle: Math.atan2(dir * p.dx, dir * p.dz), stride: Math.sin(strideAngle(person.rider, seconds * speed + phase)) };
}
