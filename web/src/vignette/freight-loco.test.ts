import { describe, expect, it } from 'vitest';
import { GE_LENGTH, GE_RADIATOR_TOP } from './freight-loco';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, freightGeometry } from './freight-stock';

describe('GE AC4400CW-family locomotive', () => {
  it('fits the AC4400CW envelope and keeps both liveries the same shape', () => {
    expect(FREIGHT_LENGTH.locomotive).toBe(22.3);
    expect(FREIGHT_TRUCK_SPACING.locomotive).toBeCloseTo(16.15, 2);
    for (const unit of ['locomotive', 'locomotiveNs'] as const) {
      const g = freightGeometry(unit);
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(GE_LENGTH + 0.05);
      expect(b.max.y).toBeLessThan(GE_RADIATOR_TOP + 0.2);
      expect(b.max.x).toBeLessThan(1.7);
      g.dispose();
    }
  });

  it('lights lamps only at the end that leads', () => {
    const lit = (opts: { leadFront?: boolean; leadRear?: boolean }) => {
      const g = freightGeometry('locomotive', opts);
      const l = g.getAttribute('stockLight');
      expect(l.count).toBe(g.getAttribute('position').count);
      const pos = g.getAttribute('position');
      let front = false,
        rear = false;
      for (let i = 0; i < l.count; i++) if (l.getX(i) === 2) (pos.getZ(i) > 0 ? (front = true) : (rear = true));
      g.dispose();
      return { front, rear };
    };
    expect(lit({ leadFront: true })).toEqual({ front: true, rear: false });
    expect(lit({ leadRear: true })).toEqual({ front: false, rear: true });
    expect(lit({})).toEqual({ front: false, rear: false });
  });
});
