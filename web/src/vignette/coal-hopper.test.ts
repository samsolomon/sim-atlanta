import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('aluminum coal hopper', () => {
  it('fits the 4,323 cu ft envelope, with the heap a little above the rim', () => {
    expect(FREIGHT_LENGTH.coalLoaded).toBeCloseTo((53 + 1 / 12) * 0.3048, 2);
    for (const kind of ['coalLoaded', 'coalEmpty'] as const) for (const low of [false, true]) {
      const g = freightGeometry(kind, { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH[kind] + 0.05);
      expect(b.max.x - b.min.x).toBeLessThanOrEqual((10 + 8 / 12) * 0.3048 + 0.02);
      expect(b.max.y).toBeLessThanOrEqual((13 + 4 / 12) * 0.3048 + (kind === 'coalLoaded' ? 0.4 : 0.02));
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 850 : 2000);
      g.dispose();
    }
  });
});
