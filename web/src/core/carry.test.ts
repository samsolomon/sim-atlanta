import { describe, expect, it } from 'vitest';
import { carries, followLabel, inCityArea } from './carry';
import { busCard, trainCard } from '../map/card';
import type { LiveBus, Route, TrainState } from '../model/types';

describe('selection across the Map ↔ City switch', () => {
  it('carries trains both ways at any clock', () => {
    for (const to of ['map', 'city'] as const) for (const rt of [true, false]) expect(carries({ kind: 'train', id: 't' }, to, rt)).toBe(true);
  });
  it('carries buses only at the real present', () => {
    expect(carries({ kind: 'bus', id: 'b' }, 'city', true)).toBe(true);
    expect(carries({ kind: 'bus', id: 'b' }, 'map', true)).toBe(true);
    expect(carries({ kind: 'bus', id: 'b' }, 'city', false)).toBe(false);
  });
  it('closes cards with nothing to follow on the other side', () => {
    expect(carries({ kind: 'freight', id: 'f' }, 'map', true)).toBe(false); // the Map draws freight lines, not trains
    expect(carries({ kind: 'other' }, 'city', true)).toBe(false); // a crossing or a freight-line card
    expect(carries(null, 'city', true)).toBe(false);
  });
});

describe('the card’s follow button', () => {
  it('reads Follow in 3D on the Map, Follow in City', () => {
    expect(followLabel('map', false, true)).toBe('Follow in 3D');
    expect(followLabel('city', false, true)).toBe('Follow');
    expect(followLabel('city', true, true)).toBe('Stop following');
  });
  it('is not offered on the Map for a vehicle outside City’s area', () => {
    expect(followLabel('map', false, false)).toBeNull();
    expect(inCityArea(0, 0)).toBe(true); // Five Points
    expect(inCityArea(565, -3965)).toBe(true); // Midtown
    expect(inCityArea(5000, 0)).toBe(false);
  });
});

// AGENTS.md: the card's tier labels are identical in both views; following never upgrades a tier.
const chips = (html: string, row: string) => [...(html.match(new RegExp(`<dt[^>]*>${row}</dt><dd[^>]*>.*?</dd>`, 's'))?.[0] ?? '').matchAll(/chip (\w+)/g)].map((m) => m[1]);
describe('tier labels match across views', () => {
  const route = { id: 'marta:route:RED', mode: 'heavy_rail', shortName: 'RED', longName: 'Red Line', operator: 'MARTA', color: 'd22030' } as unknown as Route;
  const train = (tier: 'live' | 'scheduled', pathId = 'p') => ({
    id: 't1', pathId, routeId: 'marta:route:RED', vehicleType: 'marta:vt:heavy-rail', headsign: 'RED NORTHBOUND TO NORTH SPRINGS STATION',
    nextStopName: 'PEACHTREE CENTER STATION', nextInSec: 120, s: { tier }, observedAt: Date.now() - 20_000,
  }) as unknown as TrainState;
  it('trains: next stop and position chips are the same on the Map and in City', () => {
    for (const t of [train('live'), train('scheduled'), train('live', '')]) {
      const map = trainCard(t, route, undefined, undefined, false);
      const city = trainCard(t, route, undefined, undefined, true, { inferredTrack: true });
      for (const row of ['Next arrival', 'Next stop', 'Position']) expect(chips(city, row)).toEqual(chips(map, row));
      expect(chips(map, 'Position').length).toBe(1);
    }
  });
  it('buses: a reported position stays reported in City', () => {
    const bus = { id: 'marta:bus:1234', routeId: { value: 'marta:route:110' }, at: Date.now() - 30_000,
      position: { value: { lon: -84.39, lat: 33.75 }, tier: 'reported' } } as unknown as LiveBus;
    const map = busCard(bus, Date.now());
    const city = busCard(bus, Date.now(), 'New Flyer Xcelsior XN40');
    expect(chips(map, 'Position')).toEqual(['reported']);
    expect(chips(city, 'Position')).toEqual(['reported']);
  });
});
