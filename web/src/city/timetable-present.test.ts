import { expect, it } from 'vitest';
import { createTimetableBuses } from './timetable-buses';
import { CityBuses } from './buses';
import { cityBusGeometry } from '../vignette/xcelsior';
import { sceneToLonLat } from '../core/places';
import type { BusTimetableFile, LiveBus } from '../model/types';

// One straight two-way street from z = 0 to z = 1000 (scene north is −z). Route 49 runs
// south on path `s` and north on path `n`. Trips depart every 100 s at 10 m/s.
const origin = {lon: -84.39, lat: 33.75};
const lonLat = (z: number) => sceneToLonLat(origin, 0, z);
const service = {id: 'w', start: 20261123, end: 20261123, days: 0, added: [20261123], removed: []};
const pattern = (id: string, pathId: string, headsign: string) => ({
  id, routeId: 'marta:route:49', pathId, headsign, stops: ['a', 'b'], dist: [0, 1000], arr: [0, 100], dep: [0, 100],
});
const start = 12 * 3600;
const data: BusTimetableFile = {
  source: {url: '', retrieved: '', sha256: ''}, routes: [], stops: [],
  paths: [
    {id: 's', routeId: 'marta:route:49', coords: [...lonLat(0), ...lonLat(1000)], cum: [0, 1000]},
    {id: 'n', routeId: 'marta:route:49', coords: [...lonLat(1000), ...lonLat(0)], cum: [0, 1000]},
  ],
  // trips: 0 south@0, 1 south@+40 s, 2 north@0, 3 north@+40 s
  tripIds: ['S0', 'S1', 'N0', 'N1'],
  timetable: {
    feed: 'marta', timezone: 'America/New_York',
    patterns: [pattern('ps', 's', 'South'), pattern('pn', 'n', 'North')],
    services: [service],
    trips: [[0, 0, start, ''], [0, 0, start + 40, ''], [1, 0, start, ''], [1, 0, start + 40, '']],
  },
};
const noon = Date.parse('2026-11-23T12:00:00-05:00');

function setup() {
  const streets = new CityBuses({
    origin, bounds: {minX: -50, maxX: 50, minZ: -50, maxZ: 1050},
    runs: [{kind: 'ground', cls: 'primary', pts: [[0, 0], [0, 1000]]}],
    deckAt: () => 0, groundAt: () => 0, geometry: cityBusGeometry(),
  });
  return {streets, model: createTimetableBuses(data, origin, streets, [], [])};
}
const sourced = <T>(value: T) => ({value, tier: 'live' as const, source: 'gps', asOf: ''});
function fix(id: string, z: number, at: number, extra: Partial<LiveBus> = {}): LiveBus {
  const [lon, lat] = lonLat(z);
  return {id: `marta:bus:${id}`, at, position: sourced({lon, lat}), routeId: sourced('marta:route:49'), ...extra};
}
const tripId = (i: number) => `marta:bus-trip:49-20261123-${i}`;
const summary = (poses: {id: string; fix?: LiveBus; fallback?: boolean}[]) =>
  poses.map(p => `${p.id}${p.fix ? '<' + p.fix.id.slice(10) : ''}${p.fallback ? ' fallback' : ''}`).sort();

it('lets an exact descriptor win over a fresher unmatched report beside the same trip', () => {
  const {model} = setup();
  const t = noon + 60_000; // S0 at 600 m, S1 at 200 m
  // A fresher bus reports a known trip that isn't active now, right beside S0.
  const late = fix('late', 590, t - 5_000, {tripId: 'N1', startDate: '20261122'});
  const real = fix('real', 600, t - 20_000, {tripId: 'S0', startDate: '20261123'});
  const {poses} = model.presentAt(t, t, [late, real]);
  expect(summary(poses)).toContain(`${tripId(0)}<real`);
  expect(poses.filter(p => p.id === tripId(0))).toHaveLength(1);
  // The unmatched report is still drawn as itself.
  expect(poses.some(p => p.fix?.id === late.id && p.id === late.id)).toBe(true);
});

it('keeps the freshest of two vehicles claiming one trip and drops the other', () => {
  const {model} = setup();
  const t = noon + 60_000;
  const a = fix('a', 600, t - 5_000, {tripId: 'S0'}), b = fix('b', 400, t - 50_000, {tripId: 'S0'});
  const {poses, raw} = model.presentAt(t, t, [b, a]);
  expect(poses.filter(p => p.fix).map(p => p.fix!.id)).toEqual([a.id]);
  expect(raw).toEqual([]);
});

it('matches a descriptor-less report to the trip going its reported way', () => {
  const t = noon + 30_000; // S0 at 300 m southbound, N0 at 700 m northbound
  // Midway between them; heading north (bearing 0) must pick N0, south (180) S0.
  for (const [bearing, want] of [[0, 2], [180, 0]] as const) {
    const {model} = setup();
    const {poses} = model.presentAt(t, t, [fix('x', 500, t, {bearing: sourced(bearing)})]);
    expect(poses.find(p => p.fix)?.id).toBe(tripId(want));
  }
});

it('infers direction from motion when a report has no bearing', () => {
  const {model} = setup();
  const t = noon + 30_000; // S0 at z 300, N0 at z 700
  // Seen before service starts, then 70 m further north: nearer S0, but heading north.
  model.presentAt(noon - 10_000, noon - 10_000, [fix('x', 520, noon - 10_000)]);
  const {poses} = model.presentAt(t, t, [fix('x', 450, t)]);
  expect(poses.find(p => p.fix)?.id).toBe(tripId(2));
});

it('proximity-matches a Route 49 report whose trip id is from another edition', () => {
  const {model} = setup();
  const t = noon + 60_000;
  const {poses} = model.presentAt(t, t, [fix('x', 600, t, {tripId: 'next-edition-123', bearing: sourced(180)})]);
  expect(summary(poses)).toEqual([`${tripId(0)}<x`, `${tripId(1)} fallback`, `${tripId(2)} fallback`, `${tripId(3)} fallback`]);
});

it('never lets an unknown-route report hide a Route 49 trip, and keeps other routes drawn', () => {
  const {model} = setup();
  const t = noon + 60_000;
  const unknown = fix('u', 600, t, {routeId: undefined});
  const other = fix('o', 600, null as unknown as number, {routeId: sourced('marta:route:110')});
  const {poses, raw} = model.presentAt(t, t, [unknown, other]);
  expect(raw.map(f => f.id)).toEqual([other.id, unknown.id]);
  expect(poses.filter(p => p.fallback)).toHaveLength(4);
  // An unknown-route report with an exact descriptor is still that trip.
  const exact = model.presentAt(t, t, [{...unknown, tripId: 'S0'}]);
  expect(summary(exact.poses)).toContain(`${tripId(0)}<u`);
  expect(exact.raw).toEqual([]);
});

it('suppresses only the timetable twin beside an unmatched Route 49 report', () => {
  const {model} = setup();
  const t = noon + 60_000;
  const {poses} = model.presentAt(t, t, [fix('late', 600, t, {tripId: 'N1', startDate: '20261122', bearing: sourced(180)})]);
  expect(summary(poses)).toEqual([`${tripId(1)} fallback`, `${tripId(2)} fallback`, `${tripId(3)} fallback`, 'marta:bus:late<late']);
});

it('continues a fallback bus into GPS without a fade, and fades the fallback in when GPS goes stale', () => {
  const {model} = setup();
  const t = noon + 60_000;
  const before = model.presentAt(t, t, []).poses.find(p => p.id === tripId(0))!;
  expect(before.fallback).toBe(true);
  // GPS arrives 120 m behind the timetable position: the bus holds, it doesn't jump.
  const report = fix('x', 480, t, {tripId: 'S0'});
  const first = model.presentAt(t + 16, t + 16, [report]).poses.find(p => p.id === tripId(0))!;
  expect(first.fix?.id).toBe(report.id);
  expect(first.fade).toBe(0);
  expect(first.point.z).toBeCloseTo(before.point.z, 0);
  // The feed drops the vehicle: its timetable bus fades in rather than popping.
  const lost = model.presentAt(t + 32, t + 32, []).poses.find(p => p.id === tripId(0))!;
  expect(lost.fallback).toBe(true);
  expect(lost.fade).toBeGreaterThan(0.9);
  const settled = model.presentAt(t + 500, t + 500, []).poses.find(p => p.id === tripId(0))!;
  expect(settled.fade).toBe(0);
});

it('falls back for every trip when all reports are stale, and drops the stale Route 49 fix', () => {
  const {model} = setup();
  const t = noon + 60_000;
  const {poses, raw} = model.presentAt(t, t, [fix('old', 600, t - 181_000, {tripId: 'S0'})]);
  expect(poses.every(p => p.fallback)).toBe(true);
  expect(poses).toHaveLength(4);
  expect(raw).toEqual([]);
});

it('keeps tracked Route 49 buses drawn when other routes fill the batch', () => {
  const {streets, model} = setup();
  const t = noon + 60_000;
  const others = Array.from({length: 70}, (_, i) => fix(`o${i}`, 10 * i, t, {routeId: sourced('marta:route:110')}));
  const {poses, raw} = model.presentAt(t, t, [...others, fix('x', 600, t, {tripId: 'S0'})]);
  streets.timetable(poses, raw);
  expect(streets.positions).toHaveLength(64);
  for (const p of poses) expect(streets.positions.some(q => q.id === p.id)).toBe(true);
  streets.dispose();
});

it('keeps a late trip’s identity while its bus still reports it after the modelled end', () => {
  const {model} = setup();
  const t = noon + 400_000; // S0 ended at +100 s
  const {poses} = model.presentAt(t, t, [fix('late', 980, t, {tripId: 'S0', startDate: '20261123'})]);
  const pose = poses.find(p => p.fix)!;
  expect(pose.id).toBe(tripId(0));
  expect(pose.headsign).toBe('South');
  // An hour and more past its end, the report no longer names a trip City can show.
  const later = noon + 100_000 + 3_601_000;
  expect(model.presentAt(later, later, [fix('late', 980, later, {tripId: 'S0'})]).poses.find(p => p.fix)?.id).toBe('marta:bus:late');
});
