import { readFileSync } from 'node:fs';
import { Box3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { seventeenthAccess } from './seventeenth-street';
import { auburnTransport } from './sweet-auburn-transport';
import {
  createElectricSaturation,
  createPeachtreePlaceShaft,
  ELECTRIC_SATURATION_ID,
  midtownVents,
  PEACHTREE_PLACE_SHAFT_ID,
  WALL_ABOVE_HIGH_GRADE,
} from './midtown-marta-vents';

const directory = new URL('../../../pipeline/prototypes/square-board/midtown-central/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, directory));
const grid = new GroundGrid(JSON.parse(read('ground.json').toString()), Uint8Array.from(read('ground.i16')).buffer);
afterEach(() => vi.unstubAllGlobals());

it.each(['low', 'high'] as const)('replaces the generic box at Electric Saturation and grounds it on %s', (quality) => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const city = seventeenthAccess(auburnTransport(JSON.parse(read('context.json').toString())));
  const terrain = createDowntownTerrain(grid, city, [], { quality, batchLandmarks: false });
  try {
    terrain.group.updateMatrixWorld(true);
    const model = terrain.scenery.getObjectByName('Electric Saturation');
    expect(model).toBeDefined();
    const box = new Box3().setFromObject(model!);
    const corners = [
      [460.1, -3139.9],
      [473.1, -3139.6],
      [473.6, -3165.2],
      [460.6, -3165.5],
    ].map(([x, z]) => terrain.groundAt(x, z)!);
    // Footings reach below every corner; the level parapet clears the highest by the estimate.
    expect(box.min.y).toBeLessThan(Math.min(...corners));
    expect(box.max.y).toBeCloseTo(Math.max(...corners) + WALL_ABOVE_HIGH_GRADE, 1);
    // The mapped shaft at the south-east corner is part of the model.
    expect(box.max.z).toBeGreaterThan(-3137);
    // Three painted faces.
    let murals = 0;
    model!.traverse((o) => (murals += o.name === 'Electric Saturation mural' ? 1 : 0));
    expect(murals).toBe(3);
  } finally {
    terrain.dispose();
  }
});

it('removes the generic building it replaces and ignores other sites', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const city = JSON.parse(read('context.json').toString());
  const site = city.buildings.find((b: { id: string }) => b.id === ELECTRIC_SATURATION_ID);
  const other = city.buildings.find((b: { id: string }) => b.id !== ELECTRIC_SATURATION_ID);
  const made = createElectricSaturation(city.buildings, site, () => 0)!;
  expect(made.buildings).not.toContain(site);
  expect(made.buildings).toHaveLength(city.buildings.length - 1);
  expect(createElectricSaturation(city.buildings, other, () => 0)).toBeNull();
});

it('mounts each inferred vent in exactly one Midtown row', () => {
  const zs = JSON.parse(
    readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-rows.json', import.meta.url)).toString(),
  ) as Record<string, { minZ: number; maxZ: number }>;
  const rows = Object.fromEntries(Object.entries(zs).map(([id, z]) => [id, { minX: -1000, maxX: 1800, ...z }]));
  const mounted = Object.entries(rows).filter(([, bounds]) => midtownVents(bounds, () => 0) !== null).map(([id]) => id);
  expect(mounted.sort()).toEqual(['midtown-south', 'midtown-upper']);
  // The two island grates near Civic Center belong to the north band.
  const north = midtownVents({ minX: -1000, maxX: 1800, minZ: -1700, maxZ: -1300 }, () => 0);
  expect(north).not.toBeNull();
  const nb = new Box3().setFromObject(north!.group);
  expect(nb.max.y).toBeCloseTo(0.22, 5);
  expect(nb.min.z).toBeLessThan(-1534);
  const fan = new Box3().setFromObject(midtownVents(rows['midtown-upper'], () => 10)!.group);
  // Fan house: footings below grade, parapet 5 m above it, fan hoods 0.9 m above that.
  expect(fan.min.y).toBeCloseTo(9.6, 5);
  expect(fan.max.y).toBeCloseTo(15.9, 3);
  expect(fan.min.z).toBeLessThan(-3397);
  // 5th Street grate: draped 0.15 m proud of the paving, nothing taller.
  const grate = new Box3().setFromObject(midtownVents(rows['midtown-south'], (x) => x / 100)!.group);
  expect(grate.max.y).toBeCloseTo(505.3 / 100 + 0.15, 5);
  expect(grate.min.z).toBeGreaterThan(-2475);
});

it('replaces the generic box over the Peachtree Place shaft with a low grated box', () => {
  const city = JSON.parse(read('context.json').toString());
  const site = city.buildings.find((b: { id: string }) => b.id === PEACHTREE_PLACE_SHAFT_ID);
  expect(site).toBeDefined();
  const made = createPeachtreePlaceShaft(city.buildings, site, () => 20)!;
  expect(made.buildings).not.toContain(site);
  const box = new Box3().setFromObject(made.group);
  expect(box.max.y).toBeCloseTo(21.1, 5);
});
