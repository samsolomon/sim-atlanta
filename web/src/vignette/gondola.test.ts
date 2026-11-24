import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('52-foot mill gondola', () => {
  it('fits the Greenbrier envelope and Plate C height at both tiers', () => {
    expect(FREIGHT_LENGTH.gondolaScrap).toBeCloseTo((57 + 9.5 / 12) * 0.3048, 2);
    for (const kind of ['gondolaEmpty', 'gondolaScrap'] as const) for (const low of [false, true]) {
      const g = freightGeometry(kind, { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH[kind] + 0.05);
      expect(b.max.x - b.min.x).toBeLessThan(3.4);
      expect(b.max.y).toBeLessThanOrEqual((9 + 1.8 / 12) * 0.3048 + 0.02); // the load stays below the rim
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 800 : 1800);
      g.dispose();
    }
  });
});
