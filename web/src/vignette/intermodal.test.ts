import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, freightGeometry } from './freight-stock';

describe('53-foot double-stack well car', () => {
  it('fits the Husky-Stack envelope and the Plate H double-stack height', () => {
    // 76 ft 8.75 in over couplers (Greenbrier HS53); Plate H is 20 ft 2 in above the rail.
    expect(FREIGHT_LENGTH.wellA).toBeCloseTo((76 + 8.75 / 12) * 0.3048, 2);
    expect(FREIGHT_TRUCK_SPACING.wellA).toBe(19.2);
    for (const kind of ['wellA', 'wellB', 'wellC'] as const) for (const low of [false, true]) {
      const g = freightGeometry(kind, { low });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 4);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH[kind] + 0.05);
      expect(b.max.x - b.min.x).toBeLessThan(3.25);
      expect(b.max.y).toBeLessThanOrEqual((20 + 2 / 12) * 0.3048 + 0.02);
      if (kind === 'wellC') expect(b.max.y).toBeLessThan(3.3); // single stack
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 950 : 2200);
      g.dispose();
    }
  });
});
