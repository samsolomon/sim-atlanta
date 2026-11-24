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

describe('new freight families', () => {
  for (const unit of ['es44acNs', 'es44ah', 'sd70ace', 'gp382'] as const) {
    it(`${unit} sits on the rail, fits its declared length, and lights only the leading end`, () => {
      for (const end of ['none', 'front', 'rear'] as const) {
        const g = freightGeometry(unit, { leadFront: end === 'front', leadRear: end === 'rear' });
        g.computeBoundingBox();
        const box = g.boundingBox!;
        expect(box.min.y).toBeCloseTo(0, 4);
        expect(box.max.z - box.min.z).toBeLessThanOrEqual(FREIGHT_LENGTH[unit] + .05);
        expect(box.max.x - box.min.x).toBeLessThan(3.4);
        expect(box.max.y).toBeLessThan(5);
        const p = g.getAttribute('position'), light = g.getAttribute('stockLight');
        const litZ = Array.from({ length: p.count }, (_, i) => i).filter(i => light.getX(i) === 2).map(i => p.getZ(i));
        if (end === 'none') expect(litZ).toHaveLength(0);
        else {
          expect(litZ.length).toBeGreaterThan(0);
          expect(litZ.every(z => end === 'front' ? z > 0 : z < 0)).toBe(true);
        }
        expect(p.count / 3).toBeLessThan(5000);
        g.dispose();
      }
    });
  }
  it('uses the GATX GP38-2 wheelbase and a distinct shorter body', () => {
    expect(FREIGHT_TRUCK_SPACING.gp382).toBeCloseTo(34 * .3048, 4);
    expect(FREIGHT_LENGTH.gp382).toBeCloseTo((59 + 2/12) * .3048, 2);
    const gp = freightGeometry('gp382'), sd = freightGeometry('sd70ace');
    expect(Array.from(gp.getAttribute('position').array)).not.toEqual(Array.from(sd.getAttribute('position').array));
    gp.dispose(); sd.dispose();
  });
});
