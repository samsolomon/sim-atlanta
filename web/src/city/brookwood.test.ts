import { describe, expect, it } from 'vitest';
import type { TrainState } from '../model/types';
import type { GroundManifest } from '../terrain/grid';
import { consistLength, formation, layout, passengerGeometry } from '../vignette/crescent-stock';
import { brookwoodGrid, crescentPlacement } from './brookwood';

const stop: TrainState = {
  id: 'example', routeId: 'amtrak:route:Crescent', pathId: 'example', heading: 45,
  lon: -84.392477, lat: 33.799445, headsign: 'New York', vehicleType: 'amtrak:vt:long-distance',
  s: { value: 1000, tier: 'scheduled', source: 'amtrak-gtfs', asOf: '20261122' },
  lengthM: { value: 234, tier: 'illustrative', source: 'vehicle-types', asOf: '' },
};

describe('Brookwood placement', () => {
  it('berths both directions within the measured island and reverses the locomotive', () => {
    const north = crescentPlacement(stop)!;
    const south = crescentPlacement({ ...stop, heading: 225 })!;
    expect(north.units).toBe(9);
    expect(north.dir).toBe(1);
    expect(south.dir).toBe(-1);
    expect(north.center).toBe(south.center);
    // Projected ends of OSM 1180995316 on Main 1 (southwest to northeast).
    expect(north.center + consistLength / 2).toBeCloseTo(657, -1);
    expect(north.center - consistLength / 2).toBeGreaterThan(285);
  });

  it('leaves other services, live positions, and remote train locations out of the station', () => {
    expect(crescentPlacement({ ...stop, routeId: 'narn:arc:1' })).toBeUndefined();
    expect(crescentPlacement({ ...stop, s: { ...stop.s, tier: 'live' } })).toBeUndefined();
    expect(crescentPlacement({ ...stop, lon: -84.33 })).toBeUndefined();
  });

  it('clears a lidar deck return while preserving lower terrain, voids and original samples', () => {
    const manifest: GroundManifest = {
      version: 1, stepM: 5, cols: 2, rows: 2, bounds: { minX: -85, maxX: -80, minZ: -5065, maxZ: -5060 },
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 }, encoding: 'signed int16 little-endian',
      scaleM: .1, offsetM: 0, noData: -32768, sha256: '',
    };
    const raw = new Int16Array([2730, 2590, -32768, 2730]);
    const grid = brookwoodGrid(manifest, raw.buffer);
    expect(grid.node(0, 0)).toBeCloseTo(264.4, 0);
    expect(grid.node(0, 1)).toBe(259);
    expect(grid.node(1, 0)).toBeNull();
    expect(raw[0]).toBe(2730);
  });
});

describe('illustrative Crescent equipment', () => {
  it('couples the documented formation end to end and emits markers only on exposed ends', () => {
    const cars = layout(formation);
    expect(cars.map(car => car.unit)).toEqual([
      'charger', 'genesis', 'coach', 'coach', 'coach', 'cafe', 'diner', 'sleeper', 'baggageDorm',
    ]);
    expect(consistLength).toBeCloseTo(224.59);
    for (const [i, car] of cars.entries()) {
      if (i) {
        const previous = cars[i - 1];
        expect(car.offset + car.length / 2).toBeCloseTo(previous.offset - previous.length / 2);
      }
      const shape = passengerGeometry(car.unit, i === 0, i === cars.length - 1);
      const lights = shape.getAttribute('stockLight');
      expect(lights.count).toBe(shape.getAttribute('position').count);
      expect(lights.array.includes(2)).toBe(i === 0 || i === cars.length - 1);
      expect(lights.array.includes(1)).toBe(i >= 2);
      shape.dispose();
    }
  });
});
