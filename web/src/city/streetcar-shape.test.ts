import { existsSync, readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import type { RoutesFile, TrainState } from '../model/types';
import { roadWidth } from '../terrain/transport-data';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { S70_LENGTH } from '../vignette/streetcar';
import { Schedule } from '../sched/engine';
import { STREETCAR_ROUTE } from './streetcar';
import { streetcarStops } from './streetcar-stops';
import { createStreetcarCars, streetcarPaths } from './streetcar-cars';
import { filletShape, STREETCAR_RADIUS, streetcarShapes, streetcarSweptCorners } from './streetcar-shape';

afterEach(() => vi.unstubAllGlobals());
/** No body corner within this of a building wall. The raw GTFS corner at Edgewood and Park Place
 * brought the S70's tail within 0.6 m of Ten Park Place (the probe's site 1); the fillet clears it. */
const BUILDING_CLEARANCE = 1.0;
/**
 * Footprints the streetcar runs beneath, by id, each named so the exemption can't silently cover a
 * real collision. Exempt only a structure the car physically passes under.
 */
const OVERHEAD = new Map([
  // Skybridge over Carnegie Way NW (0.6 m from its centreline at (260,-526)) joining the Lanier Parking
  // deck and 200 Peachtree: a 3 m-wide unnamed Overture part with no height of its own.
  ['6a08f0c0-d808-4de4-af33-d7af31528b57', 'skybridge over Carnegie Way, Lanier deck to 200 Peachtree'],
]);
/**
 * How far past the drawn kerb (the carriageway edge) any S70 body corner may reach, per filleted
 * corner. Measured 2026-11-24. Raw GTFS corners already overshot here (290,-267 3.84 m; 286,-64
 * 2.99; -45,-594 2.44; 371,-501 2.39; 283,-501 0.93): an articulated car cuts any street corner.
 * The fillet trades up to 0.8 m more at four corners for 5.1 m less swing; the painted sidewalk
 * casing is 2.5 m. A ratchet: lower an entry when a corner improves; never raise one without review.
 */
const KERB_PAST: Record<string, number> = {
  '290,-267': 4.2,
  '286,-64': 3.85,
  '-45,-594': 3.3,
  '-43,-646': 3.05,
  '283,-501': 1.45,
  '371,-501': 1.05,
  '344,-199': 0.45,
  straight: 1.2,
};

it('turns a single-vertex corner into an 18 m arc, tangent to both legs', () => {
  const pts: P2[] = [[-60, 0], [0, 0], [0, 60]];
  const { pts: out, cum, corners } = filletShape(pts, [0, 60, 120]);
  expect(corners).toHaveLength(1);
  expect(corners[0].radius).toBeCloseTo(STREETCAR_RADIUS, 6);
  // Ends and straight legs are untouched; every arc point is 18 m from the centre at (-18, 18).
  expect(out[0]).toEqual([-60, 0]);
  expect(out[out.length - 1]).toEqual([0, 60]);
  const arc = out.filter(([x, z]) => x > -18 + 1e-6 && z < 18 - 1e-6);
  expect(arc.length).toBeGreaterThan(5);
  for (const [x, z] of arc) expect(Math.hypot(x + 18, z - 18)).toBeCloseTo(18, 6);
  // GTFS distance: kept at the ends and on the legs, monotone through the arc.
  expect(cum[0]).toBe(0);
  expect(cum[cum.length - 1]).toBe(120);
  const tangentIn = out.findIndex(([x, z]) => Math.abs(x + 18) < 1e-6 && Math.abs(z) < 1e-6);
  expect(cum[tangentIn]).toBeCloseTo(42, 6);
  for (let i = 1; i < cum.length; i++) expect(cum[i]).toBeGreaterThanOrEqual(cum[i - 1]);
});

it('folds a corner with short legs into one compound turn instead of a kink', () => {
  // A 90 degree turn split over two vertices 6 m apart: neither leg holds an 18 m tangent alone.
  const pts: P2[] = [[-60, 0], [0, 0], [4.24, 4.24], [4.24, 64]];
  const { pts: out, corners } = filletShape(pts, [0, 60, 66, 126]);
  expect(corners).toHaveLength(1);
  expect(corners[0].turn).toBeCloseTo(Math.PI / 2, 2);
  expect(corners[0].radius).toBeGreaterThan(15);
  // No heading change sharper than one arc step anywhere.
  for (let i = 2; i < out.length; i++) {
    const a = Math.atan2(out[i - 1][1] - out[i - 2][1], out[i - 1][0] - out[i - 2][0]);
    const b = Math.atan2(out[i][1] - out[i - 1][1], out[i][0] - out[i - 1][0]);
    expect(Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)))).toBeLessThan(0.1);
  }
});

const data = (f: string) => new URL('../../public/data/' + f, import.meta.url);
const staged = ['ga/routes.json', 'ga/timetable.json', 'scene/downtown/scene.json', 'scene/downtown/vignette.json'].every((f) => existsSync(data(f)));

it.skipIf(!staged)('builds the rails and the cars from one shared filleted shape, cheaply', () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const origin = JSON.parse(readFileSync(data('scene/downtown/scene.json')).toString()).origin;
  const t0 = performance.now();
  const shapes = streetcarShapes(rf, origin, STREETCAR_ROUTE);
  const ms = performance.now() - t0;
  expect(shapes.length).toBeGreaterThan(0);
  // A few ms per line even at the A16's 6x CPU throttle.
  expect((ms * 6) / shapes.length).toBeLessThan(4);
  expect(streetcarShapes(rf, origin, STREETCAR_ROUTE)).toBe(shapes);
  // Platforms are straight, 22 m long: every served stop stays at least 11 m clear of an arc.
  const schedule = new Schedule(rf, JSON.parse(readFileSync(data('ga/timetable.json')).toString()), JSON.parse(readFileSync(data('ga/vehicle-types.json')).toString()));
  const arcs = shapes.flatMap((sh) => sh.corners).filter((c) => c.turn > 0.2);
  for (const stop of streetcarStops(rf, origin, (p, id) => schedule.stopDistances(p, id).length > 0))
    for (const c of arcs) expect(Math.hypot(c.at[0] - stop.x, c.at[1] - stop.z) - c.radius * Math.tan(c.turn / 2), stop.name).toBeGreaterThan(11);
  const paths = streetcarPaths(rf, origin);
  for (const s of shapes) expect(paths.get(s.id)!.line.pts).toEqual(s.pts);
  // Every raw GTFS vertex the arcs bypass is a filleted corner.
  expect(shapes.flatMap((s) => s.corners).filter((c) => c.turn > Math.PI / 3).length).toBeGreaterThanOrEqual(8);
});

it.skipIf(!staged)('keeps every S70 section within 1 m of swing, off buildings and kerb to kerb at every corner', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const origin = JSON.parse(readFileSync(data('scene/downtown/scene.json')).toString()).origin;
  type V = { bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; buildings: { rings: P2[][] }[];
    roads: { cls: string; sub?: string | null; pts: P2[]; tunnel?: boolean; width?: number }[] };
  // The downtown board carries the streets and footprints the loop runs between; east of its edge
  // (x > 1000, the Edgewood leg) another board owns them, so clearance is checked on downtown.
  const board = JSON.parse(readFileSync(data('scene/downtown/vignette.json')).toString()) as V;
  const inside = (x: number, z: number) => x > board.bounds.minX + 5 && x < board.bounds.maxX - 5 && z > board.bounds.minZ + 5 && z < board.bounds.maxZ - 5;
  const cell = 25;
  const index = <T,>(map: Map<string, T[]>, x0: number, z0: number, x1: number, z1: number, item: T) => {
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++)
      for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) (map.get(i + ',' + j) ?? map.set(i + ',' + j, []).get(i + ',' + j)!).push(item);
  };
  const buildings = new Map<string, P2[][]>();
  for (const b of board.buildings as { id: string; rings: P2[][] }[]) {
    if (!b.rings.length || OVERHEAD.has(b.id)) continue;
    const r = b.rings[0];
    index(buildings, Math.min(...r.map((p) => p[0])), Math.min(...r.map((p) => p[1])), Math.max(...r.map((p) => p[0])), Math.max(...r.map((p) => p[1])), r);
  }
  // The street surface the rails embed in (roadSurface): every surface road but paths and decks.
  const notStreet = new Set(['motorway', 'footway', 'path', 'steps', 'pedestrian', 'cycleway']);
  const segs = new Map<string, { a: P2; b: P2; half: number }[]>();
  for (const r of board.roads) {
    if (notStreet.has(r.cls) || r.tunnel || (r as { bridge?: boolean }).bridge) continue;
    const half = roadWidth(r as never) / 2, reach = half + 8;
    for (let k = 1; k < r.pts.length; k++) {
      const a = r.pts[k - 1], b = r.pts[k];
      index(segs, Math.min(a[0], b[0]) - reach, Math.min(a[1], b[1]) - reach, Math.max(a[0], b[0]) + reach, Math.max(a[1], b[1]) + reach, { a, b, half });
    }
  }
  const at = <T,>(map: Map<string, T[]>, x: number, z: number) => map.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)) ?? [];
  // Inside a footprint or within BUILDING_CLEARANCE of its wall.
  const nearBuilding = (x: number, z: number) =>
    at(buildings, x, z).some((r) => pointInRing(x, z, r) || r.some((q, k) => segDist(x, z, r[k ? k - 1 : r.length - 1], q) < BUILDING_CLEARANCE));
  /** How far past the drawn kerb (the carriageway edge) a point lies; negative on the street. */
  const pastKerb = (x: number, z: number) => Math.min(8, ...at(segs, x, z).map((q) => segDist(x, z, q.a, q.b) - q.half));

  const cars = createStreetcarCars(rf, origin, () => 0, []);
  const paths = streetcarPaths(rf, origin);
  const lineDist = (line: { pts: P2[] }, x: number, z: number) =>
    Math.min(...line.pts.slice(1).map((b, k) => segDist(x, z, line.pts[k], b)));
  let worst = { swing: 0, at: '' }, poses = 0;
  // Kerb overshoot, worst per filleted corner (or 'straight' away from every corner).
  const allCorners = streetcarShapes(rf, origin, STREETCAR_ROUTE).flatMap((sh) => sh.corners).filter((c) => c.turn > 0.5);
  const siteOf = (x: number, z: number) => {
    const c = allCorners.find((k) => Math.hypot(k.at[0] - x, k.at[1] - z) < 40);
    return c ? `${Math.round(c.at[0])},${Math.round(c.at[1])}` : 'straight';
  };
  const overshoot = new Map<string, number>();
  const bad: string[] = [];
  for (const [id, path] of paths) {
    const first = path.cum[0], last = path.cum[path.cum.length - 1];
    for (let s = first + S70_LENGTH / 2; s < last - S70_LENGTH / 2; s += 1) {
      const state = { id: 't', pathId: id, routeId: STREETCAR_ROUTE, s: { value: s, tier: 'scheduled' }, lengthM: { value: S70_LENGTH } } as TrainState;
      if (cars.update([state], 0) !== 1) continue;
      poses++;
      for (const mesh of cars.cars()) {
        mesh.updateMatrixWorld(true);
        const half = mesh.userData.lengthM / 2, side = 1.33;
        for (const [u, v] of [[-half, -side], [-half, side], [half, -side], [half, side], [0, -side], [0, side]]) {
          const p = new Vector3(v, 0, u).applyMatrix4(mesh.matrixWorld);
          const swing = lineDist(path.line, p.x, p.z) - side;
          if (swing > worst.swing) worst = { swing, at: `${id} s ${s.toFixed(0)} (${p.x.toFixed(0)},${p.z.toFixed(0)})` };
          if (!inside(p.x, p.z)) continue;
          if (nearBuilding(p.x, p.z)) bad.push(`at a building: ${id} s ${s.toFixed(0)} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
          const past = pastKerb(p.x, p.z);
          if (past > 0) {
            const site = siteOf(p.x, p.z);
            overshoot.set(site, Math.max(overshoot.get(site) ?? 0, past));
          }
        }
      }
    }
  }
  for (const [site, past] of overshoot) expect(past, `kerb overshoot at ${site}`).toBeLessThanOrEqual(KERB_PAST[site] ?? 0);
  expect(poses).toBeGreaterThan(1000);
  expect(worst.swing, worst.at).toBeLessThanOrEqual(1.0);
  expect([...new Set(bad)].slice(0, 20)).toEqual([]);
});

it.skipIf(!staged)('moves each downtown corner toward the built track OSM maps, not away from it', () => {
  // Overture/OSM map the streetcar's own rails (terrainTransport tram runs) on the downtown board.
  // Where they exist, each filleted arc runs close to them; the raw GTFS corner was up to 14 m off
  // (Edgewood at Park Place). The kerb overshoot above is the street model's square corners, not
  // the track leaving the street.
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const origin = JSON.parse(readFileSync(data('scene/downtown/scene.json')).toString()).origin;
  const v = JSON.parse(readFileSync(data('scene/downtown/vignette.json')).toString());
  const trams: P2[][] = (v.terrainTransport?.rail ?? []).filter((r: { cls?: string }) => r.cls === 'tram').map((r: { pts: P2[] }) => r.pts);
  expect(trams.length).toBeGreaterThan(0);
  const toTram = (x: number, z: number) => Math.min(...trams.flatMap((t) => t.slice(1).map((b, k) => segDist(x, z, t[k], b))));
  let checked = 0;
  for (const shape of streetcarShapes(rf, origin, STREETCAR_ROUTE))
    for (const c of shape.corners.filter((k) => k.turn > 0.5)) {
      const raw = toTram(c.at[0], c.at[1]);
      if (raw > 30) continue; // no mapped tram near this corner (the Edgewood leg's board)
      const arc = shape.pts.filter((p) => { const d = Math.hypot(p[0] - c.at[0], p[1] - c.at[1]); return d > 1 && d < c.shift + 20; });
      const mean = arc.reduce((sum, p) => sum + toTram(p[0], p[1]), 0) / arc.length;
      expect(mean, `${shape.id} corner ${c.at.map((n) => n.toFixed(0)).join(',')}`).toBeLessThanOrEqual(Math.max(5, raw));
      checked++;
    }
  expect(checked).toBeGreaterThanOrEqual(8);
});

it.skipIf(!staged)('exports a swept polygon around every sharp filleted corner for the ground paint', () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const origin = JSON.parse(readFileSync(data('scene/downtown/scene.json')).toString()).origin;
  const swept = streetcarSweptCorners(rf, origin, STREETCAR_ROUTE);
  expect(swept.length).toBeGreaterThanOrEqual(10);
  // Each polygon covers its corner's arc: every arc point lies inside one.
  for (const shape of streetcarShapes(rf, origin, STREETCAR_ROUTE))
    for (const c of shape.corners.filter((k) => k.turn >= 0.5)) {
      const mid = shape.pts.reduce((best, p) => (Math.hypot(p[0] - c.at[0], p[1] - c.at[1]) < Math.hypot(best[0] - c.at[0], best[1] - c.at[1]) ? p : best));
      expect(swept.some((poly) => pointInRing(mid[0], mid[1], poly)), `${shape.id} ${c.at.join(',')}`).toBe(true);
    }
});
