import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cityRoadHeight } from '../city/road-height';
import { mix, ribbons, stripePoint } from '../terrain/connector-corridor';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';
import { northConnectorGround, northConnectorTransport } from './connector-ground';
import floorsFile from '../../../pipeline/prototypes/connector-footprint/north-band-floors.json';

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
  expect(changed).toBe(224);
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

// The drawn ground, not only the grid: nodeHeights later applies the covered-pavement
// patch (underpass-floors.json). Baked over the raw DEM it restored the Civic Center
// roof returns these floors remove, drawing node (375, -1425) 12.4 m above the lanes.
it.each(['low','high'] as const)('draws the Civic Center lanes on their floors, not the roof returns, on %s', quality => {
  const ground = new GroundSurface(grid, quality), zero = m.vertical.sceneZeroNavd88M;
  const inFloor = ([x, z]: P2) => floorsFile.floors.some(({ start: [x0, z0], end: [x1, z1], halfWidthM }) => {
    const dx = x1-x0, dz = z1-z0, length = Math.hypot(dx, dz);
    const t = ((x-x0)*dx + (z-z0)*dz) / (length*length), side = ((z-z0)*dx - (x-x0)*dz) / length;
    return t >= 0 && t <= 1 && Math.abs(side) < halfWidthM;
  });
  let checked = 0;
  try {
    for (const road of ribbons) {
      if (road.kind !== 'ground') continue;
      for (let i = 0; i < road.rows.length; i++) for (const half of i < road.rows.length-1 ? [0, .5] : [0]) {
        const row = half ? { s: 0, inner: mix(road.rows[i].inner, road.rows[i+1].inner, .5), outer: mix(road.rows[i].outer, road.rows[i+1].outer, .5) } : road.rows[i];
        for (let lane = 0; lane < road.lanes; lane++) {
          const p = stripePoint(row, (lane+.5)/road.lanes);
          if (!inFloor(p)) continue;
          const drawn = ground.sampleScene(...p)! + zero;
          // Two surveys meet here: the floor and the covered-pavement plane. They
          // differ by up to 0.51 m; a restored roof return is 10.75 m.
          expect(drawn - grid.sample(...p)!).toBeLessThan(.75);
          if ([1467383128,525603074,492215616].includes(road.id)) {
            expect(drawn).toBeGreaterThan(292);
            expect(drawn).toBeLessThan(297);
          }
          checked++;
        }
      }
    }
    expect(ground.sampleScene(375, -1425)! + zero).toBeLessThan(296);
    // The outside of the bend at the shared feeder-floor joint below Spring/Techwood.
    expect(ground.sampleScene(245, -1455)! + zero).toBeLessThan(290.3);
    expect(checked).toBeGreaterThan(400);
  } finally { ground.geometry.dispose(); }
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
