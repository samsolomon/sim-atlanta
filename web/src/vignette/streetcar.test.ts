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

  it('keeps the body stripes and their window film outside every door frame', () => {
    const geometry = s70Geometry();
    const pos = geometry.getAttribute('position');
    const layers = new Set<string>();
    const tolerance = 1e-5;
    for (let i = 0; i < pos.count; i += 3) {
      const vertices = [i, i + 1, i + 2];
      // Each of the three body colours has its own decal plane. All film shares a fourth.
      const offsets = [0.047, 0.0473, 0.0476, 0.049];
      const layer = offsets.findIndex(offset => vertices.every(v =>
        Math.abs(Math.abs(pos.getX(v)) - S70_WIDTH / 2 - offset) < tolerance));
      if (layer < 0) continue;
      layers.add([Math.sign(pos.getX(i)), Math.sign(pos.getZ(i)), layer].join('/'));
      const z = vertices.map(v => Math.abs(pos.getZ(v)));
      const y = vertices.map(v => pos.getY(v));
      for (const door of [3.8, 6.45]) {
        const clearsFrame = Math.max(...z) <= door - 0.65 + tolerance
          || Math.min(...z) >= door + 0.65 - tolerance
          || Math.max(...y) <= 0.34 + tolerance || Math.min(...y) >= 2.86 - tolerance;
        expect(clearsFrame, `decal triangle ${i / 3}, door ${door}`).toBe(true);
      }
    }
    expect(layers.size).toBe(2 * 2 * 4); // both sides and cab ends retain all four planes
    geometry.dispose();
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
      const slack = 0.01;
      expect(b.min.z).toBeGreaterThan(-half - slack);
      expect(b.max.z).toBeLessThan(half + slack);
      for (const z of p.pivots) expect(Math.abs(z - p.centre)).toBeLessThanOrEqual(half + 1e-6);
      expect(p.geometry.getAttribute('stockLight').count).toBe(p.geometry.getAttribute('position').count);
      p.geometry.dispose();
    }
  });

  it('lights white at the leading cab and red at the trailing cab', () => {
    // Lamp colours per section: 'w' if any warm-white lamp, 'r' if any red lamp.
    const lamps = (opts: { leadingA: boolean; leadingB: boolean }) => {
      const out: Record<string, string> = {};
      for (const p of s70Sections(opts)) {
        const light = p.geometry.getAttribute('stockLight'),
          col = p.geometry.getAttribute('color');
        let w = false,
          r = false;
        for (let i = 0; i < light.count; i++) {
          if (light.getX(i) !== 2) continue;
          if (col.getX(i) > 0.9 && col.getY(i) < 0.3) r = true;
          else if (col.getY(i) > 0.8) w = true;
        }
        out[p.id] = (w ? 'w' : '') + (r ? 'r' : '');
        p.geometry.dispose();
      }
      return out;
    };
    expect(lamps({ leadingA: true, leadingB: false })).toEqual({ B: 'r', C: '', A: 'w' });
    expect(lamps({ leadingA: false, leadingB: true })).toEqual({ B: 'w', C: '', A: 'r' });
    expect(lamps({ leadingA: false, leadingB: false })).toEqual({ B: '', C: '', A: '' });
  });
});
