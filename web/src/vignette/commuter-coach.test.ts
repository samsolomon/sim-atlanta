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
  for (const low of [false, true]) {
    it(`hangs each mirror from its arm with no gap (${low ? 'low' : 'high'})`, () => {
      const p = commuterCoachGeometry(low).getAttribute('position');
      for (const side of [-1, 1]) {
        // Height spans of the triangles in the mirror's drop, from the arm down to the housing.
        const spans: [number, number][] = [];
        for (let i = 0; i < p.count; i += 3) {
          const v = [0, 1, 2].map(j => [p.getX(i + j), p.getY(i + j), p.getZ(i + j)]);
          if (v.every(([x, , z]) => Math.abs(x - side * (COACH_WIDTH / 2 + 0.12)) < 0.06 && z > COACH_LENGTH / 2 - 1))
            spans.push([Math.min(...v.map(q => q[1])), Math.max(...v.map(q => q[1]))]);
        }
        let reach = 2.2;
        for (const [lo, hi] of spans.sort((a, b) => a[0] - b[0])) if (lo <= reach + 0.01) reach = Math.max(reach, hi);
        expect(reach).toBeGreaterThan(3.05); // the arm's underside is at about 3.04 m
      }
    });
  }
  it('lights headlights at the front and tail lamps at the rear', () => {
    const g = commuterCoachGeometry();
    const p = g.getAttribute('position'), k = g.getAttribute('aKind');
    let front = 0, tail = 0;
    for (let i = 0; i < p.count; i++) {
      if (k.getX(i) === 2) { tail++; expect(p.getZ(i)).toBeLessThan(-COACH_LENGTH / 2 + 0.1); }
      // Kind 1 is also the amber rear marker, so require lamps on the front face rather than only there.
      if (k.getX(i) === 1 && p.getZ(i) > COACH_LENGTH / 2 - 0.1) front++;
    }
    expect(front).toBeGreaterThan(0);
    expect(tail).toBeGreaterThan(0);
    g.dispose();
  });
});
