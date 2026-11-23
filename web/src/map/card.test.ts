import { describe, expect, it } from 'vitest';
import { destination, trainCard } from './card';
import type { Route, TrainState } from '../model/types';

const route = { id: 'marta:route:RED', mode: 'heavy_rail', shortName: 'RED', longName: 'Red Line', operator: 'MARTA', color: 'd22030' } as unknown as Route;
const train = (tier: 'live' | 'scheduled') => ({
  id: 't1', routeId: 'marta:route:RED', headsign: 'RED NORTHBOUND TO NORTH SPRINGS STATION', nextStopName: 'PEACHTREE CENTER STATION', nextInSec: 120,
  s: { tier }, observedAt: Date.now() - 20_000,
}) as unknown as TrainState;

describe('A2c train card', () => {
  it('names the direction and destination', () => {
    expect(destination('RED NORTHBOUND TO NORTH SPRINGS STATION')).toBe('Northbound to North Springs');
    expect(destination('Lakewood-Ft Mcpherson Station')).toBe('To Lakewood-Ft Mcpherson');
  });
  it('tiers each fact: next stop by source, cars always illustrative', () => {
    const vt = { id: 'v', name: 'car', lengthM: 23, typicalUnits: 6, art: 'x' };
    const live = trainCard(train('live'), route, undefined, vt, true, true);
    expect(live).toMatch(/Next stop.*Peachtree Center · 2 min.*chip live">Live/s);
    expect(live).toMatch(/Cars<\/dt><dd>6 <span class="chip illustrative"/);
    const sched = trainCard(train('scheduled'), route, undefined, vt, true, true);
    expect(sched).not.toMatch(/chip live/);
    expect(sched).toMatch(/chip scheduled">Scheduled/);
  });
});
