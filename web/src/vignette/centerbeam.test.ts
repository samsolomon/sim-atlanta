import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH, freightGeometry } from './freight-stock';

describe('73-foot centerbeam', () => {
  it('fits the Greenbrier envelope with the load inside the bulkheads', () => {
    expect(FREIGHT_LENGTH.centerbeamLumber).toBeCloseTo((80 + 7 / 12) * 0.3048, 2);
    for (const kind of ['centerbeamEmpty', 'centerbeamLumber'] as const) for (const low of [false, true]) {
      const g = freightGeometry(kind, { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH[kind] + 0.05);
      expect(b.max.x - b.min.x).toBeLessThan(3.25);
      expect(b.max.y).toBeLessThanOrEqual((15 + 5.75 / 12) * 0.3048 + 0.02);
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 950 : 2200);
      g.dispose();
    }
  });
});
