import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cityRoadHeight } from '../city/road-height';
import { GroundGrid } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';
import { southConnectorTransport } from './south-connector-decks';

const dir = new URL('../../../pipeline/prototypes/square-board/south-band/', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, dir));
const manifest = JSON.parse(read('ground.json').toString());
const grid = new GroundGrid(manifest, Uint8Array.from(read('ground.i16')).buffer);
const context: TerrainCity = JSON.parse(read('context.json').toString());

it.each(['high', 'low'] as const)('carries both I-20 decks across source joins and keeps the lower flyover on its own tread on %s', quality => {
  const city = southConnectorTransport(context);
  const surface = new GroundSurface(grid, quality);
  const groundAt = (x: number, z: number) => surface.sampleScene(x, z);
  const deck = createSurfaceTransport(city, grid, groundAt);
  const height = cityRoadHeight(city, groundAt, deck.deckAt);
  const zero = manifest.vertical.sceneZeroNavd88M;
  function check(start: P2, x: number, z: number, expected: number) {
    const source = city.roads.find(r => r.pts[0].toString() === start.toString())!;
    const road = city.terrainTransport!.roads.find(r => r.kind === 'bridge' && r.pts[0].toString() === start.toString())!;
    const y = deck.deckAt(x, z, road);
    expect(y, `deck from ${start} at ${x},${z}`).not.toBeNull();
    expect(y! + zero).toBeCloseTo(expected, 0);
    expect(height(x, z, source)).toBeCloseTo(y!, 3);
  }
  try {
    check([26.65,968.92], 189.12,1018.02, 311.2);
    check([190.06,1018.38], 191.0,1018.82, 311.2);
    check([260.46,1022.97], 205.32,994.76, 310.1);
    check([204.4,994.33], 203.47,993.95, 310.1);
    // Both treads share this x/z. The curved ramp passes below eastbound I-20.
    check([26.65,968.92], 141.19,999.73, 312.4);
    check([140.29,915.18], 141.19,999.73, 303.1);
    expect(groundAt(141.19,999.73)! + zero).toBeLessThan(296);
    // Its mapped way changes 2.5 m before the board edge, still in mid-air.
    check([190.74,1098.6], 191.8,1099.35, 304.8);
  } finally {
    deck.dispose();
    surface.geometry.dispose();
  }
});
