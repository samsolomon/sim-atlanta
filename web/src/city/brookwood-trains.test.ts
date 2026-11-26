import { describe, expect, it } from 'vitest';
import { Schedule } from '../sched/engine';
import { consistLength } from '../vignette/crescent-stock';
import fixture from './fixtures/brookwood-timetable.json';
import type { RoutesFile, TimetableFile, VehicleType } from '../model/types';
import { corridorChainage, crescentPlacement } from './brookwood';
import { corridor } from './brookwood-corridor';
import { createNorcrossFreight, FREIGHT_SLOT_MS, NORCROSS_LINE } from './brookwood-freight';
import { leadFirst } from './vehicle-follow';

// Keep the recorded service day and geometry together: rolling GTFS feeds expire
// historical dates, so local pnpm data must not change this regression's input.
describe('Brookwood corridor trains', () => {
  const schedule = new Schedule(fixture.routes as RoutesFile, fixture.timetable as unknown as TimetableFile, fixture.vehicles as VehicleType[]);
  // 06:00 on 20 November to 06:00 the next day, every 10 s.
  const start = Date.parse('2026-11-20T06:00:00-05:00'), end = start + 24 * 3600e3, step = 10e3;
  const placed: { t: number; center: number; dir: number }[] = [];
  for (let t = start; t < end; t += step) {
    for (const state of schedule.trainsAt(new Date(t))) {
      const run = crescentPlacement(state);
      if (run) placed.push({ t, ...run });
    }
  }

  it('runs the scheduled Crescent from board edge to board edge in both directions', () => {
    for (const dir of [1, -1]) {
      const run = placed.filter(p => p.dir === dir);
      expect(run.length, `dir ${dir}`).toBeGreaterThan(50);
      const centers = run.map(p => p.center);
      // The consist enters and leaves through the edges rather than appearing mid-corridor.
      expect(Math.min(...centers)).toBeLessThan(corridorChainage.min + consistLength / 2);
      expect(Math.max(...centers)).toBeGreaterThan(corridorChainage.max - consistLength / 2);
      // It stays visible from edge to edge and moves in trip order without jumping back.
      for (let i = 1; i < run.length; i++) {
        expect(run[i].t - run[i - 1].t, new Date(run[i].t).toISOString()).toBe(step);
        expect(dir * (run[i].center - run[i - 1].center)).toBeGreaterThan(-0.5);
        expect(Math.abs(run[i].center - run[i - 1].center)).toBeLessThan(400);
      }
    }
  });

  it('puts the leading locomotive of the Norcross freight first in both directions', () => {
    const freight = createNorcrossFreight(corridor.main2.pts, () => 0, []);
    for (const slot of [0, 1]) {
      const at = (seconds: number) => slot * FREIGHT_SLOT_MS + seconds * 1000;
      freight.update(at(120), false);
      const before = leadFirst(freight.poses.children)[0];
      freight.update(at(121), false);
      const cars = leadFirst(freight.poses.children), lead = cars[0];
      expect(cars.length).toBeGreaterThan(3);
      // Every other car is behind the lead along its direction of travel.
      const dx = lead.x - before.x, dz = lead.z - before.z;
      for (const car of cars.slice(1)) expect((car.x - lead.x) * dx + (car.z - lead.z) * dz).toBeLessThan(0);
      const shown = freight.poses.children.filter(c => c.visible);
      expect(shown.find(c => c.userData.consistIndex === 0)).toBeDefined();
    }
    freight.dispose();
  });

  it('keeps the illustrative Main 2 freight clear of every Crescent near the island', () => {
    const berth = crescentPlacement({
      id: 'berth', routeId: 'amtrak:route:Crescent', pathId: 'berth', heading: 45, lon: -84.392477, lat: 33.799445,
      headsign: '', vehicleType: '', s: { value: 0, tier: 'scheduled', source: 'amtrak-gtfs', asOf: '' },
      lengthM: { value: 0, tier: 'illustrative', source: '', asOf: '' },
    })!.center;
    const freight = createNorcrossFreight(corridor.main2.pts, () => 0, []);
    const byTime = new Map(placed.map(p => [p.t, p]));
    let shown = 0, checked = 0;
    for (let t = start; t < end; t += step) {
      const crescent = byTime.get(t);
      const cars = freight.update(t, !!crescent);
      shown += cars;
      // No freight anywhere on the corridor while a Crescent is on it, berthed or not.
      if (crescent) {
        expect(cars, new Date(t).toISOString()).toBe(0);
        if (Math.abs(crescent.center - berth) < 300) checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(shown).toBeGreaterThan(1000);
    for (const car of freight.poses.children) {
      expect(car.userData.line).toBe(NORCROSS_LINE);
      expect(car.userData.trainId).toBe('illustrative:freight:norcross');
    }
    freight.dispose();
  });
});
