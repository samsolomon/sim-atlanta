/**
 * Pins the measurable claims in docs/georgia-state-station-study.md to the staged data, so the
 * study's numbers can't drift silently: cover order at Georgia State, the three-level stack over
 * the Downtown Connector, and right-hand running on the approach.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { scheduledBoardingChoices } from '../model/platforms';
import { georgiaStateScene, GEORGIA_STATE_PLATFORMS_BY_STOP } from './georgia-state-geometry';
import { Schedule } from '../sched/engine';
import { GroundGrid } from '../terrain/grid';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { alignment } from '../vignette/alignment';
import { terrainAlignment } from './terrain-rail';
import { CityTrains } from './trains';

const data = resolve(__dirname, '../../public/data');
const files = ['scene/downtown/vignette.json', 'scene/downtown/scene.json', 'scene/downtown/ground.json', 'scene/downtown/ground.i16', 'ga/routes.json', 'ga/timetable.json', 'ga/vehicle-types.json'];
const staged = files.every((f) => existsSync(resolve(data, f)));
const J = <T>(f: string): T => JSON.parse(readFileSync(resolve(data, f), 'utf8'));
const EAST = 'marta:path:155177';
const WEST = 'marta:path:155188';

describe.skipIf(!staged)('Georgia State station study', () => {
  const vd = staged ? J<TerrainCity>('scene/downtown/vignette.json') : null!;
  const manifest = staged ? J<SceneManifest>('scene/downtown/scene.json') : null!;
  const rf = staged ? J<RoutesFile>('ga/routes.json') : null!;
  const grid = staged ? new GroundGrid(J('scene/downtown/ground.json'), Uint8Array.from(readFileSync(resolve(data, 'scene/downtown/ground.i16'))).buffer) : null!;

  it('matches both timetable calls at their existing path positions and headings', () => {
    const schedule = new Schedule(rf, J('ga/timetable.json'), J('ga/vehicle-types.json'));
    const site = georgiaStateScene(manifest.origin);
    const bearing = Math.atan2(site.along[0], -site.along[1]) * 180 / Math.PI;
    for (const [clock, path, stopId, s, trackId] of [
      ['14:12:00', EAST, 'marta:stop:908696', 8025, 'ER'],
      ['14:10:00', WEST, 'marta:stop:908618', 16066.3, 'EL'],
    ] as const) {
      const time = new Date(`2026-11-20T${clock}-05:00`);
      const train = schedule.trainsAt(time).find(t => t.pathId === path && t.scheduledStop === stopId)!;
      expect(train.s).toMatchObject({ value: s, tier: 'scheduled' });
      expect(scheduledBoardingChoices(site, bearing, train, GEORGIA_STATE_PLATFORMS_BY_STOP))
        .toEqual([{ platformId: GEORGIA_STATE_PLATFORMS_BY_STOP[stopId][0], trackId, doorSide: 'right' }]);
      const departed = schedule.trainsAt(new Date(+time + 1)).find(t => t.id === train.id)!;
      expect(departed.scheduledStop).toBeUndefined();
    }
  });

  it('covers the approach as open, roofed canopy, building, then open structure (both directions)', () => {
    const lens = (id: string) => Object.fromEntries(manifest.rail!.paths[id].map((sp) => [sp.ev, [sp.cover, Math.round(sp.s1 - sp.s0)]]));
    for (const id of [EAST, WEST]) {
      const l = lens(id);
      expect(l['gsu-west-open'][0]).toBe('open');
      expect(l['gsu-canopy'][0]).toBe('roofed');
      expect(l['gsu-floyd'][0]).toBe('covered');
      expect(l['connector-viaduct'][0]).toBe('open');
      // Surveyed edges since 2026-11-22 (docs/georgia-state-geometry.md); before that 62 / 73 / 131.
      expect(Math.abs((l['gsu-west-open'][1] as number) - 69)).toBeLessThan(3);
      expect(Math.abs((l['gsu-canopy'][1] as number) - 71)).toBeLessThan(3);
      expect(Math.abs((l['gsu-floyd'][1] as number) - 116)).toBeLessThan(3);
    }
    // The sequence itself, in path order: west portal → canopy → Floyd → viaduct travelling east,
    // and exactly reversed travelling west.
    const seq = ['gsu-west-open', 'gsu-canopy', 'gsu-floyd', 'connector-viaduct'];
    const order = (id: string) => manifest.rail!.paths[id].filter((sp) => seq.includes(sp.ev)).sort((x, y) => x.s0 - y.s0);
    const east = order(EAST), west = order(WEST);
    expect(east.map((sp) => sp.ev)).toEqual(seq);
    expect(west.map((sp) => sp.ev)).toEqual([...seq].reverse());
    for (const spans of [east, west]) {
      for (let i = 1; i < spans.length; i++) expect(spans[i].s0).toBeCloseTo(spans[i - 1].s1, 0); // contiguous
    }
  });

  it('stacks freeway < freight < MARTA over the Downtown Connector (x 700–800)', () => {
    const zero = grid.manifest.vertical.sceneZeroNavd88M;
    const ground = (x: number, z: number) => { const h = grid.sample(x, z); return h == null ? null : h - zero; };
    const transport = createSurfaceTransport(vd, grid, ground);
    const al = terrainAlignment(alignment(rf, manifest, vd.bounds, EAST), EAST, manifest, grid);
    const treads = transport.freightTreads.flat();
    for (let x = 700; x <= 800; x += 20) {
      let best = { d: Infinity, s: 0 };
      for (let s = 0; s < al.line.length; s += 1) {
        const p = al.line.at(s);
        if (p.z > 400 && Math.abs(p.x - x) < best.d) best = { d: Math.abs(p.x - x), s };
      }
      const p = al.line.at(best.s);
      const rails = al.elev(best.s) + 0.55;
      const freight = treads.reduce((a, q) => (Math.abs(q.position.x - x) < Math.abs(a.position.x - x) ? q : a)).position;
      const floor = ground(p.x, p.z)!;
      expect(freight.y - floor, `freight over the freeway at x ${x}`).toBeGreaterThan(x <= 780 ? 8 : 6); // the east bank rises at x 800
      expect(rails - freight.y, `MARTA over freight at x ${x}`).toBeGreaterThan(3.5); // measured 4.0–6.7 m
      // Separate parallel bridges: the freight tread runs north of the MARTA deck here.
      expect(p.z - freight.z, `plan separation at x ${x}`).toBeGreaterThan(10);
    }
    transport.dispose();
  });

  it('runs right-handed on the approach: City draws the 17:41 westbound on the north track', () => {
    const sched = new Schedule(rf, J('ga/timetable.json'), J('ga/vehicle-types.json'));
    const project = makeProjector(manifest.origin);
    const train = sched.trainsAt(new Date('2026-11-20T17:41:20-05:00')).find((t) => {
      const [x, z] = project(t.lon, t.lat);
      return t.pathId === WEST && x > 600 && x < 800 && z > 400 && z < 650;
    })!;
    expect(train, 'Blue westbound to H E Holmes on the Georgia State viaduct').toBeDefined();
    expect(train.heading).toBeGreaterThan(270); // west-north-west
    // The real renderer: one terrain alignment for the corridor, as City keeps one per corridor.
    const al = terrainAlignment(alignment(rf, manifest, vd.bounds, EAST), EAST, manifest, grid);
    const trains = new CityTrains([al], manifest, vd.bounds, new Map([[train.routeId, '#0075B2']]), []);
    trains.update([train], 0);
    const cars = trains.group.children.filter((m) => m.visible && m.userData.trainId === train.id);
    expect(cars.length).toBeGreaterThan(0);
    for (const car of cars) {
      // Signed offset from the centreline: right of westbound travel is north (negative z side).
      let best = { d: Infinity, s: 0 };
      for (let s = 0; s <= al.line.length; s += 0.5) {
        const p = al.line.at(s);
        const d = Math.hypot(p.x - car.position.x, p.z - car.position.z);
        if (d < best.d) best = { d, s };
      }
      const p = al.line.at(best.s);
      // The corridor line runs east-south-east, so its left normal (nx, nz) points north-north-east.
      const left = (car.position.x - p.x) * p.nx + (car.position.z - p.z) * p.nz;
      expect(p.nz, 'left of the line is north').toBeLessThan(0);
      expect(left, 'car centre on the north track').toBeGreaterThan(1);
    }
  });
});
