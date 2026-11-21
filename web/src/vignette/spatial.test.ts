import { describe, expect, it } from 'vitest';
import { PlacementIndex } from './spatial';
import { pointInRing, segDist, type P2 } from './geom';

describe('placement broad phase', () => {
  it('preserves exact polygon hits across negative coordinates and cell edges', () => {
    const rings: P2[][] = [
      [[-130, -65], [65, -65], [65, 65], [-130, 65]],
      [[63, 63], [129, 63], [129, 130], [63, 130]],
      [[-64, -64], [-60, -64], [-60, -60], [-64, -60]],
    ];
    const index = new PlacementIndex<P2[]>();
    for (const r of rings) index.add(r, r, 2.5);
    for (let x = -140; x < 140; x += 1) for (let z = -70; z < 140; z += 7) {
      const hit = (r: P2[]) => pointInRing(x, z, r) || r.some((p, i) => segDist(x, z, p, r[(i + 1) % r.length]) < 2.5);
      expect(index.at(x, z).filter(hit)).toEqual(rings.filter(hit));
    }
  });

  it('preserves nearest crossing within 3 m and input-order ties', () => {
    const segments: [P2, P2][] = [
      [[-150, -64], [140, -64]], [[-64, -150], [-64, 140]],
      [[64, 62], [64, 66]], [[64, 62], [64, 66]],
    ];
    const index = new PlacementIndex<[P2, P2]>();
    for (const s of segments) index.add(s, s, 3);
    for (const [x, z] of [[-64, -64], [64, 64], [67, 64], [0, -66], [0, 0]]) {
      const nearest = (ss: readonly [P2, P2][]) => ss
        .map((s) => ({ s, d: segDist(x, z, ...s) }))
        .filter(({ d }) => d <= 3).sort((a, b) => a.d - b.d)[0]?.s;
      expect(nearest(index.at(x, z))).toBe(nearest(segments));
    }
    expect(index.at(10000, 10000)).toEqual([]);
  });
});
