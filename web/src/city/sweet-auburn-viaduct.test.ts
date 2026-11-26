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
  } finally { decks.dispose(); ground.geometry.dispose(); }
});
