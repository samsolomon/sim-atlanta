import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('enclosed autorack', () => {
  it('fits the Multi-Max envelope and Plate J height', () => {
    expect(FREIGHT_LENGTH.autorack).toBeCloseTo((93 + 10 / 12) * 0.3048, 1);
    for (const low of [false, true]) {
      const g = freightGeometry('autorack', { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH.autorack + 0.05);
      expect(b.max.x - b.min.x).toBeLessThanOrEqual((10 + 8.44 / 12) * 0.3048 + 0.02);
      expect(b.max.y).toBeLessThanOrEqual(19 * 0.3048 + 0.02);
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 1000 : 2400);
      g.dispose();
    }
  });
});
