import { describe, expect, it } from 'vitest';
import { cityFreightCard, destination, trainCard } from './card';
import type { Route, TrainState } from '../model/types';

const route = { id: 'marta:route:RED', mode: 'heavy_rail', shortName: 'RED', longName: 'Red Line', operator: 'MARTA', color: 'd22030' } as unknown as Route;
const train = (tier: 'live' | 'scheduled') => ({
  id: 't1', pathId: 'test-track', routeId: 'marta:route:RED', headsign: 'RED NORTHBOUND TO NORTH SPRINGS STATION', nextStopName: 'PEACHTREE CENTER STATION', nextInSec: 120,
  s: { tier }, observedAt: Date.now() - 20_000,
}) as unknown as TrainState;

describe('A2c train card', () => {
  it('names the direction and destination', () => {
    expect(destination('RED NORTHBOUND TO NORTH SPRINGS STATION')).toBe('Northbound to North Springs');
    expect(destination('Lakewood-Ft Mcpherson Station')).toBe('To Lakewood-Ft Mcpherson');
  });
  it('retains report age for raw positions and marks an undated fix Reported', () => {
    const raw = { ...train('live'), pathId: '' };
    expect(trainCard(raw, route, undefined, undefined)).toMatch(/Last reported location.*reported.*chip live">Live/);
    expect(trainCard({ ...raw, observedAt: undefined }, route, undefined, undefined)).toMatch(/Last reported location.*report time unknown.*chip reported">Reported/);
  });
  it('tiers each fact: next stop by source, cars always illustrative', () => {
    const vt = { id: 'v', name: 'car', lengthM: 23, typicalUnits: 6, art: 'x' };
    const live = trainCard(train('live'), route, undefined, vt, true);
    expect(live).toMatch(/Next arrival.*Peachtree Center · 2 min.*chip live">Live/s);
    expect(live).toMatch(/Position.*chip inferred">Inferred/s);
    expect(live).toMatch(/Cars<\/dt><dd>6 <span class="chip illustrative"/);
    const sched = trainCard(train('scheduled'), route, undefined, vt, true);
    expect(sched).not.toMatch(/chip live/);
    expect(sched).toMatch(/chip scheduled">Scheduled/);
  });
});

const trip = (routeId: string) => ({
  id: 't', routeId, pathId: 'p', heading: 45, lon: -84.39, lat: 33.8, headsign: 'New York', vehicleType: 'vt',
  s: { value: 0, tier: 'scheduled', source: 'gtfs', asOf: '20261120' },
  lengthM: { value: 200, tier: 'illustrative', source: 'vehicle-types', asOf: '' },
}) as unknown as TrainState;

// Tier words live on the cards; the scene carries no ambient tier notes (#231).
describe('Brookwood and North Line tiers on cards', () => {
  it('names the inferred berth and track only where City drew the car', () => {
    const crescent = trainCard(trip('amtrak:route:Crescent'), undefined, undefined, undefined, true, { inferredBerth: true });
    expect(crescent).toMatch(/chip inferred">inferred berth/);
    expect(crescent).toMatch(/chip illustrative/);
    expect(trainCard(trip('amtrak:route:Crescent'), undefined, undefined, undefined, true)).not.toContain('inferred berth');
    expect(trainCard(trip('amtrak:route:Crescent'), undefined, undefined, undefined, false, { inferredBerth: true })).not.toContain('inferred berth');
    expect(trainCard(trip('marta:route:RED'), route, undefined, undefined, true, { inferredTrack: true })).toMatch(/chip inferred">inferred track/);
    expect(trainCard(trip('marta:route:RED'), route, undefined, undefined, true)).not.toContain('inferred track');
  });
  it('labels the Norcross freight illustrative', () => {
    expect(cityFreightCard('NS Norcross District')).toMatch(/NS Norcross District[\s\S]*Simulated on the mapped track <span class="chip illustrative">/);
  });
});
