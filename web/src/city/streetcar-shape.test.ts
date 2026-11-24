import { existsSync, readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import type { RoutesFile, TrainState } from '../model/types';
import { roadWidth } from '../terrain/transport-data';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { S70_LAYOUT, S70_LENGTH } from '../vignette/streetcar';
import { STREETCAR_ROUTE } from './streetcar';
import { alongAt, createStreetcarCars, streetcarPaths } from './streetcar-cars';
import { filletShape, STREETCAR_RADIUS, streetcarShapes } from './streetcar-shape';

afterEach(() => vi.unstubAllGlobals());
/** A body corner may sit this far past the drawn carriageway: the 2.5 m sidewalk casing the ground map paints. */
const KERB_TOLERANCE = 2.5;

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
const staged = ['ga/routes.json', 'scene/downtown/scene.json', 'scene/downtown/vignette.json'].every((f) => existsSync(data(f)));

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
  const cell = 25, grid = new Map<string, (() => boolean)[]>();
  const index = <T,>(map: Map<string, T[]>, x0: number, z0: number, x1: number, z1: number, item: T) => {
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++)
      for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) (map.get(i + ',' + j) ?? map.set(i + ',' + j, []).get(i + ',' + j)!).push(item);
  };
  void grid;
  const buildings = new Map<string, P2[][]>();
  for (const b of board.buildings) {
    if (!b.rings.length) continue;
    const r = b.rings[0];
    index(buildings, Math.min(...r.map((p) => p[0])), Math.min(...r.map((p) => p[1])), Math.max(...r.map((p) => p[0])), Math.max(...r.map((p) => p[1])), r);
  }
  const streets = new Set(['residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk', 'living_street', 'service']);
  const segs = new Map<string, { a: P2; b: P2; reach: number }[]>();
  for (const r of board.roads) {
    if (!streets.has(r.cls) || r.tunnel) continue;
    const reach = roadWidth(r as never) / 2 + KERB_TOLERANCE;
    for (let k = 1; k < r.pts.length; k++) {
      const a = r.pts[k - 1], b = r.pts[k];
      index(segs, Math.min(a[0], b[0]) - reach, Math.min(a[1], b[1]) - reach, Math.max(a[0], b[0]) + reach, Math.max(a[1], b[1]) + reach, { a, b, reach });
    }
  }
  const at = <T,>(map: Map<string, T[]>, x: number, z: number) => map.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)) ?? [];
  const inBuilding = (x: number, z: number) => at(buildings, x, z).some((r) => pointInRing(x, z, r));
  const onStreet = (x: number, z: number) => at(segs, x, z).some((q) => segDist(x, z, q.a, q.b) <= q.reach);

  const cars = createStreetcarCars(rf, origin, () => 0, []);
  const paths = streetcarPaths(rf, origin);
  const lineDist = (line: { pts: P2[] }, x: number, z: number) =>
    Math.min(...line.pts.slice(1).map((b, k) => segDist(x, z, line.pts[k], b)));
  let worst = { swing: 0, at: '' }, poses = 0;
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
          if (inBuilding(p.x, p.z)) bad.push(`in a building: ${id} s ${s.toFixed(0)} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
          if (!onStreet(p.x, p.z)) {
            const over = Math.min(...board.roads.filter((r) => streets.has(r.cls) && !r.tunnel).flatMap((r) => r.pts.slice(1).map((b, k) => segDist(p.x, p.z, r.pts[k], b) - roadWidth(r as never) / 2 - KERB_TOLERANCE)));
            bad.push(`off the street by ${over.toFixed(1)}: ${id} s ${s.toFixed(0)} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
          }
        }
      }
    }
    void alongAt;
  }
  const sites = new Map<string, number>();
  for (const b of bad) { const m = b.match(/^(.*?):.* at (-?\d+)\.\d,(-?\d+)/)!; const k = m[1].replace(/by ([\d.]+)/, (_, v) => 'by ' + Math.round(+v)) + ' ~' + Math.round(+m[2] / 10) * 10 + ',' + Math.round(+m[3] / 10) * 10; sites.set(k, (sites.get(k) ?? 0) + 1); }
  console.log('SITES ' + [...sites].map(([k, n]) => k + ' x' + n).join(' | '));
  console.log(`streetcar swing worst ${worst.swing.toFixed(2)} m at ${worst.at}; ${poses} poses; ${bad.length} clearance misses`);
  expect(poses).toBeGreaterThan(1000);
  expect(worst.swing).toBeLessThanOrEqual(1.0);
  expect([...new Set(bad)].slice(0, 20)).toEqual([]);
  void S70_LAYOUT;
});
