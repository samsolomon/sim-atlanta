import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cityRoadHeight } from '../city/road-height';
import { ribbons, stripePoint } from '../terrain/connector-corridor';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';
import { northConnectorGround, northConnectorTransport } from './connector-ground';

const dir = new URL('../../../pipeline/prototypes/square-board/north-band/', import.meta.url);
const json = (name: string) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
const m: GroundManifest = json('ground.json');
const bytes = Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer;
const source = new GroundGrid(m, bytes);
const grid = northConnectorGround(m, bytes);
const context: TerrainCity = json('context.json');

it('lowers the Civic Center roof between exposed approaches and preserves every perimeter node', () => {
  let changed = 0;
  for (let row = 0; row < m.rows; row++) for (let col = 0; col < m.cols; col++) {
    if (source.node(row,col) === grid.node(row,col)) continue;
    expect(row).toBeGreaterThan(0); expect(row).toBeLessThan(m.rows-1);
    expect(col).toBeGreaterThan(0); expect(col).toBeLessThan(m.cols-1);
    expect(grid.node(row,col)!).toBeLessThan(source.node(row,col)!);
    changed++;
  }
  expect(changed).toBe(223);
  for (const p of [[385.59,-1382.04],[380,-1423]] as P2[]) {
    expect(source.sample(...p)!).toBeGreaterThan(307);
    expect(grid.sample(...p)!).toBeGreaterThan(293);
    expect(grid.sample(...p)!).toBeLessThan(296);
  }
  for (const id of [1467383128,525603074,492215616]) {
    const main = ribbons.find(road => road.id === id)!;
    for (const row of main.rows) for (let lane = 0; lane < main.lanes; lane++) {
      const y = grid.sample(...stripePoint(row,(lane+.5)/main.lanes))!;
      expect(y).toBeGreaterThan(292);
      expect(y).toBeLessThan(297);
    }
  }
  for (const p of [[379.2,-1333.16],[380.95,-1464.42],[157,-1560]] as P2[])
    expect(grid.sample(...p)).toEqual(source.sample(...p));
});

it.each(['low','high'] as const)('carries both Spring/Techwood decks above the SB feeder on %s', quality => {
  const city = northConnectorTransport(context), ground = new GroundSurface(grid,quality);
  const height = (x: number,z: number) => ground.sampleScene(x,z);
  const decks = createSurfaceTransport(city,grid,height), roadHeight = cityRoadHeight(city,height,decks.deckAt);
  try {
    const zero = m.vertical.sceneZeroNavd88M;
    for (const [name,x,z,target] of [['Spring Techwood Connector',236.0,-1451,299.45],[null,251.3,-1449.3,300.53]] as const) {
      const part = city.terrainTransport!.roads.find(r => r.name === name && r.pts[0][0] === 246.03)!;
      const roadway = city.roads.find(r => r.pts === part.pts)!;
      expect(height(x,z)!+zero).toBeCloseTo(289.7,0);
      const y = decks.deckAt(x,z,part)!;
      expect(y+zero).toBeCloseTo(target,0);
      expect(y-height(x,z)!).toBeGreaterThan(9);
      expect(roadHeight(x,z,roadway)).toBeCloseTo(y,4);
    }
  } finally { decks.dispose(); ground.geometry.dispose(); }
});
