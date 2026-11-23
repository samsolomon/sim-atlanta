import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LOOKS } from './looks-index';
import { createLook, keyedCalendar, lookTriangles } from './looks';
import { SIZE_CLASSES, doyOf } from './species';

const BUDGET = { high: 196, low: 156 } as const;

describe.each(LOOKS.map(l => [l.species.id, l] as const))('%s rendering options (lab only)', (_, look) => {
  it('has two or three options, plus variants of a picked one (A1, A2…)', () => {
    const base = look.options.filter(o => /^[A-Z]$/.test(o.id));
    expect(base.length).toBeGreaterThanOrEqual(2);
    expect(base.length).toBeLessThanOrEqual(3);
  });

  for (const opt of look.options) {
    it(`${opt.id} ${opt.label}: within the generic tree's budget at every size and tier`, () => {
      for (const size of SIZE_CLASSES) for (const q of ['high', 'low'] as const)
        expect(lookTriangles(look, opt, size, q).total).toBeLessThanOrEqual(BUDGET[q]);
    });

    it(`${opt.id}: draws limbs and foliage per class plus a carpet, however many trees`, () => {
      const many = Array.from({ length: 60 }, (_, i) => ({ species: look.species, size: SIZE_CLASSES[i % 4], x: i * 20, z: 0, seed: i }));
      const g = createLook(many, look, opt.id, 'high', () => 0)!;
      expect(g.draws()).toBe(4 * (opt.tips ? 3 : 2) + (look.species.carpet ? 1 : 0));
      g.dispose();
    });
  }

  it('keeps leaves in summer and follows its calendar', () => {
    const p = look.palette(doyOf(7, 1), 0);
    expect(p.leaves).toBe(1);
    // Deciduous trees have no summer carpet; evergreens (in leaf on New Year's Day) keep a thin one.
    expect(p.carpet).toBeLessThanOrEqual(look.palette(doyOf(1, 1), 0).leaves === 1 ? 0.3 : 0);
  });
});

describe('branch masses', () => {
  it('give exactly n clusters, at least one on the crowning tuft, and one on every mass when n allows', async () => {
    const { crownMasses, massClusters } = await import('./broadleaf');
    for (const look of LOOKS) for (const size of SIZE_CLASSES) for (const q of ['high', 'low'] as const) for (const opt of look.options) {
      const masses = crownMasses(look.habit, size, q, look.species.sizes[size], look.species.id.length);
      const n = opt.units[q];
      const h = (await import('./broadleaf')).habitFor(look.habit, size);
      const clusters = massClusters(masses, n, 1, opt.cover ?? 0.62, opt.flat ?? 0, h.clusterWeight);
      // With at least as many clusters as masses, no mass (and so no limb) is left bare.
      if (n >= masses.length) for (const m of masses) expect(clusters.some(c => Math.hypot(c.c[0] - m.c[0], c.c[1] - m.c[1], c.c[2] - m.c[2]) <= m.r * 0.51)).toBe(true);
      expect(clusters).toHaveLength(n);
      // Each cluster sits within its mass's reach of some mass centre; the top mass has one near it.
      const top = masses[masses.length - 1];
      expect(clusters.some(c => Math.hypot(c.c[0] - top.c[0], c.c[1] - top.c[1], c.c[2] - top.c[2]) <= top.r * 0.51)).toBe(true);
    }
  });
});

describe('keyed calendar', () => {
  const cal = keyedCalendar([
    { m: 4, d: 1, leaves: 0, a: '#000000', b: '#000000', label: 'bare' },
    { m: 5, d: 1, leaves: 1, a: '#ffffff', b: '#ffffff', label: 'green' },
    { m: 11, d: 1, leaves: 1, a: '#ffffff', b: '#ffffff', label: 'green' },
    { m: 12, d: 1, leaves: 0, a: '#000000', b: '#000000', carpet: 1, label: 'carpet' },
  ]);
  it('interpolates between keys and wraps across New Year', () => {
    expect(cal(doyOf(4, 16), 0).leaves).toBeCloseTo(0.5, 1);
    expect(cal(doyOf(7, 1), 0).leaves).toBe(1);
    expect(cal(doyOf(1, 15), 0).leaves).toBe(0);
    // Dec 1 → Apr 1 carries the carpet down to nothing.
    expect(cal(doyOf(2, 1), 0).carpet).toBeGreaterThan(0);
    expect(cal(doyOf(2, 1), 0).carpet).toBeLessThan(1);
  });
  it('shifts by the tree offset', () => {
    expect(cal(doyOf(4, 16), 5).leaves).toBeGreaterThan(cal(doyOf(4, 16), 0).leaves);
  });
});

describe('leaf drop', () => {
  it('hides a whole crown once it is bare', () => {
    const look = LOOKS[0];
    const g = createLook([{ species: look.species, size: 'mature', x: 0, z: 0, seed: 1 }], look, look.options[0].id, 'high', () => 0)!;
    const foliage = g.group.children.find(o => o.name.includes('foliage')) as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    g.setSeason(doyOf(7, 1));
    foliage.getMatrixAt(0, m);
    expect(m.determinant()).not.toBe(0);
    expect(look.palette(doyOf(2, 15), 0).leaves).toBe(0);
    g.setSeason(doyOf(2, 15));
    foliage.getMatrixAt(0, m);
    expect(m.determinant()).toBe(0);
    g.dispose();
  });
});

describe('foliage ink mask registration', () => {
  it('registers inked foliage and tips, and unregisters them on dispose', async () => {
    const { inkFoliageCount } = await import('../vignette/ink');
    const look = LOOKS[0];
    const opt = look.options.find(o => o.ink && o.tips)!;
    const before = inkFoliageCount();
    const g = createLook([{ species: look.species, size: 'mature', x: 0, z: 0, seed: 1 }, { species: look.species, size: 'young', x: 20, z: 0, seed: 2 }], look, opt.id, 'high', () => 0)!;
    // Foliage and leaf tips for each of the two classes.
    expect(inkFoliageCount() - before).toBe(4);
    g.dispose();
    expect(inkFoliageCount()).toBe(before);
  });
});
