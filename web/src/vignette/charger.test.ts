import { describe, expect, it } from 'vitest';
import { CHARGER_HEIGHT, CHARGER_LENGTH, CHARGER_TRUCKS } from './charger';
import { dimensions, passengerGeometry } from './crescent-stock';

const lights = (unit: 'charger' | 'chargerPhase6', leading: boolean, trailing: boolean) => {
  const g = passengerGeometry(unit, leading, trailing);
  const light = g.getAttribute('stockLight');
  expect(light.count).toBe(g.getAttribute('position').count);
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const values = Array.from(light.array);
  g.dispose();
  return { lit: values.includes(2), glazing: values.includes(1), box };
};

describe('ALC-42 Charger', () => {
  it('uses the Siemens data-sheet envelope', () => {
    expect(dimensions('charger')).toEqual({ length: 21.79, trucks: 12.44 });
    expect(dimensions('chargerPhase6')).toEqual(dimensions('charger'));
    const { box } = lights('charger', true, false);
    // Nothing pokes past the over-couplers length that layout() couples neighbours at.
    expect(box.max.z).toBeLessThanOrEqual(CHARGER_LENGTH / 2 + 1e-6);
    expect(box.min.z).toBeGreaterThanOrEqual(-CHARGER_LENGTH / 2 - 1e-6);
    expect(box.max.y).toBeCloseTo(CHARGER_HEIGHT, 2);
    expect(CHARGER_TRUCKS).toBe(12.44);
  });

  it.each(['charger', 'chargerPhase6'] as const)('%s lights lamps only on an exposed end', (unit) => {
    expect(lights(unit, true, false).lit).toBe(true);
    expect(lights(unit, false, true).lit).toBe(true);
    expect(lights(unit, false, false).lit).toBe(false);
    expect(lights(unit, true, true).glazing).toBe(false);
  });
});
