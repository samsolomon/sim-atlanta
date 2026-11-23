import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { brookwoodGrid } from '../city/brookwood';
import { auburnTransport } from '../city/sweet-auburn-transport';
import railRows from '../city/fixtures/midtown-rail.json';
import type { TransportRun } from '../terrain/transport-data';
import { bridgeApproaches } from '../terrain/bridge-approaches';
import { seventeenthAccess, seventeenthPortals } from '../city/seventeenth-street';
import { GroundGrid } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import { Line } from '../vignette/geom';
import { midtownRows, joins } from './sections';

function read(row: string, name: string) {
  return readFileSync(new URL('../../../pipeline/prototypes/square-board/' + row + '/' + name, import.meta.url));
}

function ground(row: string) {
  const manifest = JSON.parse(read(row, 'ground.json').toString());
  const bytes = Uint8Array.from(read(row, 'ground.i16')).buffer;
  return row.startsWith('brookwood') ? brookwoodGrid(manifest, bytes) : new GroundGrid(manifest, bytes);
}

it('keeps the Brookwood rail cut continuous across both rendered rows', () => {
  const south = ground('brookwood-south'), north = ground('brookwood-station');
  const { minX, maxX, maxZ } = north.manifest.bounds;
  let delta = 0;
  for (let x = minX; x <= maxX; x += north.manifest.stepM) {
    const a = south.sample(x, maxZ), b = north.sample(x, maxZ);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    delta = Math.max(delta, Math.abs(a! - b!));
  }
  expect(delta).toBe(0);
  expect(north.sample(-80, -5065)).toBeCloseTo(264.4, 0);
});

it.each(['low','high'] as const)('audits rendered road tread against terrain at %s detail', quality => {
  for (const row of midtownRows) {
    const context = JSON.parse(read(row, 'context.json').toString());
    context.terrainTransport = {version: 1, roads: [], rail: railRows[row] as TransportRun[]};
    const city = seventeenthAccess(auburnTransport(context));
    const grid = ground(row), surface = new GroundSurface(grid, quality, undefined, joins(row));
    const bare = surface.sampleScene.bind(surface);
    const banks = bridgeApproaches(seventeenthPortals(city), grid.manifest.vertical.sceneZeroNavd88M, bare, city.bounds, city.roads);
    const transport = createSurfaceTransport(city, grid, banks.groundAt);
    let count = 0, minimum = Infinity;
    for (const run of city.terrainTransport!.roads) {
      const line = new Line(run.pts);
      for (let s = 2.5; s < line.length; s += 5) {
        const {x,z} = line.at(s);
        const y = transport.deckAt(x,z,run), floor = banks.groundAt(x,z,run);
        if (y === null || floor === null) continue;
        count++;
        minimum = Math.min(minimum, y - floor);
      }
    }
    expect(count, row).toBeGreaterThan(80);
    expect(minimum, row).toBeGreaterThanOrEqual(0);
    banks.geometry.dispose();
    banks.walls.dispose();
    transport.dispose();
    surface.geometry.dispose();
  }
});

it('leaves inferred road clearance over an unsurveyed surface crossing', () => {
  const grid = ground('midtown-central');
  const run: TransportRun = { kind: 'bridge', cls: 'secondary', pts: [[-18,-2900],[18,-2900]] };
  const city = { bounds: grid.manifest.bounds, buildings: [], rail: [],
    roads: [{ cls: 'motorway', name: null, bridge: false, tunnel: false, pts: [[0,-2950],[0,-2850]] as [number,number][] }],
    terrainTransport: { version: 1 as const, roads: [run], rail: [] } };
  const floor = () => 5;
  const model = createSurfaceTransport(city, grid, floor);
  try {
    expect(model.deckAt(0, -2900, run)! - floor() - .95).toBeGreaterThanOrEqual(5);
    for (const x of [-18,18]) expect(model.deckAt(x,-2900,run)).toBeCloseTo(floor() + .12, 4);
  } finally { model.dispose(); }
});
