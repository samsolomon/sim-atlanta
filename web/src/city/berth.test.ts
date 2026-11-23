import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { CAR_GAP, CAR_LENGTH } from '../vignette/cq400';
import { kingMemorialBerths } from './east-rail';
import { BERTH_REACH, berthShift } from './trains';

const SIX = 6 * (CAR_LENGTH + CAR_GAP) - CAR_GAP;

describe('berthShift', () => {
  const b = { stopS: 1100, p0: 900, p1: 1080 }; // the stop sits 20 m past the platform's far end
  it('puts a fitting consist inside the platform at the stop, moving it only as far as needed', () => {
    const shift = berthShift(1100, SIX, [b]);
    expect(1100 + shift + SIX / 2).toBeCloseTo(1080, 6); // nose at the far end
    expect(1100 + shift - SIX / 2).toBeGreaterThan(900);
    expect(berthShift(1000, SIX, [{ stopS: 1000, p0: 900, p1: 1080 }])).toBe(0); // already fits
  });
  it('is zero beyond its reach and continuous with no jumps or reversal', () => {
    expect(berthShift(1100 - BERTH_REACH - 1, SIX, [b])).toBe(0);
    expect(berthShift(1100 + BERTH_REACH + 1, SIX, [b])).toBe(0);
    let prev = (1100 - BERTH_REACH) + berthShift(1100 - BERTH_REACH, SIX, [b]);
    for (let s = 1100 - BERTH_REACH + 0.5; s <= 1100 + BERTH_REACH; s += 0.5) {
      const drawn = s + berthShift(s, SIX, [b]);
      expect(drawn - prev).toBeGreaterThan(0); // never stops early or runs backward
      expect(drawn - prev).toBeLessThan(1); // no jump: under twice the 0.5 m step, even for this 91 m shift
      prev = drawn;
    }
  });
  it('centres a consist longer than the platform, and ignores paths without a berth', () => {
    expect(1100 + berthShift(1100, 200, [b])).toBeCloseTo(990, 6);
    expect(berthShift(1100, SIX, undefined)).toBe(0);
    expect(berthShift(1100, SIX, [])).toBe(0);
  });
});

const data = resolve(__dirname, '../../public/data');
const staged = ['ga/routes.json', 'scene/downtown/scene.json', 'scene/king-memorial/corridor.json'].every(f => existsSync(resolve(data, f)));
describe.skipIf(!staged)('King Memorial berths', () => {
  const J = <T>(f: string): T => JSON.parse(readFileSync(resolve(data, f), 'utf8'));
  const rf = staged ? J<RoutesFile>('ga/routes.json') : null!;
  const manifest = staged ? J<SceneManifest>('scene/downtown/scene.json') : null!;
  const pack = staged ? J<{ station: { platforms: { ring: [number, number][] }[] } }>('scene/king-memorial/corridor.json') : null!;
  const timetable = staged ? J<{ timetables: { patterns: { pathId: string; stops: string[]; dist: number[] }[] }[] }>('ga/timetable.json') : null!;
  const dists = (pathId: string, stopId: string) => [...new Set(timetable.timetables.flatMap(t => t.patterns)
    .filter(p => p.pathId === pathId).flatMap(p => p.stops.map((id, i) => id === stopId ? p.dist[i] : NaN)).filter(Number.isFinite))];
  const berths = staged ? kingMemorialBerths(rf, manifest, pack.station.platforms, dists) : new Map();

  it('berths every East Line path, and every six-car stop ends inside the ~178 m platform', () => {
    expect(berths.size).toBeGreaterThanOrEqual(9);
    let moved = 0;
    for (const [id, [b]] of berths) {
      expect(b.p1 - b.p0, id).toBeGreaterThan(170);
      const at = b.stopS + berthShift(b.stopS, SIX, [b]);
      expect(at - SIX / 2, id).toBeGreaterThanOrEqual(b.p0 - 1e-6);
      expect(at + SIX / 2, id).toBeLessThanOrEqual(b.p1 + 1e-6);
      if (Math.abs(at - b.stopS) > 1) moved++;
    }
    // Westbound stops sit ~21 m west of a centred berth; eastbound already fit.
    expect(moved).toBeGreaterThan(0);
    expect(Math.abs(berthShift(berths.get('marta:path:155177')![0].stopS, SIX, berths.get('marta:path:155177')))).toBeLessThan(0.5);
  });

  it('gives no berth for a platform pair that does not lie along the path', () => {
    const far = pack.station.platforms.map(p => ({ ring: p.ring.map(([lon, lat]) => [lon + 0.01, lat] as [number, number]) }));
    expect(kingMemorialBerths(rf, manifest, far, dists).size).toBe(0);
  });
});

const more = ['ga/timetable.json', 'ga/vehicle-types.json', 'scene/downtown/ground.json', 'scene/downtown/ground.i16',
  'scene/king-memorial/ground.json', 'scene/king-memorial/ground.i16'].every(f => existsSync(resolve(data, f)));
describe.skipIf(!staged || !more)('King Memorial berthing in the real renderer', () => {
  it('draws the 14:02 eastbound and 14:08 westbound stops with every car over the platform', async () => {
    const { Schedule } = await import('../sched/engine');
    const { GroundGrid } = await import('../terrain/grid');
    const { alignment } = await import('../vignette/alignment');
    const { terrainAlignment } = await import('./terrain-rail');
    const { extendRail, joinedGround } = await import('./east-rail');
    const { CityTrains } = await import('./trains');
    const { makeProjector } = await import('../core/scene-data');
    const J = <T>(f: string): T => JSON.parse(readFileSync(resolve(data, f), 'utf8'));
    const grid = (dir: string) => { const bin = readFileSync(resolve(data, `scene/${dir}/ground.i16`));
      return new GroundGrid(J(`scene/${dir}/ground.json`), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)); };
    const rf = J<RoutesFile>('ga/routes.json');
    const manifest = J<SceneManifest>('scene/downtown/scene.json');
    const pack = J<{ station: { platforms: { ring: [number, number][] }[] } }>('scene/king-memorial/corridor.json');
    const down = grid('downtown'), east = grid('king-memorial');
    const zero = down.manifest.vertical.sceneZeroNavd88M;
    const ground = joinedGround(down, (x, z) => { const h = east.sample(x, z); return h == null ? null : h - zero; });
    const extended = extendRail(manifest, rf);
    const union = { minX: -1000, maxX: 1800, minZ: -1300, maxZ: 700 };
    const sched = new Schedule(rf, J('ga/timetable.json'), J('ga/vehicle-types.json'));
    const berths = kingMemorialBerths(rf, extended, pack.station.platforms, (p, st) => sched.stopDistances(p, st));
    const project = makeProjector(manifest.origin);
    for (const [when, pathId] of [['2026-11-20T14:02:00-05:00', 'marta:path:155177'], ['2026-11-20T14:08:00-05:00', 'marta:path:155188']] as const) {
      const train = sched.trainsAt(new Date(when)).find(t => t.pathId === pathId && Math.abs(project(t.lon, t.lat)[0] - 1480) < 120)!;
      expect(train, `${pathId} at ${when}`).toBeDefined();
      const base = alignment(rf, extended, union, pathId);
      const al = terrainAlignment(base, pathId, extended, ground);
      // As City's east attach does: cars stay visible under the open-sided King Memorial canopy.
      al.visibleInStation = s => al.coverAt?.(s) === 'roofed' && al.formAt?.(s) === 'station' && al.line.at(s).x > 1000;
      const ends = (b: typeof berths) => {
        const trains = new CityTrains([al], extended, union, new Map([[train.routeId, '#0075B2']]), []);
        trains.setBerths(b);
        trains.update([train], 0);
        const cars = trains.group.children.filter(m => m.visible && m.userData.trainId === train.id);
        // Each car centre as a path distance: nearest point on the reference line, mapped to path metres.
        const ss = cars.map(c => {
          let best = { d: Infinity, s: 0 };
          for (let s = 0; s <= al.line.length; s += 0.5) {
            const p = al.line.at(s); const d = Math.hypot(p.x - c.position.x, p.z - c.position.z);
            if (d < best.d) best = { d, s };
          }
          return base.pathMetresAt(best.s);
        });
        return { n: cars.length, lo: Math.min(...ss) - CAR_LENGTH / 2, hi: Math.max(...ss) + CAR_LENGTH / 2 };
      };
      const b = berths.get(pathId)![0];
      const before = ends(new Map()), after = ends(berths);
      expect(after.n, pathId).toBe(6);
      expect(after.lo, `${pathId} tail`).toBeGreaterThanOrEqual(b.p0 - 2);
      expect(after.hi, `${pathId} nose`).toBeLessThanOrEqual(b.p1 + 2);
      console.log(pathId, when, 'platform', b.p0.toFixed(1), b.p1.toFixed(1), 'before', before.lo.toFixed(1), before.hi.toFixed(1), 'after', after.lo.toFixed(1), after.hi.toFixed(1));
    }
  }, 60000);
});
