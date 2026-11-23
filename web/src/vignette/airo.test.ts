import { describe, expect, it } from 'vitest';
import { AIRO_LENGTH, AIRO_ROOF } from './airo';
import { dimensions, formation, passengerGeometry } from './crescent-stock';

describe('Siemens Airo coach (lab only)', () => {
  it('uses the data-sheet envelope and stays out of the Crescent', () => {
    expect(dimensions('airoCoach')).toEqual({ length: 25.91, trucks: 18.14 });
    expect(formation).not.toContain('airoCoach');
    const g = passengerGeometry('airoCoach', false, true);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    expect(box.max.y).toBeCloseTo(AIRO_ROOF, 3);
    expect(box.max.z).toBeLessThanOrEqual(AIRO_LENGTH / 2 + 1e-6);
    expect(box.min.z).toBeGreaterThanOrEqual(-AIRO_LENGTH / 2 - 1e-6);
    const light = Array.from(g.getAttribute('stockLight').array);
    expect(light.includes(1)).toBe(true); // glazing lights at night
    expect(light.includes(2)).toBe(true); // rear markers on a trailing car
    g.dispose();
    const mid = passengerGeometry('airoCoach', false, false);
    expect(Array.from(mid.getAttribute('stockLight').array).includes(2)).toBe(false);
    mid.dispose();
  });
});
