import { existsSync, readFileSync } from 'node:fs';
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { expect, it } from 'vitest';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import type { TransportRun } from '../terrain/transport-data';
import rows from './fixtures/midtown-rail.json';
import { createNorthLine, northCar, northLinePaths, northLineTracks, portalFrame } from './midtown-marta-rail';

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
  const tread = new Mesh(
    new PlaneGeometry(2000, 2000)
      .toNonIndexed()
      .rotateX(-Math.PI / 2)
      .translate(500, -8, -5400),
    new MeshBasicMaterial(),
  );
  tread.name = 'Freight track';
  area.add(tread);
  const update = createNorthLine(area, rf, origin, cars)!;
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
      cars.children.filter((c) => c.visible).every((c) => c.userData.trainId === state.id && c.position.y === -8),
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
