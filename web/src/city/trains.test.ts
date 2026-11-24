import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { carInDaylight, CityTracks, CityTrains } from './trains';

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
