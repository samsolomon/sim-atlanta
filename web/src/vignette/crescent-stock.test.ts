import { describe, expect, it } from 'vitest';
import { AMFLEET_ROOF, VIEWLINER_ROOF, formation, passengerGeometry, type PassengerUnit } from './crescent-stock';

const top = (unit: PassengerUnit) => {
  const g = passengerGeometry(unit, false, false);
  g.computeBoundingBox();
  const y = g.boundingBox!.max.y;
  g.dispose();
  return y;
};

describe('Crescent cars', () => {
  it('keeps the published roof heights and the real 0.41 m step', () => {
    expect(AMFLEET_ROOF).toBe(3.86); // 12 ft 8 in
    expect(VIEWLINER_ROOF).toBe(4.27); // 14 ft
    // Roof ribs stand 26 mm proud of the roof sheet.
    for (const unit of ['coach', 'coachPhase7', 'cafe'] as const) expect(top(unit)).toBeCloseTo(AMFLEET_ROOF + 0.026, 2);
    for (const unit of ['diner', 'sleeper', 'baggageDorm', 'baggage'] as const) expect(top(unit)).toBeCloseTo(VIEWLINER_ROOF + 0.026, 2);
  });

  it('runs two Phase VII coaches and one Phase VI, as on train 20 on 24 May 2025', () => {
    expect(formation.filter((u) => u === 'coachPhase7')).toHaveLength(2);
    expect(formation.filter((u) => u === 'coach')).toHaveLength(1);
  });
});
