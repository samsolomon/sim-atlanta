import { describe, expect, it } from 'vitest';
import { PANTOGRAPH, S70_LAYOUT, S70_LENGTH, S70_WIDTH, s70Geometry, s70Sections } from './streetcar';

const box = (g: ReturnType<typeof s70Geometry>) => {
  g.computeBoundingBox();
  return g.boundingBox!;
};

describe('Siemens S70 (Atlanta Streetcar)', () => {
  it('fits the data-sheet envelope', () => {
    const g = s70Geometry();
    const b = box(g);
    expect(b.max.z - b.min.z).toBeLessThanOrEqual(S70_LENGTH + 1e-3); // over anticlimbers
    expect(b.max.z - b.min.z).toBeGreaterThan(S70_LENGTH - 0.05);
    // Mirrors stand proud of the 2.65 m body; the body itself stays inside it.
    expect(b.max.x).toBeLessThan(S70_WIDTH / 2 + 0.2);
    expect(b.max.y).toBeCloseTo(PANTOGRAPH + 0.025, 2);
    g.dispose();
  });

  it('splits into three sections that keep every triangle and sit between their pivots', () => {
    const whole = s70Geometry();
    const total = whole.getAttribute('position').count;
    whole.dispose();
    const parts = s70Sections();
    expect(parts.map((p) => p.id)).toEqual(['B', 'C', 'A']);
    expect(parts.reduce((n, p) => n + p.geometry.getAttribute('position').count, 0)).toBe(total);
    for (const p of parts) {
      const sec = S70_LAYOUT.sections[p.id];
      const b = box(p.geometry);
      const half = (sec.to - sec.from) / 2;
      // The centre section also carries the two 0.3 m bellows.
      const slack = p.id === 'C' ? 0.3 : 0.01;
      expect(b.min.z).toBeGreaterThan(-half - slack);
      expect(b.max.z).toBeLessThan(half + slack);
      for (const z of p.pivots) expect(Math.abs(z - p.centre)).toBeLessThanOrEqual(half + 0.3); // joints sit in the bellows gap
      expect(p.geometry.getAttribute('stockLight').count).toBe(p.geometry.getAttribute('position').count);
      p.geometry.dispose();
    }
  });

  it('lights head lamps only on a leading cab and red markers only on a trailing one', () => {
    const lit = (opts: { leadingA: boolean; leadingB: boolean }) => {
      const parts = s70Sections(opts);
      const res = Object.fromEntries(parts.map((p) => [p.id, Array.from(p.geometry.getAttribute('stockLight').array).includes(2)]));
      parts.forEach((p) => p.geometry.dispose());
      return res;
    };
    expect(lit({ leadingA: true, leadingB: false })).toEqual({ B: true, C: false, A: true });
    expect(lit({ leadingA: false, leadingB: false })).toEqual({ B: false, C: false, A: false });
  });
});
