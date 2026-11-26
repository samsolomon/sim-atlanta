import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { GroundSurface } from '../terrain/surface';
import { auburnGround, auburnTransport } from './sweet-auburn-transport';

const auburn = new URL('../../../pipeline/prototypes/sweet-auburn/', import.meta.url);
const context: TerrainCity = JSON.parse(readFileSync(new URL('context.json', auburn), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('ground/ground.json', auburn), 'utf8'));
const bytes = Uint8Array.from(readFileSync(new URL('ground/ground.i16', auburn))).buffer;
const zero = manifest.vertical.sceneZeroNavd88M;

it.each(['low', 'high'] as const)('draws the Sweet Auburn viaduct as one deck over Auburn, Edgewood and Leonard Tate on %s', quality => {
  const grid = auburnGround(manifest, bytes);
  const ground = new GroundSurface(grid, quality);
  const groundAt = ground.sampleScene.bind(ground);
  const city = auburnTransport(context);
  const decks = createSurfaceTransport(city, grid, groundAt);
  const runs = city.terrainTransport!.roads.filter(r => r.kind === 'bridge' && r.cls === 'motorway');
  // Highest drawn road tread at a plan point, across every motorway deck.
  const tread = (x: number, z: number) => {
    const hits = runs.map(r => decks.deckAt(x, z, r)).filter((h): h is number => h !== null);
    return hits.length ? Math.max(...hits) + zero : null;
  };
  try {
    // Each pair straddles a seam where two mapped ways met with a 0.39-0.81 m step:
    // the SB main and its managed lane at Auburn, the SB outer entrance and the NB
    // link at Edgewood, and the NB main beside its ramp at Auburn.
    for (const [x0, x1, z] of [[1207.75, 1208.0, -180], [1221.85, 1222.1, -180], [1179.0, 1179.3, -60], [1213.2, 1213.45, -60]]) {
      const a = tread(x0, z), b = tread(x1, z);
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(Math.abs(a! - b!)).toBeLessThan(.03);
    }
    // Over the Leonard Tate opening the street is lowered to about 297-301 m. The
    // SB ramp leaving the deck and the NB main arriving at it ride the freeway top
    // the 2019 class-2 returns measure there (306.1-306.9 m) on a deck of their own.
    for (const [x, z, top] of [[1086.5, 158.2, 306.2], [1091.3, 238.8, 306.9]]) {
      const h = tread(x, z);
      expect(h).not.toBeNull();
      expect(Math.abs(h! - top)).toBeLessThan(.4);
    }
    // Away from the viaduct a profiled span lands flush on its ground tie. Way
    // 1414820398's span starts at (1169.67, -461.07) on 300.29 m over 300.27 m
    // ground: the whole cross-section stays on the ground, with no trench under it.
    const span = runs.find(r => r.deckNavd88M && Math.hypot(r.pts[0][0]-1169.67, r.pts[0][1]+461.07) < .05)!;
    expect(span).toBeDefined();
    const [a, b] = span.pts, len = Math.hypot(b[0]-a[0], b[1]-a[1]), ux = (b[0]-a[0])/len, uz = (b[1]-a[1])/len;
    for (const off of [-2, -1, 0, 1, 2]) {
      const x = a[0] + .5*ux - off*uz, z = a[1] + .5*uz + off*ux;
      const top = decks.deckAt(x, z, span);
      expect(top).not.toBeNull();
      console.log('EDGE', off, (top! - .12 - groundAt(x, z)!).toFixed(3));
      expect(Math.abs(top! - .12 - groundAt(x, z)!)).toBeLessThan(.12);
      expect(decks.cutting.some(y => pointIn(y.ring, x, z))).toBe(false);
    }
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

function pointIn(ring: readonly (readonly [number, number])[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = ring.length-1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < (xj-xi)*(z-zi)/(zj-zi)+xi) inside = !inside;
  }
  return inside;
}
