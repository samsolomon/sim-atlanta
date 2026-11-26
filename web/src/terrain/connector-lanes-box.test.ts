import { expect, it } from 'vitest';
import { pointInRing, segDist } from '../vignette/geom';
import { ribbons } from './connector-corridor';
import { inConnectorLanes } from './connector-paint';

/** The box check in front of the lane test may only skip quads the exact test would refuse. */
it('answers like testing every lane quad, at the offsets parapets and rails ask about', () => {
  let t = 11;
  const r = () => { t = Math.imul(t ^ (t >>> 13), 0x5bd1e995) + 0x6d2b79f5 | 0; return ((t ^ (t >>> 15)) >>> 0) / 4294967296; };
  const quads = ribbons.flatMap(ribbon => ribbon.rows.slice(1).map((b, i) => {
    const a = ribbon.rows[i];
    return { ribbon, ring: [a.inner, b.inner, b.outer, a.outer] };
  }));
  let inside = 0, outside = 0;
  for (let n = 0; n < 900; n++) {
    const quad = quads[Math.floor(r() * quads.length)];
    const [px, pz] = quad.ring[Math.floor(r() * 4)];
    const spread = r() < .5 ? .6 : 12;
    const x = px + (r() - .5) * spread, z = pz + (r() - .5) * spread;
    // The index files a quad in every cell its box reaches within 4 m, so margins stay under that.
    for (const margin of [0, .18, .6, 1, 1.8, 3.7]) {
      const except = r() < .3 ? new Set([quad.ribbon]) : undefined;
      const expected = quads.some(q => !except?.has(q.ribbon) && (pointInRing(x, z, q.ring) ||
        (margin > 0 && q.ring.some((a, i) => segDist(x, z, a, q.ring[(i + 1) % 4]) < margin))));
      if (expected) inside++; else outside++;
      expect(inConnectorLanes(x, z, margin, except), `${x},${z} ${margin}`).toBe(expected);
    }
  }
  expect(inside).toBeGreaterThan(500);
  expect(outside).toBeGreaterThan(500);
}, 60_000);
