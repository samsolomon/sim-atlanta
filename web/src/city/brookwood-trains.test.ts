import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Schedule } from '../sched/engine';
import { consistLength } from '../vignette/crescent-stock';
import { Line } from '../vignette/geom';
import { corridorChainage, crescentPlacement } from './brookwood';
import { corridor } from './brookwood-corridor';
import { createNorcrossFreight, FREIGHT_SPEED_MPS, freightTrainLength, NORCROSS_LINE } from './brookwood-freight';

const data = resolve(__dirname, '../../public/data');
const files = ['ga/routes.json', 'ga/timetable.json', 'ga/vehicle-types.json'];
const staged = files.every(f => existsSync(resolve(data, f)));
const J = (f: string) => JSON.parse(readFileSync(resolve(data, f), 'utf8'));

describe.skipIf(!staged)('Brookwood corridor trains', () => {
  const schedule = staged ? new Schedule(J('ga/routes.json'), J('ga/timetable.json'), J('ga/vehicle-types.json')) : null!;
  // 06:00 on 20 November to 06:00 the next day, every 10 s.
  const start = Date.parse('2026-11-20T06:00:00-05:00'), end = start + 24 * 3600e3, step = 10e3;
  const placed: { t: number; center: number; dir: number }[] = [];
  if (staged) for (let t = start; t < end; t += step) {
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
      // It moves in trip order without jumping back.
      for (let i = 1; i < run.length; i++) {
        if (run[i].t - run[i - 1].t !== step) continue;
        expect(dir * (run[i].center - run[i - 1].center)).toBeGreaterThan(-0.5);
        expect(Math.abs(run[i].center - run[i - 1].center)).toBeLessThan(400);
      }
    }
  });

  it('keeps the illustrative Main 2 freight clear of every Crescent near the island', () => {
    const berth = crescentPlacement({
      id: 'berth', routeId: 'amtrak:route:Crescent', pathId: 'berth', heading: 45, lon: -84.392477, lat: 33.799445,
      headsign: '', vehicleType: '', s: { value: 0, tier: 'scheduled', source: 'amtrak-gtfs', asOf: '' },
      lengthM: { value: 0, tier: 'illustrative', source: '', asOf: '' },
    })!.center;
    // Each run takes longer from its first appearance to its berth than a freight passage takes to clear.
    const passage = ((new Line(corridor.main2.pts).length + freightTrainLength) / FREIGHT_SPEED_MPS) * 1000;
    for (const dir of [1, -1]) {
      const run = placed.filter(p => p.dir === dir);
      const arrival = run.find(p => Math.abs(p.center - berth) < 1)!;
      expect(arrival.t - run[0].t, `dir ${dir}`).toBeGreaterThan(passage);
    }
    const freight = createNorcrossFreight(corridor.main2.pts, () => 0, []);
    const byTime = new Map(placed.map(p => [p.t, p]));
    let shown = 0, checked = 0;
    for (let t = start; t < end; t += step) {
      const crescent = byTime.get(t);
      const cars = freight.update(t, !!crescent);
      shown += cars;
      if (crescent && Math.abs(crescent.center - berth) < 300) {
        expect(cars, new Date(t).toISOString()).toBe(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(shown).toBeGreaterThan(1000);
    for (const car of freight.group.children) expect(car.userData.line).toBe(NORCROSS_LINE);
    freight.dispose();
  });
});
