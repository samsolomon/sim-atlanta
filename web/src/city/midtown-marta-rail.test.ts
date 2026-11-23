import { existsSync, readFileSync } from 'node:fs';
import { Group, type Material, type Mesh, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import type { TransportRun } from '../terrain/transport-data';
import rows from './fixtures/midtown-rail.json';
import {
  createNorthLine,
  NORTH_LINE_VANISH_DEPTH,
  northCar,
  northLinePaths,
  northLinePortalSlots,
  northLineTracks,
  portalFrame,
} from './midtown-marta-rail';
import { CAR_LENGTH } from '../vignette/cq400';
import { northLineProfile } from './midtown-marta-guideway';

const origin = { lon: -84.3916, lat: 33.7539 };
const tracks = northLineTracks(rows['brookwood-station'] as TransportRun[], -5700);
it('uses only the two complete passenger mains and keeps their tunnel ends distinct', () => {
  expect(tracks).toHaveLength(2);
  expect(tracks.map((l) => l.pts[0])).toEqual([
    [343.21, -5137.78],
    [348.19, -5140.52],
  ]);
  for (const line of tracks) expect(line.pts.at(-1)![1]).toBe(-5700);
});

const file = new URL('../../public/data/ga/routes.json', import.meta.url);
it.skipIf(!existsSync(file))(
  'places Red and Gold in both directions, and omits the covered station calls and Lindbergh short turns',
  () => {
    const rf: RoutesFile = JSON.parse(readFileSync(file, 'utf8'));
    const mapped = northLinePaths(rf, origin, tracks);
    expect(new Set([...mapped.values()].map((r) => r.route + '/' + r.dir))).toEqual(
      new Set(['marta:route:RED/1', 'marta:route:RED/-1', 'marta:route:GOLD/1', 'marta:route:GOLD/-1']),
    );
    for (const [id, r] of mapped) {
      const port = r.dir > 0 ? r.points[0] : r.points.at(-1)!;
      const position = northCar(r, port.s)!;
      expect(position.x).toBeCloseTo(r.line.pts[0][0]);
      expect(northCar(r, port.s - 60 * r.dir)).toBeNull();
      expect(northCar(r, port.s - 4 * r.dir)).not.toBeNull();
      expect(rf.paths.find((p) => p.id === id)!.routeId).toBe(r.route);
    }
    const short = rf.paths.filter(
      (p) => p.routeId.endsWith('RED') && Math.min(...p.coords.filter((_, i) => i % 2 === 1)) > 33.82,
    );
    expect(short.length).toBeGreaterThan(0);
    for (const p of short) expect(mapped.has(p.id)).toBe(false);
  },
);

it('draws the same source identity at a live or scheduled fix and retires cars when the source leaves', () => {
  const line = tracks[1],
    coords = line.pts.flatMap((p) => sceneToLonLat(origin, ...p));
  const rf = {
    paths: [{ id: 'test', coords, cum: [...line.cum], routeId: 'marta:route:RED' }],
    routes: [{ id: 'marta:route:RED', color: '#d1282f' }],
  } as unknown as RoutesFile;
  const area = new Group(),
    cars = new Group();
  const ground = () => -8.13;
  const update = createNorthLine({ group: area, groundAt: ground }, rf, origin, cars)!;
  const profile = northLineProfile(tracks, rows['brookwood-station'] as TransportRun[], ground);
  for (const tier of ['scheduled', 'live'] as const) {
    const state = {
      id: tier + '-train',
      pathId: 'test',
      routeId: 'marta:route:RED',
      s: { value: 150, tier },
      lengthM: { value: 90 },
    } as TrainState;
    const snapshot = JSON.stringify(state);
    expect(update([state], 1)).toBe(4);
    expect(
      cars.children
        .filter((c) => c.visible)
        .every((c) => {
          // Cars sit on the profile at their own distance along the track.
          let best = { d: Infinity, u: 0 };
          for (let u = 0; u <= tracks[1].length; u += 0.25) {
            const q = tracks[1].at(u),
              d = Math.hypot(q.x - c.position.x, q.z - c.position.z);
            if (d < best.d) best = { d, u };
          }
          return c.userData.trainId === state.id && Math.abs(c.position.y - profile.at(tracks[1], best.u)) < 0.02;
        }),
    ).toBe(true);
    expect(JSON.stringify(state)).toBe(snapshot);
  }
  expect(update([], 0)).toBe(0);
  expect(cars.children.some((c) => c.visible)).toBe(false);
});

it('frames one shared headwall at the more advanced mouth, wide enough for both tracks', () => {
  const f = portalFrame(tracks);
  expect(f.spacing).toBeGreaterThan(4);
  expect(f.spacing).toBeLessThan(6);
  // Both mapped mouths lie on or behind the shared face, so no car shows ahead of the hood.
  for (const line of tracks) {
    const p = line.at(0);
    expect((p.x - f.x) * f.dx + (p.z - f.z) * f.dz).toBeLessThanOrEqual(1e-6);
  }
});

it('keeps cars visible a few metres into the dark tube, then clips them', () => {
  const area = new Group(),
    cars = new Group();
  const line = tracks[1];
  const coords = line.pts.flatMap((p) => sceneToLonLat(origin, ...p));
  const rf = {
    paths: [{ id: 'test', coords, cum: [...line.cum], routeId: 'marta:route:RED' }],
    routes: [{ id: 'marta:route:RED', color: '#d1282f' }],
  } as unknown as RoutesFile;
  createNorthLine({ group: area, groundAt: () => -8.13 }, rf, origin, cars);
  const mouth = area.getObjectByName('North Line portal')!;
  expect(mouth).toBeDefined();
  // The vanish point lies inside the tube and within the half car that northCar extrapolates.
  expect(NORTH_LINE_VANISH_DEPTH).toBeGreaterThan(2);
  expect(NORTH_LINE_VANISH_DEPTH).toBeLessThan(CAR_LENGTH / 2);
  const f = portalFrame(tracks);
  const material = (() => {
    const update = createNorthLine({ group: new Group(), groundAt: () => -8.13 }, rf, origin, cars)!;
    update([{ id: 't', pathId: 'test', routeId: 'marta:route:RED', s: { value: 20, tier: 'scheduled' }, lengthM: { value: 90 } } as TrainState], 0);
    return (cars.children.find((c) => c.visible) as Mesh).material as Material;
  })();
  const [face] = material.clippingPlanes!;
  const inside = (d: number) => face.distanceToPoint(new Vector3(f.x - f.dx * d, 0, f.z - f.dz * d));
  expect(inside(NORTH_LINE_VANISH_DEPTH - 1)).toBeGreaterThan(0);
  expect(inside(NORTH_LINE_VANISH_DEPTH + 1)).toBeLessThan(0);
});

it('cuts the terrain across the whole portal mouth, just under the rail', () => {
  const f = portalFrame(tracks);
  const grid = { sample: () => 264.3, manifest: { vertical: { sceneZeroNavd88M: 323.8 } } };
  const [slot] = northLinePortalSlots(grid);
  expect(northLinePortalSlots(grid)).toHaveLength(1);
  // Bed 0.4 m under the cut floor's rail level, so the hood's dark interior has no terrain in it.
  expect(slot.start[1]).toBeCloseTo(264.3 - 323.8 - 0.4, 6);
  // From 2 m outside the face to 12 m in, across both tubes and 0.5 m past their outer walls.
  const along = (p: readonly number[]) => (p[0] - f.x) * f.dx + (p[2] - f.z) * f.dz;
  expect(along(slot.start)).toBeCloseTo(2, 6);
  expect(along(slot.end)).toBeCloseTo(-12, 6);
  expect(slot.halfWidthM).toBeGreaterThanOrEqual(f.spacing / 2 + 2.72 + 0.19 + 0.5);
});

it('frees every mesh and car pool it added when disposed', () => {
  const area = new Group(),
    cars = new Group();
  const line = tracks[1];
  const coords = line.pts.flatMap((p) => sceneToLonLat(origin, ...p));
  const rf = {
    paths: [{ id: 'test', coords, cum: [...line.cum], routeId: 'marta:route:RED' }],
    routes: [{ id: 'marta:route:RED', color: '#d1282f' }],
  } as unknown as RoutesFile;
  const north = createNorthLine({ group: area, groundAt: () => -8.13 }, rf, origin, cars)!;
  north([{ id: 't', pathId: 'test', routeId: 'marta:route:RED', s: { value: 150, tier: 'scheduled' }, lengthM: { value: 90 } } as TrainState], 0);
  expect(area.children.length).toBeGreaterThan(0);
  expect(cars.children.length).toBeGreaterThan(0);
  let disposed = 0;
  for (const root of [area, cars])
    root.traverse((o) => {
      if ((o as Mesh).geometry) (o as Mesh).geometry.addEventListener('dispose', () => disposed++);
    });
  north.dispose();
  expect(area.children).toHaveLength(0);
  expect(cars.children).toHaveLength(0);
  expect(disposed).toBeGreaterThan(3);
});
