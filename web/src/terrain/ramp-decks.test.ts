import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import register from '../../../pipeline/prototypes/connector-footprint/ramp-register.json';
import survey from '../../../pipeline/prototypes/connector-footprint/ramp-decks.json';
import { auburnTransport } from '../city/sweet-auburn-transport';
import type { P2 } from '../vignette/geom';
import { GroundGrid } from './grid';
import { applyRampDecks } from './ramp-decks';
import { GroundSurface } from './surface';
import { createSurfaceTransport } from './transport';
import type { TerrainCity, TransportRun } from './transport-data';

const board = new URL('../../../pipeline/prototypes/square-board/north-corner/', import.meta.url);
const context = (): TerrainCity => JSON.parse(readFileSync(new URL('context.json', board), 'utf8'));
const way = (id: number) => survey.ways.find(w => w.way === id)!;
const same = (a: P2, b: number[]) => a[0] === b[0] && a[1] === b[1];
const decksOn = (runs: TransportRun[], id: number) => {
  const pts = way(id).pts;
  return runs.filter(r => r.deckNavd88M && r.pts.every(p => pts.some((q, k) => k && segment(p, pts[k-1], q) < .05)));
};
function segment(p: P2, a: number[], b: number[]) {
  const dx = b[0]-a[0], dz = b[1]-a[1], t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dz) / (dx*dx + dz*dz)));
  return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz);
}
const heightAt = (runs: TransportRun[], p: number[]) => runs.flatMap(r => r.pts.flatMap((q, k) => same(q, p) ? [r.deckNavd88M![k]] : []));

it('profiles the Baker flyovers on north-corner and joins them flush', () => {
  const runs = auburnTransport(context()).terrainTransport!.roads;
  for (const id of [38974028, 38974034, 1450884828, 1450884829, 38974031, 39169033]) {
    const decks = decksOn(runs, id);
    expect(decks.length, `way ${id}`).toBeGreaterThan(0);
    for (const d of decks) {
      // No sliver pieces: a centimetre-rounded span end on a vertex is that vertex.
      for (let k = 1; k < d.pts.length; k++) expect(Math.hypot(d.pts[k][0]-d.pts[k-1][0], d.pts[k][1]-d.pts[k-1][1])).toBeGreaterThan(.05);
    }
  }
  // The phase-1 step: 38974034 into 1450884828 met 0.29-0.31 m apart. Every shared
  // vertex of the Baker chain now carries one height.
  for (const p of [[1041.09, -773.05], [1048.08, -766.59], [1053.98, -773.57], [1047.01, -780.13]]) {
    const h = heightAt(runs, p);
    expect(h.length, `${p}`).toBeGreaterThan(1);
    expect(Math.max(...h) - Math.min(...h)).toBeLessThan(.002);
  }
  // The SB and NB ends tie to the terrain: deck weight 0 at the tie vertex only.
  const tie = decksOn(runs, 38974031).find(r => r.deckWeight)!;
  expect(tie.deckWeight!.at(-1)).toBe(0);
  expect(tie.deckWeight!.slice(0, -1).every(w => w === 1)).toBe(true);
});

it('meets the downtown half of 38974028 at the x = 1000 seam at one height', () => {
  const north = auburnTransport(context()).terrainTransport!.roads;
  // Downtown's baked run starts where north-corner clips the way.
  const seam: P2 = [1000, -802.35];
  const pts = way(38974028).pts.filter(([x]) => x < 1000) as P2[];
  const downtown = { terrainTransport: { version: 1, rail: [], roads: [{ kind: 'bridge', cls: 'motorway', pts: [seam, ...pts] }] } } as unknown as TerrainCity;
  applyRampDecks(downtown);
  const south = downtown.terrainTransport!.roads;
  expect(same(south[0].pts[0], seam) && same(south.at(-1)!.pts.at(-1)!, pts.at(-1)!)).toBe(true);
  const [a] = heightAt(north, seam), [b] = heightAt(south, seam);
  expect(Math.abs(a - b)).toBeLessThan(.002);
  // Already-surveyed runs keep their own profile.
  const surveyed = { terrainTransport: { version: 1, rail: [], roads: [{ ...south[0], deckNavd88M: south[0].pts.map(() => 1) }] } } as unknown as TerrainCity;
  expect(applyRampDecks(surveyed).terrainTransport!.roads[0].deckNavd88M!.every(h => h === 1)).toBe(true);
});

it.each(['low', 'high'] as const)('draws the Baker flyover treads on their own measured surface on %s', quality => {
  const manifest = JSON.parse(readFileSync(new URL('ground.json', board), 'utf8'));
  const grid = new GroundGrid(manifest, Uint8Array.from(readFileSync(new URL('ground.i16', board))).buffer);
  const ground = new GroundSurface(grid, quality);
  const city = auburnTransport(context());
  const decks = createSurfaceTransport(city, grid, ground.sampleScene.bind(ground));
  const zero = manifest.vertical.sceneZeroNavd88M;
  const runs = city.terrainTransport!.roads;
  try {
    let checked = 0;
    for (const id of [38974028, 38974034, 1450884828, 1450884829]) {
      const pts = way(id).pts;
      const own = register.ways.find(w => w.way === id)!.stations;
      for (const station of own) {
        if (station.own == null) continue;
        // The register's stations are metres along the full way.
        let run = 0, at: P2 | null = null;
        for (let k = 1; k < pts.length && !at; k++) {
          const l = Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]);
          if (station.s <= run + l) { const t = (station.s - run) / l; at = [pts[k-1][0] + t*(pts[k][0]-pts[k-1][0]), pts[k-1][1] + t*(pts[k][1]-pts[k-1][1])]; }
          run += l;
        }
        if (!at || at[0] < 1000) continue;
        const hits = decksOn(runs, id).map(r => decks.deckAt(at![0], at![1], r)).filter((h): h is number => h !== null);
        if (!hits.length) continue;
        // Tread is the profile plus the deck lift; within 0.3 m of the measured own level.
        expect(Math.abs(Math.max(...hits) + zero - .12 - station.own), `${id} at ${station.s}`).toBeLessThan(.3);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
    // Both carriageways cross the x = 1000 seam obliquely. Their end rows lie on
    // the seam, so the tread reaches it across the slab: a perpendicular end row
    // clamped to the board left a 0.3 m wedge on this side.
    for (const [id, z] of [[38974028, -802.35], [38974034, -793.96]] as const) {
      for (const dz of [-1.2, 0, 1.2]) {
        const hits = decksOn(runs, id).map(r => decks.deckAt(1000.05, z + dz, r)).filter(h => h !== null);
        expect(hits.length, `${id} at z ${z + dz}`).toBeGreaterThan(0);
      }
    }
  } finally { decks.dispose(); ground.geometry.dispose(); }
});
