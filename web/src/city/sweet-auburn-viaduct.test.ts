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

it.each(['low', 'high'] as const)('draws the Sweet Auburn viaduct as one deck over Auburn, Edgewood and Leonard Tate on %s', async quality => {
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
    const spanPoints: [number, number][] = [];
    const [a, b] = span.pts, len = Math.hypot(b[0]-a[0], b[1]-a[1]), ux = (b[0]-a[0])/len, uz = (b[1]-a[1])/len;
    for (const off of [-2, -1, 0, 1, 2]) {
      const x = a[0] + .5*ux - off*uz, z = a[1] + .5*uz + off*ux;
      const top = decks.deckAt(x, z, span);
      expect(top).not.toBeNull();
      console.log('EDGE', off, (top! - .12 - groundAt(x, z)!).toFixed(3));
      expect(Math.abs(top! - .12 - groundAt(x, z)!)).toBeLessThan(.12);
      spanPoints.push([x, z]);
    }
    // Grok round 2: where a ramp's end comes near the fused deck (z -194) and where
    // 39169049 runs beside 962288411 (z -234..-205), no tread steps across the deck.
    for (const z of [-194, -234, -229, -224, -219, -214, -209, -205]) {
      let previous: number | null = null, worst = 0, at = 0;
      for (let x = 1170; x <= 1250; x += .25) {
        const h = tread(x, z);
        if (h !== null && previous !== null && Math.abs(h - previous) > worst) { worst = Math.abs(h - previous); at = x; }
        previous = h;
      }
      expect(worst, `z ${z} at x ${at}`).toBeLessThan(.05);
    }
    // Way 9238785 starts within reach of the street but has met grade at
    // (1148.5, 190.1), outside the lowered roof: no yield, no trench.
    // Carve the drawn ground with every yield: no trench at either point.
    const before = [...spanPoints, [1148.5, 190.1]].map(([x, z]) => groundAt(x, z)!);
    ground.carve(decks.cutting);
    [...spanPoints, [1148.5, 190.1]].forEach(([x, z], k) =>
      expect(Math.abs(groundAt(x, z)! - before[k]), `ground at ${x}, ${z}`).toBeLessThan(.05));
    // Deck yields lie only within 30 m of the board nodes the Leonard Tate correction edits.
    const edited = new Set((await import('../../../pipeline/prototypes/connector-footprint/sweet-auburn-decks.json')).underpass.nodes.map(([i]: number[]) => i));
    const steps = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    const onRoof = ([x, z]: readonly number[]) => steps.some(dr => steps.some(dc =>
      Math.hypot(dr, dc) * 5 <= 30 && edited.has((Math.round((z + 520) / 5) + dr) * 161 + Math.round((x - 1000) / 5) + dc)));
    expect(manifest.cols).toBe(161);
    const deckYields = decks.cutting.filter(y => y.ring.length === 4 && y.ring.some(([x, z]) => x > 1040 && x < 1200 && z > 60 && z < 280));
    for (const y of deckYields) expect(y.ring.some(onRoof)).toBe(true);
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

function segment(x: number, z: number, [ax, az]: readonly number[], [bx, bz]: readonly number[]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / ((dx * dx + dz * dz) || 1)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

function pointIn(ring: readonly (readonly [number, number])[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = ring.length-1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < (xj-xi)*(z-zi)/(zj-zi)+xi) inside = !inside;
  }
  return inside;
}
