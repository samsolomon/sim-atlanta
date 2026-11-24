import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, freightGeometry } from './freight-stock';
import { createNorcrossFreight } from '../city/brookwood-freight';

const tris = (g: THREE.BufferGeometry) => g.getAttribute('position').count / 3;

describe('three-bay covered grain hopper', () => {
  it('fits the Greenbrier 5,400 ft³ envelope at both tiers', () => {
    // 58 ft 8 in over couplers, 10 ft 8 in wide, 15 ft 6 in tall.
    expect(FREIGHT_LENGTH.grainHopper).toBeCloseTo((58 + 8 / 12) * 0.3048, 3);
    expect(FREIGHT_TRUCK_SPACING.grainHopper).toBe(13.4);
    for (const low of [false, true]) {
      const g = freightGeometry('grainHopper', { low });
      g.computeBoundingBox();
      const box = g.boundingBox!;
      expect(box.min.y).toBeCloseTo(0, 4);
      expect(box.max.z - box.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH.grainHopper + 0.05);
      expect(box.max.x - box.min.x).toBeLessThanOrEqual((10 + 8 / 12) * 0.3048 + 0.02);
      expect(box.max.y).toBeLessThanOrEqual(15.5 * 0.3048 + 0.05);
      g.dispose();
    }
  });

  it('stays within its triangle budget and never lights', () => {
    const high = freightGeometry('grainHopper', { leadFront: true }), low = freightGeometry('grainHopper', { low: true });
    expect(tris(high)).toBeLessThanOrEqual(1000);
    expect(tris(low)).toBeLessThanOrEqual(660);
    for (const g of [high, low]) {
      const light = g.getAttribute('stockLight');
      expect(light.count).toBe(g.getAttribute('position').count);
      expect(Array.from(light.array).every((v) => v === 0)).toBe(true);
      g.dispose();
    }
  });

  it('runs three hoppers behind the two Norcross locomotives, instanced only at high tier', () => {
    const line: [number, number][] = [[0, 0], [400, 0]];
    for (const high of [true, false]) {
      const freight = createNorcrossFreight(line, () => 0, [], high);
      const lengths = freight.poses.children.map((car) => car.userData.lengthM);
      expect(lengths.slice(2, 5)).toEqual(Array(3).fill(FREIGHT_LENGTH.grainHopper));
      expect(lengths.slice(5).every((l) => l === FREIGHT_LENGTH.boxcar)).toBe(true);
      // Low tier must not add an instanced + clipped Lambert program (phone budget is 90).
      expect(freight.poses.children.every((car) => !!(car as THREE.Mesh).isMesh === !high)).toBe(true);
      freight.dispose();
    }
  });
});
