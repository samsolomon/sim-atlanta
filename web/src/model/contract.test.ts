/**
 * Checks the pipeline's generated files (web/public/data/ga) against the model and
 * against a few facts verified by hand. Skips if the data hasn't been built yet.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Schedule } from '../sched/engine';
import type { CrossingProps, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './types';

const dir = resolve(__dirname, '../../public/data/ga');
const has = existsSync(resolve(dir, 'routes.json'));
// The describe body still runs when it is skipped, so a missing file must not throw there.
const load = <T>(f: string): T => (has ? JSON.parse(readFileSync(resolve(dir, f), 'utf8')) : undefined) as T;

describe.skipIf(!has)('generated Georgia data', () => {
  const rf = load<RoutesFile>('routes.json');
  const tf = load<TimetableFile>('timetable.json');
  const vts = load<VehicleType[]>('vehicle-types.json');

  it('has the expected routes with namespaced ids', () => {
    const ids = rf.routes.map((r) => r.id).sort();
    expect(ids).toEqual([
      'amtrak:route:Crescent',
      'marta:route:BLUE',
      'marta:route:GOLD',
      'marta:route:GREEN',
      'marta:route:RED',
      'marta:route:STREETCAR',
    ]);
    for (const r of rf.routes) expect(vts.some((v) => v.id === r.vehicleType)).toBe(true);
  });

  it('paths have matching coords and monotonic cumulative metres', () => {
    for (const p of rf.paths) {
      expect(p.coords.length).toBe(p.cum.length * 2);
      for (let i = 1; i < p.cum.length; i++) expect(p.cum[i]).toBeGreaterThanOrEqual(p.cum[i - 1]);
    }
  });

  it('patterns reference real paths and stops, in order', () => {
    const paths = new Set(rf.paths.map((p) => p.id));
    const stops = new Set(rf.stops.map((s) => s.id));
    for (const t of tf.timetables) {
      for (const p of t.patterns) {
        expect(paths.has(p.pathId)).toBe(true);
        p.stops.forEach((s) => expect(stops.has(s)).toBe(true));
        for (let i = 1; i < p.dist.length; i++) {
          expect(p.dist[i]).toBeGreaterThanOrEqual(p.dist[i - 1]);
          expect(p.arr[i]).toBeGreaterThanOrEqual(p.dep[i - 1]);
        }
      }
    }
  });

  it('schedules a plausible number of MARTA trains on a Friday afternoon', () => {
    const sched = new Schedule(rf, tf, vts);
    const trains = sched.trainsAt(new Date('2026-11-20T19:00:00Z')); // 14:00 ET
    const count = (prefix: string) => trains.filter((t) => t.routeId.startsWith(prefix)).length;
    const rail = ['RED', 'GOLD', 'BLUE', 'GREEN'].reduce((n, l) => n + count(`marta:route:${l}`), 0);
    expect(rail).toBeGreaterThan(15); // ~24 at 2pm: ~15-min headways, 9–46 min runs
    expect(rail).toBeLessThan(80);
    expect(count('marta:route:STREETCAR')).toBeGreaterThan(0);
    for (const t of trains) {
      expect(t.s.tier).toBe('scheduled');
      expect(Number.isFinite(t.lon) && Number.isFinite(t.lat)).toBe(true);
    }
  });

  it('freight and crossings carry the verified FRA numbers', () => {
    const xs = load<{ features: { properties: CrossingProps }[] }>('crossings.geojson').features;
    const sawtell = xs.find((f) => f.properties.id === 'fra:crossing:718065F')!.properties;
    expect(sawtell.dayTrains + sawtell.nightTrains).toBe(51);
    expect(sawtell.arcId).toMatch(/^narn:arc:/);
    const arcs = load<{ features: { properties: TrackArcProps }[] }>('freight.geojson').features;
    const arc = arcs.find((f) => f.properties.id === sawtell.arcId)!.properties;
    expect(arc.owner).toBe('NS');
    expect(arc.tpdTier).toBe('reported');
  });
});
