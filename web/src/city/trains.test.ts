import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { carInDaylight, CityTracks, CityTrains } from './trains';
import { leadFirst, VehicleFollow } from './vehicle-follow';

describe('City train placement', () => {
  const crossTown = { line: new Line([[-100, 0], [100, 0]]), elev: (s: number) => s < 90 ? -4 : -12 };
  const northSouth = { line: new Line([[0, -100], [0, 100]]), elev: () => -18 };
  const tracks = new CityTracks([northSouth, crossTown]);

  it('follows both directions of the right corridor at a grade-separated crossing', () => {
    expect(tracks.locate(0, 1, 90)).toEqual({ al: crossTown, s: 100, dir: 1 });
    expect(tracks.locate(0, 1, 270)).toEqual({ al: crossTown, s: 100, dir: -1 });
    expect(tracks.locate(0, 1, 0)).toEqual({ al: northSouth, s: 101, dir: -1 });
    expect(tracks.locate(50, 50, 90)).toBeUndefined();
  });

  it('keeps the cab level on an eastbound viaduct anchored below scene zero', () => {
    const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const trains = new CityTrains([{ line: crossTown.line, elev: () => 7 }], {
      name: 'crossing', origin: { lon: 0, lat: 0 }, bounds, notes: '', sources: [],
      profiles: { track: { s0: 0, step: 1, z: [7] } },
    }, bounds, new Map([['blue', '#0075b2']]), []);
    trains.group.position.y = -9.7;
    trains.update([{ id: 'trip', routeId: 'blue', pathId: 'track', heading: 90, lon: 0, lat: 0,
      s: { value: 100, tier: 'scheduled', source: 'test', asOf: '' }, headsign: 'East', vehicleType: 'rail',
      lengthM: { value: 23, tier: 'illustrative', source: 'test', asOf: '' } }], 0);
    // The group also holds hidden prewarm templates; cars carry a trainId.
    const forward = trains.group.children.find(c => c.userData.trainId)!.getWorldDirection(new Vector3());
    expect(forward.x).toBeCloseTo(1);
    expect(forward.y).toBeCloseTo(0);
  });

  it('puts the leading car first for follow in both directions, whatever the pool order', () => {
    const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const line = new Line([[-300, 0], [300, 0]]);
    const trains = new CityTrains([{ line, elev: () => 7 }], {
      name: 'straight', origin: { lon: 0, lat: 0 }, bounds, notes: '', sources: [],
      profiles: { track: { s0: 0, step: 1, z: [7] } },
    }, bounds, new Map([['blue', '#0075b2']]), []);
    const state = (id: string, heading: number) => ({ id, routeId: 'blue', pathId: 'track', heading, lon: 0, lat: 0,
      s: { value: 300, tier: 'scheduled' as const, source: 'test', asOf: '' }, headsign: '', vehicleType: 'rail',
      lengthM: { value: 92, tier: 'illustrative' as const, source: 'test', asOf: '' } });
    // The second update reuses the first's pooled meshes for the reversed trip.
    for (const [id, heading, dir] of [['east', 90, 1], ['west', 270, -1]] as const) {
      trains.update([state(id, heading)], 0);
      const cars = leadFirst(trains.group.children.filter(c => c.userData.trainId === id));
      expect(cars).toHaveLength(4);
      expect(cars.map(c => dir * c.x)).toEqual(cars.map(c => dir * c.x).sort((a, b) => b - a));
    }
  });

  it('gives follow a car going under cover gradually, so its aim never steps back a car', () => {
    const bounds = { minX: -300, maxX: 300, minZ: -100, maxZ: 100 };
    const line = new Line([[-300, 0], [300, 0]]);
    const trains = new CityTrains([{ line, elev: () => 7, openToSky: (s: number) => s < 300 }], {
      name: 'mouth', origin: { lon: 0, lat: 0 }, bounds, notes: '', sources: [],
      profiles: { track: { s0: 0, step: 1, z: [7] } },
    }, bounds, new Map([['blue', '#0075b2']]), []);
    const follow = new VehicleFollow();
    follow.start({ kind: 'train', id: 't', pathId: 'track', tier: 'scheduled' });
    let at: { x: number; z: number } | undefined;
    // The train runs +x into a roof at x = 0, a metre a frame.
    for (let x = -70; x <= 30; x++) {
      const lon = x / (6371000 * Math.PI / 180);
      trains.update([{ id: 't', routeId: 'blue', pathId: 'track', heading: 90, lon, lat: 0,
        s: { value: 300 + x, tier: 'scheduled', source: 'test', asOf: '' }, headsign: '', vehicleType: 'rail',
        lengthM: { value: 92, tier: 'illustrative', source: 'test', asOf: '' } }], 0);
      const cars = leadFirst(trains.group.children.filter(c => c.userData.trainId === 't'));
      const next = follow.frame({ id: 't', pathId: 'track', tier: 'scheduled', x, z: 0, cars, hidden: null }, bounds, (x + 70) * 16, false, at);
      if (next && at) expect(Math.abs(next.x - at.x), `centre at ${x}`).toBeLessThan(3);
      at = next ?? at;
    }
    expect(follow.phase).toBe('drawn');
  });

  it('uses known cover independently of elevation and retains the relative profile for unknown spans', () => {
    const al = { line: crossTown.line, elev: () => -15, referenceY: () => -22,
      openToSky: (s: number) => s < 50 ? false : s < 100 ? true : undefined };
    expect(carInDaylight(al, 25)).toBe(false); // roofed even though it is 7 m above the local reference
    expect(carInDaylight(al, 75)).toBe(true); // exposed even though scene y is below −5.5
    expect(carInDaylight(al, 150)).toBe(true); // unclassified but the old profile is +7
  });

  it('keeps the last end in the open cut until the whole car is covered', () => {
    expect(carInDaylight(crossTown, 96)).toBe(true);
    expect(carInDaylight(crossTown, 103)).toBe(false);
    expect(carInDaylight(crossTown, -25)).toBe(false);
  });
});
