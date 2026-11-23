import * as THREE from 'three';
import { lonLatToScene } from '../core/places';
import type { RoutesFile } from '../model/types';
import { roadWidth } from '../terrain/transport-data';
import { Builder, Line, pointInRing, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';

export const STREETCAR_ROUTE = 'marta:route:STREETCAR';
type Origin = { lon: number; lat: number };
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
type Height = (x: number, z: number) => number | null;
type RoadLike = { cls: string; sub?: string | null; name?: string | null; pts: P2[]; bridge?: boolean; tunnel?: boolean };

/** Contact wire above the railhead (estimated from Street View; typical 5.5-6 m). */
export const WIRE_HEIGHT = 5.8;
/** Pole spacing along the track (Street View: roughly 30-35 m). */
const POLE_SPACING = 32;

/**
 * One track network from the GTFS shapes, the same geometry the vehicles run on.
 * The longest path is the base loop; stretches of the other paths farther than
 * 2.5 m from track already taken are added as their own segments.
 */
export function streetcarLines(rf: Pick<RoutesFile, 'paths'>, origin: Origin) {
  const paths = rf.paths
    .filter((p) => p.routeId === STREETCAR_ROUTE)
    .map((p) => {
      const pts: P2[] = [];
      for (let i = 0; i + 1 < p.coords.length; i += 2) pts.push(lonLatToScene(origin, p.coords[i], p.coords[i + 1]));
      return new Line(pts);
    })
    .sort((a, b) => b.length - a.length);
  const lines: Line[] = [];
  const near = (x: number, z: number) =>
    lines.some((l) => l.pts.some((a, i) => i > 0 && segDist(x, z, l.pts[i - 1], a) < 2.5));
  for (const path of paths) {
    if (!lines.length) {
      lines.push(path);
      continue;
    }
    let run: P2[] = [];
    const flush = () => {
      if (run.length > 1 && new Line(run).length > 6) lines.push(new Line(run));
      run = [];
    };
    for (let s = 0; s <= path.length; s += 2) {
      const p = path.at(Math.min(s, path.length));
      if (near(p.x, p.z)) {
        if (run.length) {
          run.push([p.x, p.z]);
          flush();
        }
      } else {
        if (!run.length && s > 0) {
          const q = path.at(s - 2);
          run.push([q.x, q.z]);
        }
        run.push([p.x, p.z]);
      }
    }
    flush();
  }
  return lines;
}

/** Road surface height under a point: the nearest mapped road's own height, or ground. */
export function roadSurface(roads: readonly RoadLike[], roadHeight: (x: number, z: number, road: never) => number | null, ground: Height): Height {
  const index = new PlacementIndex<{ road: RoadLike; a: P2; b: P2 }>(16);
  for (const road of roads) {
    // The streetcar runs only on surface streets: it passes under the Connector viaduct
    // and runs on no bridge, so neither can set its height.
    if (road.tunnel || road.bridge || road.cls === 'motorway' || ['footway', 'path', 'steps', 'pedestrian', 'cycleway'].includes(road.cls)) continue;
    for (let i = 1; i < road.pts.length; i++) index.add({ road, a: road.pts[i - 1], b: road.pts[i] }, [road.pts[i - 1], road.pts[i]], 8);
  }
  return (x, z) => {
    let best: { road: RoadLike; d: number } | null = null;
    for (const { road, a, b } of index.at(x, z)) {
      const d = segDist(x, z, a, b);
      if (d < roadWidth(road) / 2 + 1 && (!best || d < best.d)) best = { road, d };
    }
    const h = best ? roadHeight(x, z, best.road as never) : null;
    return h ?? ground(x, z);
  };
}

/** Where a pole may not stand: on a drawn road, inside a building, or at a junction. */
export function poleBlocked(roads: readonly RoadLike[], buildings: readonly { rings: P2[][] }[]) {
  const lanes = new PlacementIndex<{ road: RoadLike; a: P2; b: P2 }>(16);
  const ends = new Map<string, number>();
  for (const road of roads) {
    if (['footway', 'path', 'steps', 'pedestrian', 'cycleway'].includes(road.cls)) continue;
    for (let i = 1; i < road.pts.length; i++) lanes.add({ road, a: road.pts[i - 1], b: road.pts[i] }, [road.pts[i - 1], road.pts[i]], 10);
    for (const p of road.pts) ends.set(p.join(','), (ends.get(p.join(',')) ?? 0) + 1);
  }
  const junctions = new PlacementIndex<P2>(16);
  for (const road of roads)
    for (const p of road.pts) if ((ends.get(p.join(',')) ?? 0) > 1) junctions.add(p, [p], 10);
  const footprints = new PlacementIndex<P2[]>(16);
  for (const b of buildings) if (b.rings[0]?.length > 2) footprints.add(b.rings[0], b.rings[0], 0);
  return (x: number, z: number) =>
    lanes.at(x, z).some(({ road, a, b }) => segDist(x, z, a, b) < roadWidth(road) / 2 + 0.3) ||
    junctions.at(x, z).some(([jx, jz]) => Math.hypot(jx - x, jz - z) < 9) ||
    footprints.at(x, z).some((ring) => pointInRing(x, z, ring));
}

const RAIL = '#b6b5ae',
  GROOVE = '#393c40',
  SLAB = '#9d9b94',
  POLE = '#8b8f92',
  WIRE = '#2b2d30';

/**
 * Embedded track, concrete track slab, single contact wire and curb-side poles with
 * cantilever arms, for the stretch of the network inside one board.
 */
export function buildStreetcarTrack(lines: Line[], bounds: Bounds, height: Height, blocked: (x: number, z: number) => boolean) {
  const body = new Builder(),
    wire = new Builder();
  // Half-open bounds: a segment or pole on the seam between two boards belongs to
  // exactly one of them, by its midpoint. Heights are read at the clamped point.
  const owns = (x: number, z: number) => x >= bounds.minX && x < bounds.maxX && z >= bounds.minZ && z < bounds.maxZ;
  const at = (x: number, z: number) =>
    height(THREE.MathUtils.clamp(x, bounds.minX, bounds.maxX), THREE.MathUtils.clamp(z, bounds.minZ, bounds.maxZ));
  const stations = (line: Line, step: number) => {
    const out: number[] = [];
    for (let s = 0; s < line.length; s += step) out.push(s);
    out.push(line.length);
    return out;
  };
  const poles: P2[] = [];
  for (const line of lines) {
    let prev: { x: number; z: number; nx: number; nz: number; h: number } | null = null;
    for (const s of stations(line, 1)) {
      const p = line.at(s);
      const h = at(p.x, p.z);
      const nx = -p.dz,
        nz = p.dx;
      if (h === null) {
        prev = null;
        continue;
      }
      if (prev && owns((prev.x + p.x) / 2, (prev.z + p.z) / 2)) {
        const q = prev;
        const strip = (o0: number, o1: number, lift: number, color: string) =>
          body.quad(
            [q.x + q.nx * o0, q.h + lift, q.z + q.nz * o0],
            [p.x + nx * o0, h + lift, p.z + nz * o0],
            [p.x + nx * o1, h + lift, p.z + nz * o1],
            [q.x + q.nx * o1, q.h + lift, q.z + q.nz * o1],
            color,
          );
        // Above the drawn asphalt (+0.12 on terrain) and the flat board's markings.
        strip(-1.4, 1.4, 0.15, SLAB);
        for (const o of [-0.7175, 0.7175]) {
          strip(o - 0.12, o + 0.12, 0.16, GROOVE);
          strip(o - 0.04, o + 0.04, 0.17, RAIL);
        }
      }
      prev = { x: p.x, z: p.z, nx, nz, h };
    }
    // A pole for every 32 m of track, at the first clear curb within 12 m after the
    // mark. Both boards find the same spots; only the owner draws each one.
    for (let k = 0; k * POLE_SPACING <= line.length; k++) {
      let placed: { p: ReturnType<Line['at']>; spot: P2 } | null = null;
      for (let s = k * POLE_SPACING; s <= Math.min(line.length, k * POLE_SPACING + 12) && !placed; s += 2) {
        const p = line.at(s);
        for (const off of [3.5, -3.5, 4.5, -4.5, 5.5, -5.5, 6.5, -6.5, 7.5, -7.5]) {
          const x = p.x - p.dz * off,
            z = p.z + p.dx * off;
          if (!blocked(x, z)) {
            placed = { p, spot: [x, z] };
            break;
          }
        }
      }
      if (!placed || !owns(placed.spot[0], placed.spot[1])) continue;
      const { p, spot } = placed;
      if (poles.some(([x, z]) => Math.hypot(x - spot[0], z - spot[1]) < 20)) continue;
      const h = at(p.x, p.z);
      if (h === null) continue;
      poles.push(spot);
      const g = at(spot[0], spot[1]) ?? h;
      const top = h + WIRE_HEIGHT + 0.9;
      body.box(0.22, top - g, 0.22, spot[0], (top + g) / 2, spot[1], POLE);
      // Cantilever arm from the pole across to the wire, with a short dropper.
      body.quad([spot[0], top - 0.25, spot[1]], [p.x, h + WIRE_HEIGHT + 0.35, p.z], [p.x, h + WIRE_HEIGHT + 0.45, p.z], [spot[0], top - 0.1, spot[1]], POLE);
      body.box(0.04, 0.4, 0.04, p.x, h + WIRE_HEIGHT + 0.2, p.z, POLE);
    }
    // The contact wire follows the track (pull-offs hold it over the rails on curves).
    let wprev: { x: number; y: number; z: number } | null = null;
    for (const s of stations(line, 4)) {
      const p = line.at(s),
        h = at(p.x, p.z);
      if (h === null) {
        wprev = null;
        continue;
      }
      const cur = { x: p.x, y: h + WIRE_HEIGHT, z: p.z };
      if (wprev && owns((wprev.x + cur.x) / 2, (wprev.z + cur.z) / 2)) {
        const a = wprev,
          b = cur;
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const nx = (-(b.z - a.z) / len) * 0.03,
          nz = ((b.x - a.x) / len) * 0.03;
        wire.quad([a.x - nx, a.y, a.z - nz], [b.x - nx, b.y, b.z - nz], [b.x + nx, b.y, b.z + nz], [a.x + nx, a.y, a.z + nz], WIRE);
        wire.quad([a.x, a.y - 0.03, a.z], [b.x, b.y - 0.03, b.z], [b.x, b.y + 0.03, b.z], [a.x, a.y + 0.03, a.z], WIRE);
      }
      wprev = cur;
    }
  }
  const group = new THREE.Group();
  group.name = 'Atlanta Streetcar track';
  const track = new THREE.Mesh(
    body.geometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
  );
  track.receiveShadow = true;
  track.castShadow = true;
  const wires = new THREE.Mesh(wire.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  wires.castShadow = false;
  group.add(track, wires);
  return {
    group,
    poles,
    dispose() {
      for (const m of [track, wires]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
  };
}

/** The streetcar draws its own track: keep tram runs in the data, skip their generic strips. */
export function withoutTram<T extends { terrainTransport?: { rail: { cls: string; replaced?: boolean }[] } }>(city: T): T {
  const data = city.terrainTransport;
  if (!data?.rail.some((r) => r.cls === 'tram')) return city;
  return { ...city, terrainTransport: { ...data, rail: data.rail.map((r) => (r.cls === 'tram' ? { ...r, replaced: true } : r)) } };
}
