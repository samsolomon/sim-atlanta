import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, freightGeometry } from './freight-stock';

describe('DOT-117-family tank car', () => {
  it('fits the 30,600-gallon envelope and its triangle ceiling', () => {
    // Greenbrier drawing: 59 ft 10 in over pulling faces, 46 ft 7.5 in truck centres.
    expect(FREIGHT_LENGTH.tank).toBeCloseTo((59 + 10 / 12) * 0.3048, 2);
    expect(FREIGHT_TRUCK_SPACING.tank).toBeCloseTo((46 + 7.5 / 12) * 0.3048, 2);
    for (const low of [false, true]) {
      const g = freightGeometry('tank', { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH.tank + 0.05);
      expect(b.max.x - b.min.x).toBeLessThan(3.25);
      expect(b.max.y).toBeLessThan(4.7);
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 1000 : 2400);
      g.dispose();
    }
  });
});
