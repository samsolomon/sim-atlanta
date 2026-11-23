import { expect, test } from 'vitest';
import details from '../../../pipeline/prototypes/piedmont-edge/details.json';
import upper from '../../../pipeline/prototypes/square-board/midtown-upper/context.json';
import central from '../../../pipeline/prototypes/square-board/midtown-central/context.json';
import { segDist, type P2 } from '../vignette/geom';
import { roadWidth, type TerrainCity } from '../terrain/transport-data';
import { piedmontPark, placeBeside } from './piedmont-park';

const flat = () => 290;
const cities = { upper: upper as unknown as TerrainCity, central: central as unknown as TerrainCity };
const within = (c: TerrainCity, [x, z]: P2) => x >= c.bounds.minX && x <= c.bounds.maxX && z >= c.bounds.minZ && z <= c.bounds.maxZ;

test('places every mapped furniture point once across the two park boards, plus a kiosk at each main entrance', () => {
  const placed = Object.values(cities).map(c => piedmontPark(c, flat, 'high'));
  // The two rows split the park at z = −3300: no point is built twice or dropped.
  const mapped = details.furniture.filter(p => Object.values(cities).some(c => within(c, p.at as P2))).length;
  expect(mapped).toBeGreaterThan(50);
  expect(placed.reduce((s, p) => s + (p?.pieces ?? 0), 0)).toBe(mapped + 3);
  const tris = placed.reduce((s, p) => s + (p?.triangles ?? 0), 0);
  // Measured 3,284 for 57 pieces and three kiosks.
  expect(tris).toBeLessThan(5000);
  placed.forEach(p => p?.dispose());
});

test('adds no furniture on the low tier; the 10th Street gate stands on both tiers like the other gates', () => {
  expect(piedmontPark(cities.upper, flat, 'low')).toBeNull();
  const low = piedmontPark(cities.central, flat, 'low')!;
  expect(low.pieces).toBe(0);
  expect(low.group.getObjectByName('piedmont-gates')).toBeDefined();
  expect(low.group.getObjectByName('piedmont-furniture')).toBeUndefined();
  low.dispose();
});

test('stands each piece clear of the nearest paving and facing it', () => {
  let checked = 0;
  for (const p of details.furniture) {
    const city = Object.values(cities).find(c => within(c, p.at as P2));
    if (!city) continue;
    const spot = placeBeside(city, p.at as P2);
    let best = { d: Infinity, half: 0, toward: [0, 0] as P2 };
    for (const r of city.roads) {
      if (r.bridge || r.tunnel) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const a = r.pts[i - 1] as P2, b = r.pts[i] as P2, d = segDist(spot.at[0], spot.at[1], a, b);
        if (d < best.d) best = { d, half: roadWidth(r) / 2, toward: [(a[0] + b[0]) / 2 - spot.at[0], (a[1] + b[1]) / 2 - spot.at[1]] };
      }
    }
    if (best.d > 15) continue;
    checked++;
    // Clear of the paving by at least half a metre (the gap is 0.6 m, less a little for a bend nearby)...
    expect(best.d - best.half).toBeGreaterThan(.45);
    // ...and turned to face it.
    expect(Math.cos(spot.facing) * best.toward[0] + Math.sin(spot.facing) * best.toward[1]).toBeGreaterThan(0);
  }
  expect(checked).toBeGreaterThan(40);
});
