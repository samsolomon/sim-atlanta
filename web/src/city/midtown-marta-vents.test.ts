import { readFileSync } from 'node:fs';
import { Box3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { seventeenthAccess } from './seventeenth-street';
import { auburnTransport } from './sweet-auburn-transport';
import { createElectricSaturation, ELECTRIC_SATURATION_ID, WALL_ABOVE_HIGH_GRADE } from './midtown-marta-vents';

const directory = new URL('../../../pipeline/prototypes/square-board/midtown-central/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, directory));
const grid = new GroundGrid(JSON.parse(read('ground.json').toString()), Uint8Array.from(read('ground.i16')).buffer);
afterEach(() => vi.unstubAllGlobals());

it.each(['low', 'high'] as const)('replaces the generic box at Electric Saturation and grounds it on %s', (quality) => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const city = seventeenthAccess(auburnTransport(JSON.parse(read('context.json').toString())));
  const terrain = createDowntownTerrain(grid, city, [], { quality });
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
