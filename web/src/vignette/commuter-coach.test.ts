import { describe, expect, it } from 'vitest';
import { COACH_HEIGHT, COACH_LENGTH, COACH_WIDTH, commuterCoachGeometry } from './commuter-coach';

describe('Xpress-like highway commuter coach', () => {
  for (const low of [false, true]) {
    it(`fits the MCI D4500 envelope and stays in budget (${low ? 'low' : 'high'})`, () => {
      const g = commuterCoachGeometry(low);
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.y).toBeCloseTo(0, 3); // tyres on the ground
      // The spec height includes the low roof pod.
      expect(b.max.y).toBeLessThanOrEqual(COACH_HEIGHT + 0.01);
      // Forward-hung mirrors reach about 11 cm past the front face.
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(COACH_LENGTH + 0.15);
      // Body width plus mirrors.
      expect(b.max.x - b.min.x).toBeLessThan(COACH_WIDTH + 0.8);
      expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(low ? 1000 : 6140);
      // Shares busMaterial: every vertex carries a light kind it understands.
      const kinds = new Set(Array.from(g.getAttribute('aKind').array));
      expect([...kinds].every((k) => [0, 1, 2, 5, 7].includes(k))).toBe(true);
      expect(kinds.has(1) && kinds.has(2)).toBe(true);
      g.dispose();
    });
  }
  it('lights headlights at the front and tail lamps at the rear', () => {
    const g = commuterCoachGeometry();
    const p = g.getAttribute('position'), k = g.getAttribute('aKind');
    for (let i = 0; i < p.count; i++) {
      if (k.getX(i) === 2) expect(p.getZ(i)).toBeLessThan(-COACH_LENGTH / 2 + 0.1);
    }
    g.dispose();
  });
});
