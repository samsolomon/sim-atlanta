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
import { Schedule } from '../sched/engine';
import { GroundGrid } from '../terrain/grid';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { alignment } from '../vignette/alignment';
import { terrainAlignment } from './terrain-rail';
import { CityTracks } from './trains';

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

  it('covers the approach as open, roofed canopy, building, then open structure (both directions)', () => {
    const lens = (id: string) => Object.fromEntries(manifest.rail!.paths[id].map((sp) => [sp.ev, [sp.cover, Math.round(sp.s1 - sp.s0)]]));
    for (const id of [EAST, WEST]) {
      const l = lens(id);
      expect(l['gsu-west-open'][0]).toBe('open');
      expect(l['gsu-canopy'][0]).toBe('roofed');
      expect(l['gsu-floyd'][0]).toBe('covered');
      expect(l['connector-viaduct'][0]).toBe('open');
      expect(Math.abs((l['gsu-west-open'][1] as number) - 62)).toBeLessThan(10);
      expect(Math.abs((l['gsu-canopy'][1] as number) - 73)).toBeLessThan(10);
      expect(Math.abs((l['gsu-floyd'][1] as number) - 131)).toBeLessThan(10);
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

  it('runs right-handed on the approach: the 17:41 westbound sits on the north track', () => {
    const sched = new Schedule(rf, J('ga/timetable.json'), J('ga/vehicle-types.json'));
    const project = makeProjector(manifest.origin);
    const tracks = new CityTracks([EAST, WEST].map((id) => alignment(rf, manifest, vd.bounds, id)));
    const train = sched.trainsAt(new Date('2026-11-20T17:41:20-05:00')).find((t) => t.pathId === WEST && (() => {
      const [x, z] = project(t.lon, t.lat);
      return x > 600 && x < 800 && z > 400 && z < 650;
    })())!;
    expect(train, 'Blue westbound to H E Holmes on the Georgia State viaduct').toBeDefined();
    const [x, z] = project(train.lon, train.lat);
    const at = tracks.locate(x, z, train.heading)!;
    const p = at.al.line.at(at.s);
    const off = at.dir * 2.1; // CityTrains' track offset
    const cx = p.x - p.nx * off, cz = p.z - p.nz * off;
    // Right of westbound travel (heading ≈ 300°) is north: smaller z than the centreline.
    expect(train.heading).toBeGreaterThan(270);
    expect(cz).toBeLessThan(p.z);
    void cx;
  });
});
