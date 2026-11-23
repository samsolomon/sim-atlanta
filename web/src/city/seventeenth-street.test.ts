import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createSurfaceTransport } from '../terrain/transport';
import { auburnTransport } from './sweet-auburn-transport';
import { cityRoadHeight } from './road-height';

it('carries 17th Street and its walks on the lidar crest above the through motorway', () => {
  const file = (name: string) =>
    readFileSync(
      new URL('../../../pipeline/prototypes/square-board/brookwood-south/' + name, import.meta.url),
    );
  const city = auburnTransport(JSON.parse(file('context.json').toString()));
  const grid = new GroundGrid(
    JSON.parse(file('ground.json').toString()),
    Uint8Array.from(file('ground.i16')).buffer,
  );
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const ground = (x: number, z: number) => grid.sample(x, z)! - zero;
  const model = createSurfaceTransport(city, grid, ground);
  try {
    const height = cityRoadHeight(city, ground, model.deckAt);
    const crossing = city.roads.find((r) => r.name === '17th Street Northwest' && r.pts[0][0] === -169.35)!;
    const lower = city.roads.find((r) => r.cls === 'motorway' && r.pts[0][0] === 24.06)!;
    const x = 12.3,
      z = -4157.01 + ((x + 101.68) * (-4211.78 + 4157.01)) / (82.46 + 101.68);
    expect(height(x, z, crossing)! + zero).toBeCloseTo(280.5, 0);
    expect(height(x, z, lower)).toBe(ground(x, z));
    expect(height(x, z, crossing)! - height(x, z, lower)!).toBeGreaterThan(15);
    const walk = city.terrainTransport!.roads.find((r) => r.pts[0][0] === 87.5)!;
    const [a, b] = [walk.pts[0], walk.pts[1]];
    expect(model.deckAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, walk)).not.toBeNull();
    expect(model.deckAt(x, z, walk)).toBeNull();
  } finally {
    model.dispose();
  }
});
